# Original User Request

## 2026-08-07T13:57:27Z

Refactor the landing page system of the `cloudflare-ecommerce` monorepo — a production Cloudflare Workers + Next.js e-commerce platform. The goal is to fix all known bugs, structural issues, and code quality problems in the landing page pipeline (backend APIs, storefront UI, admin UI), producing clean TypeScript code that passes build and lint checks.

Working directory: D:\myproject\cloudflare-ecommerce

Integrity mode: development

---

## Context

The landing page system spans 4 apps/packages:
- `apps/public-api/src/routes/landing-pages.ts` — Public API (GET slug, GET slug/stock, POST leads)
- `apps/admin-api/src/routes/landing-pages.ts` — Admin CRUD API (create/update/delete LP)
- `apps/storefront-ui/src/app/landing/[slug]/page.tsx` — Next.js server page (thin wrapper, no SSR fetch)
- `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` — 536-line monolithic client component
- `apps/admin-ui/src/tabs/LandingPagesTab.tsx` — Admin UI form (412 lines)

---

## Known Issues Found During Research

### Issue 1 — No SSR: page.tsx does NOT pre-fetch data server-side
`page.tsx` is an async server component but passes NO data to `LandingClient`. It only passes `initialSlug` and `apiUrl`. `LandingClient` then fetches everything client-side via `useEffect`. This means:
- The page renders a loading spinner on every first load (bad UX, bad SEO)
- Google cannot crawl the product title, description, or price
- The page is missing `generateMetadata` for SEO title/description

### Issue 2 — LandingClient.tsx is a 536-line monolith
Everything is in one giant component: pixel injection, hero section, image gallery, pricing block, features list, countdown timer, combo selector, order form, success panel. This makes it impossible to test or maintain individual pieces.

### Issue 3 — Hardcoded fake social proof data
Lines 291-297 of LandingClient.tsx contain hardcoded fake data that is identical for every landing page:
- Rating: `4.9 ★★★★★`
- Reviews: `1200 Đánh giá`
- Sold: `583 824 Đã bán`

These are never configurable from the admin. They should either be driven by the DB or removed. Showing the same fake numbers on every LP is a trust/legal risk.

### Issue 4 — admin-api landing-pages.ts: no slug uniqueness validation
The POST and PUT routes in `apps/admin-api/src/routes/landing-pages.ts` do not check for slug uniqueness before inserting. The D1 database has a UNIQUE constraint on `slug`, so duplicates produce an unhandled 500 instead of a friendly 409 error.

### Issue 5 — price unit ambiguity in LandingClient.tsx
`lp.product.regular_price` is divided by 100 (line 304) and `lp.product.price` is divided by 100 (line 305), but there is NO comment explaining why. These fields come from `price_list_items.price` which stores values in minor units. The field named `price` (from the `products` table) is different from `regular_price` (computed from `price_list_items`). The API conflates these two different sources in the response payload with no documentation.

### Issue 6 — public-api GET /:slug has sequential queries that can be parallelized
The public-api GET `/:slug` handler runs these DB queries sequentially:
1. `landingPages` by slug
2. `products` by product_id
3. `products` by parent_id (variants)
4. `priceListItems` by product_id

Queries 2, 3, and 4 can all be parallelized with `Promise.all` after query 1.

### Issue 7 — LandingClient useEffect dependency array
Line 38: `}, [slug, lp, apiUrl]);` — `lp` in the dependency array means every time `setLp` is called, the effect could re-run. The lint rule `react-hooks/exhaustive-deps` may warn about this pattern.

---

## Requirements

### R1. Add SSR data fetching to page.tsx + generateMetadata
`apps/storefront-ui/src/app/landing/[slug]/page.tsx` must:
- Fetch the landing page data server-side using `fetch()` with `{ next: { revalidate: 60 } }` (ISR, 60-second cache)
- The fetch URL should use `process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'` as the base
- Parse `combo_rules_json` from the fetched data and pass as `comboRules` prop to `LandingClient`
- Pass the fetched `lp` data as `lp` prop to `LandingClient`
- Export a `generateMetadata` function that returns the `seo_title` as `title` and `seo_description` as `description`
- Handle 404 gracefully: when the LP is not found (data.success === false or 404 status), call `notFound()` from `next/navigation`
- `LandingClient` should still support client-side fetch as a fallback when `initialLp` is not provided

### R2. Split LandingClient.tsx into focused sub-components
Extract the following sections from `LandingClient.tsx` into separate files under `apps/storefront-ui/src/app/landing/[slug]/`:
- `LandingPixels.tsx` — Facebook + TikTok pixel `<Script>` injection. Props: `{ facebookPixelId?: string; tiktokPixelId?: string }`
- `LandingHero.tsx` — Image gallery (with prev/next buttons + thumbnails) + title + social proof + pricing block + features list + countdown timer. Props: typed interface with `lp` sub-fields needed
- `LandingOrderForm.tsx` — The entire `<form>` including combo selector, variant selector, form fields (name, phone, address, note), Cloudflare Turnstile widget, error message, submit button, and the success confirmation panel. Also handles `handleSubmit` logic.

