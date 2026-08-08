# Orchestration Execution Plan

## Objectives
Execute full catalog + product system refactor for cloudflare-ecommerce to resolve 14 critical/high/medium/low issues identified in ORIGINAL_REQUEST.md.

## Decomposition Strategy (Milestones)

### Milestone 1 (M1): Research & Baseline Verification
- Dispatch 3 `teamwork_preview_explorer` agents to map and investigate codebase files:
  - `packages/core-services/src/catalog.service.ts`
  - `packages/core-services/src/product.service.ts`
  - `packages/core-services/src/category.service.ts`
  - `apps/admin-api/src/routes/products.ts`
  - `apps/admin-api/src/routes/categories.ts`
  - `apps/public-api/src/routes/catalog.ts`
  - `apps/storefront-ui/src/app/page.tsx`
  - `apps/storefront-ui/src/app/product/[slug]/page.tsx`
  - `apps/admin-ui/src/tabs/ProductsTab.tsx`
  - `apps/admin-ui/src/tabs/CategoriesTab.tsx`
  - `packages/contract/src/admin.ts`
  - `packages/database/src/schema.ts`

### Milestone 2 (M2): Core Services Fixes (Tasks 2 & 3)
- Issue 2: Return sale prices in `getCatalogList` & `getCatalogItem`.
- Issue 3: Unified price schema in `searchCatalog` (`regular_price`, `sale_price`).
- Issue 5: Guard `inArray` against empty `imageUrls` in `ProductService`.
- Issue 7: Add `price_list_id` base price list filter to price subqueries in `catalog.service.ts`.
- Issue 8: Guard `Math.min/max` against empty arrays in `ProductService`.
- Issue 12: Remove dead code `formatForStorefront` in `product.service.ts`.

### Milestone 3 (M3): Admin API & Categories Fixes (Tasks 4 & 5)
- Issue 4: Secure `GET /products/search-sku` and `GET /products/search` with `requireRole(['superadmin', 'manager', 'editor'])`.
- Issue 6: Add cascading soft-delete for product variations on `DELETE /products/:id`.
- Issue 7: Fix price subqueries in `admin-api/routes/products.ts` with `price_list_id` filter.
- Issue 11: Improve slug sanitization in `categories.ts`.
- Issue 13: Clean `collection_products` mapping table on category delete.

### Milestone 4 (M4): Storefront UI & Catalog Route Fixes (Task 6)
- Issue 1: Fix product type check `'variable'` -> `'configurable'` in `page.tsx` and `[slug]/page.tsx`.
- Issue 10: Verify and document route order in `catalog.ts` (`GET /search` before `GET /:slug`).
- Issue 14: Fix JSON-LD price (use `price_range.min_amount`) and availability (sum variation stock).

### Milestone 5 (M5): Admin UI Fixes (Task 7)
- Issue 9: In `ProductsTab.tsx`, fetch product directly from `/products/:id` when `id` URL param is present.

### Milestone 6 (M6): Build, Lint, Test Verification & Git Operations (Tasks 8 & 9)
- Run `pnpm --filter @ecommerce/storefront-ui build`
- Run `pnpm --filter @ecommerce/public-api lint`
- Run `pnpm --filter @ecommerce/admin-api lint`
- Run `pnpm --filter @ecommerce/core-services test`
- Verification by reviewer and auditor agents.
- Git commit & push: `refactor(catalog): fix type mismatch, sale prices, auth, cascade delete, price queries`
