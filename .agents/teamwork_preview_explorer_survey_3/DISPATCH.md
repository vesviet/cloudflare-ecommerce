# Dispatch Instructions for Explorer 3

You are explorer_survey_3. Your working directory is D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_3.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.

Task: Map Admin UI, social proof, price unit documentation, build/lint/test commands, and git constraints.
Investigate:
1. `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` & `LandingHero.tsx`:
   - Identify hardcoded fake social proof data (lines 291-297: 4.9, 1200 reviews, 583 824 sold) and how to remove it cleanly with inline comments explaining rationale.
   - Identify price division `/100` for `regular_price` and `price` (minor units VNĐ x 100) and how to add inline explanatory comments.
2. `apps/admin-ui/src/tabs/LandingPagesTab.tsx`:
   - Inspect current admin UI form for landing pages and verify how slug & LP creation/editing interact with admin-api.
3. Build, lint, and test setup:
   - Identify exact pnpm workspace scripts and configuration for:
     - `pnpm --filter @ecommerce/storefront-ui build`
     - `pnpm --filter @ecommerce/public-api lint`
     - `pnpm --filter @ecommerce/admin-api lint`
     - `pnpm --filter @ecommerce/public-api test`
     - `pnpm --filter @ecommerce/core-services test`
4. Git state:
   - Current status, branch, clean working tree state.

Write your detailed research findings and handoff report to `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_3\handoff.md`.