`LandingClient.tsx` becomes a thin orchestrator that:
- Manages top-level state: `lp`, `loading`, `error`, `activeImageIndex`, `formData`, `isSubmitting`, `successData`, `errorMsg`
- Imports and renders `LandingPixels`, `LandingHero`, `LandingOrderForm`
- Must be under 150 lines after extraction

All component prop interfaces must use proper TypeScript types. Avoid `any` for top-level component props.

### R3. Remove hardcoded fake social proof data
Remove the hardcoded fake social proof block (rating 4.9, 1200 reviews, 583 824 sold) from the hero section entirely. Add a comment explaining why it was removed (uniform fake data is a trust/legal risk). Do NOT add a DB schema migration — just remove the block.

### R4. Fix admin-api slug uniqueness: return 409 instead of 500
In `apps/admin-api/src/routes/landing-pages.ts`:
- Before INSERT on POST: query for existing LP with same slug, if found return `c.json({ success: false, error: 'A landing page with this slug already exists' }, 409)`
- Before UPDATE on PUT: query for existing LP with same slug AND `id != currentId`, if found return 409 with same error
- Both routes still return 200/201 for valid unique slugs

### R5. Parallelize sequential DB queries in public-api GET /:slug
In `apps/public-api/src/routes/landing-pages.ts`, after fetching the landing page record, use `Promise.all` to run the product fetch, variants fetch, and price list fetch in parallel instead of sequentially.

### R6. Document price unit in LandingClient / LandingHero
Add inline comments next to the `/100` divisions for `regular_price` and `price` fields explaining that `price_list_items.price` stores values in minor units (VNĐ × 100), so dividing by 100 converts to display VNĐ.

### R7. Build + lint + test pass
After all changes:
- `pnpm --filter @ecommerce/storefront-ui build` → exit 0
- `pnpm --filter @ecommerce/public-api lint` → 0 errors  
- `pnpm --filter @ecommerce/admin-api lint` → 0 errors
- All pre-existing tests pass: `pnpm --filter @ecommerce/public-api test` and `pnpm --filter @ecommerce/core-services test`

---

## Sub-Tasks (auto-created)

### Task 1 — Research Phase
Read ALL the following files thoroughly before writing any code:
- `apps/storefront-ui/src/app/landing/[slug]/page.tsx`
- `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`
- `apps/public-api/src/routes/landing-pages.ts`
- `apps/admin-api/src/routes/landing-pages.ts`
- `apps/admin-ui/src/tabs/LandingPagesTab.tsx`
- `packages/database/src/schema.ts` (for landingPages table shape)
- `apps/storefront-ui/src/lib/image.ts` (getImageUrl helper)

Map the complete data flow. Document all findings before writing code.

### Task 2 — R1: SSR + generateMetadata
Implement server-side data fetching and SEO metadata generation in page.tsx.

### Task 3 — R2: Split LandingClient.tsx
Extract LandingPixels, LandingHero, LandingOrderForm as separate files.

### Task 4 — R3 + R6: Remove fake social proof + add price unit comments
Remove the hardcoded block and add documentation comments.

### Task 5 — R4: Admin-api slug uniqueness
Add pre-insert/pre-update slug uniqueness checks returning 409.

### Task 6 — R5: Parallelize DB queries
Refactor GET /:slug handler to use Promise.all.

### Task 7 — R7: Build, Lint, Test, Debug
Run all checks. Fix any TypeScript or ESLint errors. Iterate until all pass.

### Task 8 — Git Commit & Push
After all checks pass:
```
git add .
git commit -m "refactor(landing-pages): SSR, component split, slug validation, query parallelization"
git push
```

---

## Acceptance Criteria

### SSR & SEO
- [ ] `page.tsx` fetches LP data server-side with `revalidate: 60`
- [ ] `generateMetadata` exports correct `title` and `description` from LP data
- [ ] When LP not found server-side, `notFound()` is called
- [ ] `LandingClient` still supports client-side fallback when `initialLp` is undefined

### Component Split
- [ ] `LandingPixels.tsx`, `LandingHero.tsx`, `LandingOrderForm.tsx` exist as separate files
- [ ] `LandingClient.tsx` is under 150 lines after extraction
- [ ] No `any` for top-level component prop interfaces
- [ ] No duplicate JSX logic between the new files

### Social Proof & Price Docs
- [ ] Hardcoded `4.9`, `1200`, `583 824` constants are removed
- [ ] Inline comments explain `/100` division for price unit conversion

### Slug Validation
- [ ] POST `/landing-pages` with duplicate slug → HTTP 409
- [ ] PUT `/landing-pages/:id` with slug used by another LP → HTTP 409
- [ ] Valid unique slugs → 200/201

### Query Optimization
- [ ] Public-api GET `/:slug` uses `Promise.all` for product/variants/price queries

### Build & Lint
- [ ] `pnpm --filter @ecommerce/storefront-ui build` exits 0
- [ ] `pnpm --filter @ecommerce/public-api lint` → 0 errors
- [ ] `pnpm --filter @ecommerce/admin-api lint` → 0 errors
- [ ] All pre-existing tests pass

### Final Commit
- [ ] All changes committed and pushed: `refactor(landing-pages): SSR, component split, slug validation, query parallelization`
