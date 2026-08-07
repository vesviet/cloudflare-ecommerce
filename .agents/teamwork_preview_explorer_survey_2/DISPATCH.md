# Dispatch Instructions for Explorer 2

You are explorer_survey_2. Your working directory is D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_2.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.

Task: Map Storefront UI requirements for SSR, metadata, and component refactoring.
Investigate:
1. `apps/storefront-ui/src/app/landing/[slug]/page.tsx`:
   - How `page.tsx` currently works and how to convert it to pre-fetch LP data server-side using `fetch()` with `{ next: { revalidate: 60 } }`.
   - Base API URL: `process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'`.
   - Handling `notFound()` from `next/navigation` when LP data is missing/unsuccessful.
   - Exporting `generateMetadata({ params })` for `title` (seo_title) and `description` (seo_description).
   - Parsing `combo_rules_json` and passing props `initialLp` and `comboRules` to `LandingClient`.
2. `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`:
   - Current 536-line monolithic structure.
   - How to split into:
     - `LandingPixels.tsx` (Facebook & TikTok pixel scripts)
     - `LandingHero.tsx` (Gallery, title, pricing block, features, countdown)
     - `LandingOrderForm.tsx` (Form, combo selector, variant selector, fields, turnstile, submit, success panel)
   - Ensuring `LandingClient.tsx` remains a thin orchestrator (< 150 lines) supporting client-side fetch fallback when `initialLp` is not provided.
   - Proper TypeScript typing for all extracted component props (no `any`).

Write your detailed research findings and handoff report to `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_2\handoff.md`.
