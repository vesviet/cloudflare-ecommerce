## 2026-07-28T07:12:45Z
<USER_REQUEST>
You are Worker Refine for Milestone 3 (API Contracts Workspace - Slice 8).
Your working directory is `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_refine`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Fix the 3 type-checking issues identified by Challenger 2:
1. In `apps/storefront-ui/src/lib/api-client.ts`, fix the relative import path from `../../../apps/public-api/src/index` to `../../public-api/src/index` (or proper path to `apps/public-api/src/index`).
2. In `apps/admin-ui/src/lib/api-client.ts`, fix the relative import path from `../../../apps/admin-api/src/index` to `../../admin-api/src/index` (or proper path to `apps/admin-api/src/index`).
3. In `apps/public-api/src/__tests__/scheduled.test.ts`, ensure `mockEnv` passed to `worker.scheduled(...)` is properly typed/cast (`mockEnv as unknown as Bindings` or `mockEnv as any`) so TypeScript compilation succeeds without TS2345 errors.

Verification:
- Run typecheck / build commands across `packages/contract`, `apps/public-api`, `apps/admin-api`, `apps/storefront-ui`, and `apps/admin-ui`.
- Run all test suites across the monorepo (`pnpm --filter contract test`, `pnpm --filter public-api test`, `pnpm --filter admin-api test`).
- Confirm 0 type errors, 0 build failures, and 100% passing tests.
- Document changes in `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_refine/changes.md` and handoff report in `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_refine/handoff.md`.
- Send message to parent when done.
</USER_REQUEST>
