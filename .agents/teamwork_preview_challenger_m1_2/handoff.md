# Handoff Report — Milestone 1: Data Retention Cron Job (Slice 6) Empirical Stress Test

**Author**: Challenger 2 (`teamwork_preview_challenger_m1_2`)  
**Date**: 2026-07-28T06:48:00Z  
**Project Root**: `/home/user/personalized/cloudflare-ecommerce`  
**Target Files**: `apps/public-api/src/index.ts`, `apps/public-api/src/__tests__/scheduled.test.ts`

---

## Challenge Summary

**Overall risk assessment**: **MEDIUM-HIGH**

While the daily data retention cron job (`0 0 * * *`) successfully implements basic error handling (`.catch()`) and cron event discrimination, empirical testing revealed critical edge-case flaws in SQL date format evaluation, TTL precedence logic, and performance scalability.

---

## Challenges & Empirical Findings

### 1. [HIGH] ISO 8601 String Comparison Anomaly (`'T'` vs `' '`) in SQLite Date Comparison

- **Assumption challenged**: SQLite string comparison `processed_at < datetime('now', '-7 days')` correctly identifies records older than 7 days when timestamps are stored in standard JavaScript ISO 8601 format (`new Date().toISOString()`).
- **Attack / Edge Scenario**:
  - In JavaScript, `new Date().toISOString()` formats timestamps with `'T'` as the date-time separator (e.g. `'2026-07-21T05:00:00.000Z'`).
  - SQLite's `datetime('now', '-7 days')` outputs a standard SQLite date-time string with a space separator (e.g. `'2026-07-21 13:00:00'`).
  - Direct string comparison in SQLite (`processed_at < datetime('now', '-7 days')`) compares position 10: character `'T'` (ASCII 84) vs space `' '` (ASCII 32).
  - Because `'T' > ' '`, the expression `'2026-07-21T05:00:00.000Z' < '2026-07-21 13:00:00'` evaluates to **0 (FALSE)**.
- **Empirical Test & Result**:
  - Executed custom Node 22 test script (`.agents/teamwork_preview_challenger_m1_2/test_boundary.js`):
    - Cutoff timestamp: `'2026-07-21 13:00:00'`
    - Test ISO timestamp (7 hours older than cutoff): `'2026-07-21T05:00:00.000Z'`
    - Direct SQL result: `('2026-07-21T05:00:00.000Z' < cutoff)` evaluated to **0 (FAIL - NOT DELETED)**.
    - Normalized SQL result: `(datetime('2026-07-21T05:00:00.000Z') < cutoff)` evaluated to **1 (PASS - DELETED)**.
- **Blast Radius**: Records created or processed on the 7th day in ISO format are skipped by the retention deletion query until 8 full days elapse.
- **Mitigation**: Wrap string column references in `datetime()`, e.g., `datetime(processed_at) < datetime('now', '-7 days')` and `datetime(created_at) < datetime('now', '-7 days')`.

---

### 2. [MEDIUM] Retention Query Overrides Explicit Future `expires_at` TTL

- **Assumption challenged**: Keys with an explicit future expiration date (`expires_at`) are protected from early deletion.
- **Attack / Edge Scenario**:
  - Query: `DELETE FROM idempotency_keys WHERE processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`
  - If an idempotency key was processed 8 days ago but has an explicit TTL set for 30 days in the future (e.g., for compliance or financial auditing), the first operand of the `OR` clause evaluates to `TRUE`.
- **Empirical Test & Result**:
  - Executed `.agents/teamwork_preview_challenger_m1_2/test_sql_retention.js`:
    - Key `k7_processed_old_future_ttl`: `processed_at` = 8 days ago, `expires_at` = +20 days in future.
    - Result: `k7_processed_old_future_ttl` was deleted prematurely on day 7.
- **Blast Radius**: Keys configured with explicit custom expiration dates are prematurely purged.
- **Mitigation**: Update condition to: `(expires_at IS NULL AND datetime(processed_at) < datetime('now', '-7 days')) OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`.

---

### 3. [MEDIUM] Unbounded `DELETE` Queries Risk Worker CPU Limit Timeout & D1 Lock Contention

- **Assumption challenged**: Executing single un-batched `DELETE FROM` statements is safe for production background cron jobs.
- **Attack / Edge Scenario**:
  - Lines 411 and 416 in `apps/public-api/src/index.ts`:
    ```ts
    await db.run(sql`DELETE FROM idempotency_keys WHERE ...`)
    await db.run(sql`DELETE FROM carts WHERE ...`)
    ```
  - Unlike the 5-minute cron (`LIMIT 50`) and hourly cron (`LIMIT 100` with 10 batch iterations), the daily retention job performs un-batched bulk deletions.
- **Blast Radius**: If a production database accumulates 100,000+ expired rows, a single `DELETE` query can lock the D1 database and trigger Cloudflare Worker CPU execution limits (30s timeout).
- **Mitigation**: Apply batching with `LIMIT 100` loop iteration, mirroring the hourly cron pattern.

---

### 4. [LOW] Excluded Table `checkout_idempotency`

