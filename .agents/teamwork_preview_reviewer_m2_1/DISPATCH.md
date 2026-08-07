# Dispatch Instructions for Reviewer M2_1

You are teamwork_preview_reviewer_m2_1. Working directory: D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_reviewer_m2_1.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.
Read Worker M2 handoff at D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_1\handoff.md.

Review M2 Storefront UI changes:
- `page.tsx`: SSR pre-fetching with `{ revalidate: 60 }`, `generateMetadata`, `notFound()`, props passing.
- `LandingClient.tsx`: Split into `LandingPixels.tsx`, `LandingHero.tsx`, `LandingOrderForm.tsx`, `types.ts`. Line count < 150. No `any` types. Client fallback when `initialLp` is omitted.
- `LandingHero.tsx`: Fake social proof removed with comment. Price `/100` documented.

Run verification:
- `pnpm --filter @ecommerce/storefront-ui build`

Provide your review verdict (APPROVE or REQUEST_CHANGES) with rationale in D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_reviewer_m2_1\handoff.md. Send a message to orchestrator when complete.
