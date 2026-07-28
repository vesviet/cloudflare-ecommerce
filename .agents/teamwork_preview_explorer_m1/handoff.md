# Handoff Report: Milestone 1 - Data Retention Cron Job (Slice 6)

## 1. Observation

### 1.1 `wrangler.toml` Triggers and Bindings
- **File**: `apps/public-api/wrangler.toml`
- **Lines 26-31**: D1 Database Binding configured:
  ```toml
  [[d1_databases]]
  binding = "DB"
  database_name = "ecommerce-db"
  database_id = "b41da4e0-7f8c-44db-8854-0499d5c2ced5"
  preview_database_id = "local" # Dùng SQLite local khi chạy wrangler dev
  migrations_dir = "../../packages/database/migrations"
  ```
- **Lines 90-91**: Cron triggers configured:
  ```toml
  [triggers]
  crons = ["*/5 * * * *", "0 * * * *", "0 0 * * *"] # Every 5 minutes (inventory), Hourly (abandoned), Daily (data tiering)
  ```

### 1.2 Worker Entry Point & `scheduled` Handler Structure
- **File**: `apps/public-api/src/index.ts`
- **Lines 251-409**: Scheduled export handler definition:
  ```typescript
  async scheduled(event: any, env: Bindings, _ctx: any): Promise<void> {
    console.log(`[Cron] Triggered cron=${event.cron} at ${new Date().toISOString()}`)
    const db = createDb(env.DB)

    if (event.cron === '*/5 * * * *') {
      // 5-minute job logic (lines 255-285)
    } else if (event.cron === '0 * * * *') {
      // Hourly job logic (lines 287-405)
    } else {
      console.warn(`[Cron] Unknown cron expression: ${event.cron}`)
    }
  }
  ```
- **Finding**: The `'0 0 * * *'` cron trigger is listed in `wrangler.toml`, but `src/index.ts` has no `else if (event.cron === '0 0 * * *')` branch. When triggered, it falls into the `else` branch logging `[Cron] Unknown cron expression: 0 0 * * *`.

### 1.3 Schema and Migration Column Inspection
- **File**: `packages/database/src/schema.ts` & Migration `0000_massive_silver_fox.sql`
- **Table `carts`**:
  - `schema.ts` (lines 177-189):
    ```typescript
    export const carts = sqliteTable('carts', {
      id: text('id').primaryKey(),
      customer_id: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
      guest_session_id: text('guest_session_id'),
      status: text('status').default('active'), // active, converted, abandoned
      created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
      updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    });
    ```
  - Column `created_at`: type `text`, default SQLite `CURRENT_TIMESTAMP` (UTC string format `'YYYY-MM-DD HH:MM:SS'`).
  - Column `status`: type `text` (values: `'active'`, `'converted'`, `'abandoned'`).
- **Table `idempotency_keys`**:
  - `schema.ts` (lines 314-324) & Migration `0000_massive_silver_fox.sql` (lines 126-130) & `0015_checkout_and_webhook_idempotency.sql` (lines 1-10):
    ```typescript
    export const idempotencyKeys = sqliteTable('idempotency_keys', {
      id: text('id').primaryKey(),
      event_type: text('event_type').notNull(),
      status: text('status').notNull().default('pending'),
      lease_token: text('lease_token'),
      lease_expires_at: integer('lease_expires_at'),
      attempts: integer('attempts').notNull().default(0),
      last_error: text('last_error'),
      expires_at: integer('expires_at'),
      processed_at: text('processed_at'),
    });
    ```
  - **CRITICAL**: Table `idempotency_keys` does **NOT** contain a column named `created_at`. Creation/processing timestamp is stored in column `processed_at` (`text` DEFAULT `CURRENT_TIMESTAMP`). Expiration (if set) is stored in column `expires_at` (`integer` Unix timestamp).

### 1.4 Test Suite Status
- **File**: `apps/public-api/package.json`
- Test command: `pnpm --filter public-api test` (runs Vitest).
- Executed `pnpm --filter public-api test`: 7 test files passed (40/40 tests).
- Currently, **0** test files test `src/index.ts` or the `scheduled` cron handler directly.

---

## 2. Logic Chain

1. **Trigger Configuration**:
   - Observation 1.1 shows `wrangler.toml` already configures `crons = ["*/5 * * * *", "0 * * * *", "0 0 * * *"]`.
   - Observation 1.2 demonstrates `apps/public-api/src/index.ts` lacks the `else if (event.cron === '0 0 * * *')` branch in `scheduled()`.
   - *Inference*: Adding `else if (event.cron === '0 0 * * *')` inside `scheduled()` in `src/index.ts` will connect Cloudflare's daily cron trigger directly to the retention cleanup logic.

