# Dispatch Instructions for Explorer 1

You are explorer_survey_1. Your working directory is D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_1.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.

Task: Map backend APIs & database requirements for the landing page refactor.
Investigate:
1. `apps/public-api/src/routes/landing-pages.ts`:
   - Current query sequence for GET /:slug (1. landingPages, 2. products by product_id, 3. products by parent_id, 4. priceListItems).
   - How to parallelize queries 2, 3, and 4 with Promise.all after query 1.
   - Any edge cases (missing product, missing price list items, missing variants).
2. `apps/admin-api/src/routes/landing-pages.ts`:
   - POST and PUT routes for landing pages.
   - How slug uniqueness should be checked before INSERT (POST) and before UPDATE (PUT where id != currentId).
   - Expected 409 status code and error payload format: `{ success: false, error: 'A landing page with this slug already exists' }`.
3. `packages/database/src/schema.ts`:
   - `landingPages` schema definition and constraints.
4. Existing tests:
   - Run or inspect tests in `@ecommerce/public-api` and `@ecommerce/core-services`.

Write your detailed research findings and handoff report to `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_1\handoff.md`.
