# Project: cloudflare-ecommerce Landing Page Refactor

## Architecture
- Monorepo: pnpm workspace
- `apps/public-api`: Cloudflare Workers (Hono + D1 database). GET /:slug, GET /:slug/stock, POST /leads
- `apps/admin-api`: Cloudflare Workers (Hono + D1 database). GET /landing-pages, POST /landing-pages, PUT /landing-pages/:id, DELETE /landing-pages/:id
- `apps/storefront-ui`: Next.js 14 App Router. Server Page `landing/[slug]/page.tsx` + Client Component `LandingClient.tsx`
- `apps/admin-ui`: React SPA for Admin backoffice managing landing pages

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SSR Data Fetching & metadata | page.tsx fetches LP data server-side (ISR revalidate 60), generateMetadata (title, description), notFound() on 404, fallback client fetch | M2 | ORIGINAL_REQUEST § R1 |
| 2 | Component Splitting | Extract LandingPixels.tsx, LandingHero.tsx, LandingOrderForm.tsx; keep LandingClient.tsx < 150 lines without type `any` | M2 | ORIGINAL_REQUEST § R2 |
| 3 | Social Proof Removal | Remove fake social proof metrics (4.9, 1200, 583 824) with inline explanation comment | M2 | ORIGINAL_REQUEST § R3 |
| 4 | Slug Uniqueness 409 | Admin API POST/PUT checks for duplicate slug prior to write, returning 409 status code | M1 | ORIGINAL_REQUEST § R4 |
| 5 | Query Parallelization | Public API GET /:slug parallelizes product, variants, and price list DB queries via Promise.all | M1 | ORIGINAL_REQUEST § R5 |
| 6 | Price Unit Documentation | Document /100 minor unit division for regular_price and price in LandingHero.tsx | M2 | ORIGINAL_REQUEST § R6 |
| 7 | Verification & Quality | Ensure storefront-ui build, public-api lint, admin-api lint, and tests pass | M3 | ORIGINAL_REQUEST § R7 |
| 8 | Git Commit & Push | Commit with message "refactor(landing-pages): SSR, component split, slug validation, query parallelization" and push | M4 | ORIGINAL_REQUEST § Task 8 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1_Backend_APIs | Refactor public-api GET /:slug (R5 query parallelization) & admin-api POST/PUT (R4 slug uniqueness 409 check) | none | DONE |
| 2 | M2_Storefront_UI | Refactor storefront-ui page.tsx (R1 SSR + metadata) & split LandingClient.tsx into sub-components (R2, R3, R6) | M1 | DONE |
| 3 | M3_Verification_Quality | Run build, lint, and tests across all packages (R7) | M1, M2 | DONE |
| 4 | M4_Git_Commit_Push | Git commit and push changes | M3 | IN_PROGRESS |

## Interface Contracts
### Admin API ↔ Admin UI / Clients
- POST `/landing-pages` / PUT `/landing-pages/:id`: Duplicate slug returns `{ success: false, error: 'A landing page with this slug already exists' }` HTTP 409.

### Public API ↔ Storefront UI (page.tsx & LandingClient.tsx)
- GET `/landing-pages/:slug`: Returns `{ success: true, data: LandingPageData }` or `{ success: false, error: string }` (404).

### Storefront UI page.tsx ↔ LandingClient.tsx
- Props: `{ initialLp?: LandingPageData; comboRules?: ComboRule[]; initialSlug: string; apiUrl: string }`.

## Code Layout
- `apps/public-api/src/routes/landing-pages.ts` — Public API routes
- `apps/admin-api/src/routes/landing-pages.ts` — Admin API routes
- `apps/storefront-ui/src/app/landing/[slug]/types.ts` — Shared TypeScript interfaces
- `apps/storefront-ui/src/app/landing/[slug]/page.tsx` — Next.js Server Page & generateMetadata
- `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` — Thin client orchestrator (< 150 lines)
- `apps/storefront-ui/src/app/landing/[slug]/LandingPixels.tsx` — Pixel script injection
- `apps/storefront-ui/src/app/landing/[slug]/LandingHero.tsx` — Gallery, title, pricing, features, countdown
- `apps/storefront-ui/src/app/landing/[slug]/LandingOrderForm.tsx` — Order form, combo, variants, submit, success panel
