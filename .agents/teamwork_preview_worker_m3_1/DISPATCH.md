# Dispatch Instructions for Worker M3 (Full Monorepo Quality & Verification)

You are teamwork_preview_worker_m3_1. Working directory: D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m3_1.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks (Requirement R7):
Execute and record all verification commands:
1. `pnpm --filter @ecommerce/storefront-ui build` (MUST exit 0)
2. `pnpm --filter @ecommerce/public-api lint` (MUST produce 0 errors)
3. `pnpm --filter @ecommerce/admin-api lint` (MUST produce 0 errors)
4. `pnpm --filter @ecommerce/public-api test` (MUST pass 100%)
5. `pnpm --filter @ecommerce/core-services test` (MUST pass 100%)
6. `pnpm --filter @ecommerce/admin-api test` (MUST pass 100%)

If any lint errors or test failures are found, fix them cleanly.
Document all execution results and output logs in `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m3_1\handoff.md`.