2. **Schema & Column Mapping for Data Retention Queries**:
   - Observation 1.3 shows `carts` has `created_at` (`text`) and `status` (`text`).
   - Abandoned carts older than 7 days can be deleted via `status = 'abandoned'` and `created_at < datetime('now', '-7 days')`.
   - Observation 1.3 shows `idempotency_keys` has NO `created_at` column, but HAS `processed_at` (`text`) and `expires_at` (`integer`).
   - *Inference*: Attempting to execute `DELETE FROM idempotency_keys WHERE created_at < ...` would crash with `SQLiteError: no such column: created_at`. The query must instead target `processed_at` (and/or `expires_at`).

3. **Exact SQL Query Formulation**:
   - For `carts`:
     ```sql
     DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days');
     ```
   - For `idempotency_keys`:
     ```sql
     DELETE FROM idempotency_keys WHERE processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'));
     ```
   - *Rationale*: SQLite's `datetime('now', '-7 days')` produces UTC format strings matching default SQLite `CURRENT_TIMESTAMP` insertions. Using native SQLite SQL helpers via Drizzle `sql` tag ensures compatibility without JS date format discrepancies.

4. **Testing Strategy**:
   - Observation 1.4 shows 40/40 vitest unit tests passing across 7 route/middleware test files, but no unit test for `scheduled()`.
   - *Inference*: Adding `apps/public-api/src/__tests__/scheduled.test.ts` to test `worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {})` guarantees coverage and prevents regressions when `pnpm --filter public-api test` is run.

---

## 3. Caveats

1. **Foreign Key Cascade Deletion on `cart_items`**:
   - `cart_items` has foreign key `cart_id` referencing `carts.id` with `ON DELETE CASCADE` (`0000_massive_silver_fox.sql` line 27). Deleting abandoned `carts` automatically cleans up associated `cart_items`.
2. **Date Format Compatibility**:
   - SQLite `CURRENT_TIMESTAMP` defaults to `'YYYY-MM-DD HH:MM:SS'`. JS `toISOString()` produces `'YYYY-MM-DDTHH:MM:SS.sssZ'`. Using `datetime('now', '-7 days')` directly in SQLite SQL queries is recommended over string comparison with `toISOString()` to avoid space vs 'T' ASCII sorting differences.
3. **Batch Size / Resource Limits**:
   - Daily cron runs once every 24 hours. For high-volume databases, bounding deletes with `LIMIT` or running batch iterations (similar to the hourly abandoned orders cron) prevents CPU timeouts (30-second Cloudflare Worker limit).

---

## 4. Conclusion

To complete Milestone 1: Data Retention Cron Job (Slice 6), the Implementer should:

1. **Update `apps/public-api/src/index.ts`**:
   - Add the `else if (event.cron === '0 0 * * *')` branch inside `scheduled()`:
     ```typescript
     } else if (event.cron === '0 0 * * *') {
       // --- Daily job: Data Retention Cleanup (Slice 6) ---
       console.log('[Cron] Daily: starting data retention cleanup')
       
       // 1. Delete idempotency keys older than 7 days (using processed_at / expires_at)
       const idemResult = await db.run(
         sql`DELETE FROM idempotency_keys WHERE processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`
       ).catch((err: any) => console.error('[Cron] Error cleaning up idempotency_keys:', err.message))

       // 2. Delete abandoned carts older than 7 days (using status and created_at)
       const cartResult = await db.run(
         sql`DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days')`
       ).catch((err: any) => console.error('[Cron] Error cleaning up abandoned carts:', err.message))

       console.log('[Cron] Daily retention cleanup completed')
     }
     ```

2. **Add Unit Tests in `apps/public-api/src/__tests__/scheduled.test.ts`**:
   - Import `worker` from `../index`.
   - Call `worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {})` and verify DB `run` or `delete` is called with the retention SQL queries.

---

## 5. Verification Method

1. **Run Unit Tests**:
   ```bash
   pnpm --filter public-api test
   ```
   Expect all existing 40 tests + new `scheduled.test.ts` tests to pass.

2. **Source Code Inspection**:
   - Inspect `apps/public-api/src/index.ts` to confirm `event.cron === '0 0 * * *'` is handled.
   - Inspect `apps/public-api/wrangler.toml` line 91 to confirm `"0 0 * * *"` remains present in `crons`.

3. **Invalidation Conditions**:
   - Using `created_at` in the query for `idempotency_keys` (will throw `no such column: created_at`).
   - Removing `"0 0 * * *"` from `wrangler.toml`.