- **Assumption challenged**: All expired idempotency records are cleaned up by the daily retention job.
- **Attack / Edge Scenario**:
  - `checkout_idempotency` (schema in `packages/database/src/schema.ts` lines 326-338) stores checkout idempotency keys with `expires_at: integer`.
  - The daily cron job cleans up `idempotency_keys` but omits `checkout_idempotency`.
- **Blast Radius**: `checkout_idempotency` table accumulates stale rows indefinitely over time.
- **Mitigation**: Add `DELETE FROM checkout_idempotency WHERE expires_at < unixepoch('now')` to the daily retention job.

---

## Stress Test Results Matrix

| Scenario | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- |
| **P0: Daily Cron Execution (`0 0 * * *`)** | Triggers deletion queries for `idempotency_keys` & `carts` | Executed 2 `db.run()` queries | **PASS** |
| **P1: DB Exception Handling** | Logs error on rejection; does not throw | Resilient to D1 query rejection via `.catch()` | **PASS** |
| **P2: Unknown Cron Isolation** | Ignores invalid cron expressions | Ignores expression & logs warning | **PASS** |
| **P3: Cron Trigger Separation** | `0 0 * * *` does not trigger 5-min/hourly order logic | Only runs daily retention queries | **PASS** |
| **P4: Partial Failure Isolation** | If query 1 fails, query 2 still executes | Second query (`carts`) executes after query 1 rejects | **PASS** |
| **P5: ISO Date Comparison (`'T'` vs `' '`)** | Deletes records older than 7 days in ISO format | **FAILS on 7th day ISO timestamps** due to ASCII `'T'` > `' '` | **FAIL** |
| **P6: Explicit `expires_at` TTL Protection** | Respects future `expires_at` TTL | **Deletes key prematurely** due to un-guarded `OR` clause | **FAIL** |
| **P7: Performance & CPU Bounding** | Bounded deletion per execution | Unbounded `DELETE` statement risk under heavy load | **FAIL** |

---

## 1. Observation

- `apps/public-api/src/index.ts` lines 406-421:
  ```ts
    } else if (event.cron === '0 0 * * *') {
      // --- Daily job: Data Retention Cleanup (Slice 6) ---
      console.log('[Cron] Daily: starting data retention cleanup')

      // 1. Delete idempotency keys processed > 7 days ago or expired
      await db.run(
        sql`DELETE FROM idempotency_keys WHERE processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`
      ).catch((err: any) => console.error('[Cron] Error cleaning up idempotency_keys:', err.message))

      // 2. Delete abandoned carts created > 7 days ago
      await db.run(
        sql`DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days')`
      ).catch((err: any) => console.error('[Cron] Error cleaning up abandoned carts:', err.message))

      console.log('[Cron] Daily retention cleanup completed')

    }
  ```
- `apps/public-api/src/__tests__/scheduled.test.ts`:
  - Contains test suite for `Daily Data Retention Cron Job (Slice 6)` verifying `0 0 * * *` trigger, error handling, and unknown cron isolation.

---

## 2. Logic Chain

1. **Date Format Vulnerability**: In `index.ts`, `processed_at < datetime('now', '-7 days')` compares raw string representation. `new Date().toISOString()` outputs `'YYYY-MM-DDTHH:MM:SS.sssZ'`. SQLite `datetime('now', '-7 days')` outputs `'YYYY-MM-DD HH:MM:SS'`. In ASCII, `'T'` (84) is greater than `' '` (32). For timestamps on the boundary date (7-8 days old), `'2026-07-21T05:00:00.000Z' < '2026-07-21 13:00:00'` evaluates to `FALSE`, skipping deletion.
2. **TTL Overwrite**: `processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))` evaluates the first clause independently. Any key older than 7 days with a future `expires_at` timestamp is deleted prematurely.
3. **Unbounded Execution**: Single `DELETE` statements risk timeout under large table sizes, unlike the 5-min and 1-hour cron jobs which enforce batch limits.

---

## 3. Caveats

- D1 SQLite in Cloudflare Workers production runtime uses SQLite engine; behavior was confirmed via Node 22 native `node:sqlite` engine.
- Production data volume measurements were not performed as database size depends on deployment traffic.

---

## 4. Conclusion

The Milestone 1 Data Retention Cron Job (`0 0 * * *`) successfully completes basic execution and error handling requirements. However, **remediation is required** before production launch to:
1. Normalize date comparisons using `datetime(processed_at)` and `datetime(created_at)`.
2. Guard `processed_at` retention logic with `expires_at IS NULL` to prevent premature deletion of unexpired keys.
3. Add batch limits (`LIMIT 100` iteration) to prevent Workers CPU timeouts.
4. Include `checkout_idempotency` table in daily cleanup.

---

## 5. Verification Method

To independently verify these empirical findings:

1. **Run Monorepo & Public API Vitest Suite**:
   ```bash
   pnpm --filter public-api test
   ```
2. **Execute Empirical Date Comparison Test Script**:
   ```bash
   node .agents/teamwork_preview_challenger_m1_2/test_boundary.js
   ```
   *Expected Output*: `Raw ISO String ('2026-07-21T05:00:00.000Z' < cutoff): FAIL (NOT Deleted!)`
3. **Execute Retention & TTL Precedence Test Script**:
   ```bash
   node .agents/teamwork_preview_challenger_m1_2/test_sql_retention.js
   ```
