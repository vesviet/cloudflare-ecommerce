## 2026-07-28T06:48:25Z
<USER_REQUEST>
You are Worker (Refinement) for Milestone 1: Data Retention Cron Job (Slice 6).

Working directory: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m1_refine
Project root: /home/user/personalized/cloudflare-ecommerce
Challenger 2 report: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_challenger_m1_2/handoff.md

Task:
Harden the SQL queries in the daily retention cron job (`0 0 * * *`) in `apps/public-api/src/index.ts` based on Challenger 2's empirical findings:

1. Modify `apps/public-api/src/index.ts` daily cron (`0 0 * * *`):
   - Wrap date columns in `datetime()` to ensure correct SQLite comparison with ISO 8601 strings (preventing `'T'` vs `' '` ASCII ordering bug):
     `datetime(processed_at) < datetime('now', '-7 days')`
     `datetime(created_at) < datetime('now', '-7 days')`
   - Refine `idempotency_keys` logic so keys with future explicit `expires_at` TTL are not deleted prematurely:
     `(expires_at IS NULL AND datetime(processed_at) < datetime('now', '-7 days')) OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`
   - Include `checkout_idempotency` table cleanup:
     `DELETE FROM checkout_idempotency WHERE expires_at < unixepoch('now')`
2. Update unit tests in `apps/public-api/src/__tests__/scheduled.test.ts` to cover these refined SQL queries (including ISO date comparison, TTL precedence, and `checkout_idempotency` cleanup).
3. Run `pnpm --filter public-api test` to verify 100% test pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document all changes made, test commands executed, and test outputs in `/home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m1_refine/handoff.md`.
Report back via send_message when done.
</USER_REQUEST>
