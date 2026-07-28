## 2026-07-28T06:45:38Z

<USER_REQUEST>
You are Worker for Milestone 1: Data Retention Cron Job (Slice 6).

Working directory: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m1
Project root: /home/user/personalized/cloudflare-ecommerce
Explorer report: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_explorer_m1/handoff.md

Task:
Implement Requirement 1: Data Retention Cron Job (Slice 6) in `apps/public-api` based on the Explorer's handoff report.

Implementation requirements:
1. Modify `apps/public-api/src/index.ts`:
   - Add the `else if (event.cron === '0 0 * * *')` handler branch to `scheduled(event, env, _ctx)`.
   - Perform deletion of `idempotency_keys` where `processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`.
   - Perform deletion of `carts` where `status = 'abandoned' AND created_at < datetime('now', '-7 days')`.
2. Add comprehensive unit tests in `apps/public-api/src/__tests__/scheduled.test.ts` to verify the daily retention cron handler.
3. Verify that `pnpm --filter public-api test` passes 100%.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document all changes made, terminal commands executed, build and test output results in `/home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m1/handoff.md`.
Update progress.md in your directory as you work.
Report back via send_message when done.
</USER_REQUEST>
