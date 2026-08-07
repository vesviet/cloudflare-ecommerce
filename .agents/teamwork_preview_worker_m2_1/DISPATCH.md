# Dispatch Instructions for Worker M2 (Storefront UI Refactor)

You are teamwork_preview_worker_m2_1. Working directory: D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_1.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.
Read Explorer 2 findings at D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_2\handoff.md.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks:
1. `apps/storefront-ui/src/app/landing/[slug]/page.tsx` (Requirement R1):
   - Convert to async server component fetching LP data server-side via `fetch()` with `{ next: { revalidate: 60 } }`.
   - Base URL: `process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'`.
   - Call `notFound()` from `next/navigation` when `!data || data.success === false`.
   - Parse `combo_rules_json` safely and pass `initialLp`, `comboRules`, `initialSlug`, and `apiUrl` props to `LandingClient`.
   - Export `generateMetadata({ params })` returning `{ title: data.data.seo_title, description: data.data.seo_description }`.

2. Split `LandingClient.tsx` into sub-components (Requirement R2):
   - Create `types.ts` defining clean TypeScript interfaces for `LandingPageData`, `ComboRule`, `LandingFormData`, `SuccessData`, and props for all sub-components. NO `any` types.
   - Extract `LandingPixels.tsx`: Props `{ facebookPixelId?: string; tiktokPixelId?: string }`.
   - Extract `LandingHero.tsx`: Props with `lp` sub-fields (title, pricing, images, features, countdown). Include price `/100` comments (R6). Remove hardcoded fake social proof block (`4.9`, `1200`, `583 824`) with rationale comment (R3).
   - Extract `LandingOrderForm.tsx`: Props for form state, combos, variants, inputs, Turnstile widget, submit handler, success panel.
   - Refactor `LandingClient.tsx` to < 150 lines as a thin orchestrator managing state and rendering sub-components. Support client-side fetch fallback when `initialLp` is not provided.

3. Run verification:
   - `pnpm --filter @ecommerce/storefront-ui build` (MUST exit 0)

Document all changes and build results in `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_1\handoff.md`.
