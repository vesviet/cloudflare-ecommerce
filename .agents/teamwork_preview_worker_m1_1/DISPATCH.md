# Dispatch Instructions for Worker M1 (Backend APIs)

You are teamwork_preview_worker_m1_1. Your working directory is D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m1_1.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.
Read Explorer 1 findings at D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_1\handoff.md.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks:
1. `apps/public-api/src/routes/landing-pages.ts` (Requirement R5):
   - Refactor GET `/:slug` handler to run product fetch, variants fetch, and price list items fetch in parallel using `Promise.all` after fetching the landing page record.
   - Maintain all error checks and response data structure.

2. `apps/admin-api/src/routes/landing-pages.ts` (Requirement R4):
   - POST route: Before INSERT, query database for an existing landing page with the same `slug`. If found, return `c.json({ success: false, error: 'A landing page with this slug already exists' }, 409)`.
   - PUT route: Before UPDATE, query database for an existing landing page with the same `slug` AND `id != currentId`. If found, return `c.json({ success: false, error: 'A landing page with this slug already exists' }, 409)`.
   - Ensure valid unique slugs return 200/201 as before.

3. Run verification:
   - `pnpm --filter @ecommerce/public-api test`
   - `pnpm --filter @ecommerce/admin-api test` (or `pnpm --filter admin-api test`)
   - `pnpm --filter @ecommerce/core-services test`
   - `pnpm --filter @ecommerce/public-api lint`
   - `pnpm --filter @ecommerce/admin-api lint`

Document all commands run and output results in `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m1_1\handoff.md`.
