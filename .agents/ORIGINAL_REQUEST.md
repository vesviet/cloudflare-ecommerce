# Original User Request

## Initial Request — 2026-08-08T03:48:49Z

Refactor the catalog + product system of the `cloudflare-ecommerce` monorepo — a production Cloudflare Workers + Next.js e-commerce platform. Fix ALL known bugs, type mismatches, security vulnerabilities, and structural problems found in the research audit. Produce clean TypeScript code that passes build and lint checks.

Working directory: D:\myproject\cloudflare-ecommerce

Integrity mode: development

---

## Context — System Overview

The catalog/product system spans 5 packages/apps:
- `apps/public-api/src/routes/catalog.ts` — Public catalog API (GET list, GET /:slug, GET /search)
- `apps/admin-api/src/routes/products.ts` — Admin product CRUD (GET list, POST create, PUT update, DELETE soft-delete)
- `apps/admin-api/src/routes/categories.ts` — Admin category CRUD
- `apps/storefront-ui/src/app/page.tsx` — Homepage with product grid
- `apps/storefront-ui/src/app/product/[slug]/page.tsx` — Product detail page
- `apps/admin-ui/src/tabs/ProductsTab.tsx` — Admin product list + edit form
- `apps/admin-ui/src/tabs/CategoriesTab.tsx` — Admin category management
- `packages/core-services/src/catalog.service.ts` — Business logic for catalog queries
- `packages/core-services/src/product.service.ts` — Product upsert batch query builder
- `packages/core-services/src/category.service.ts` — Category cycle detection helper
- `packages/contract/src/admin.ts` — Zod schemas for product/category forms
- `packages/database/src/schema.ts` — Drizzle ORM schema

---

## Critical Issues Found (Research Audit)

### ISSUE 1 — Product type 'configurable' vs 'variable' MISMATCH [CRITICAL]
- Backend DB + contract stores `type = 'configurable'`
- Storefront `page.tsx:L47` checks `product.type === 'variable'` → ALL configurable products render as simple products, breaking variant selection, swatch rendering, price ranges, and "Select Options" buttons
- **Fix**: Update `apps/storefront-ui/src/app/page.tsx` and `apps/storefront-ui/src/app/product/[slug]/page.tsx` to check for `'configurable'` instead of `'variable'` (or both).

### ISSUE 2 — Sale price NEVER returned in catalog API [CRITICAL]
- `price_list_items` table stores both base and sale prices but `CatalogService.getCatalogList` only fetches regular price
- `sale_price` is always `null` in API responses → sale badges, discounted prices never show on storefront
- **Fix**: Update `catalog.service.ts` `getCatalogList`, `getCatalogItem` SQL to also fetch sale price from `price_list_items` where `price_list_id` is the sale list.

### ISSUE 3 — Inconsistent price schema between browse and search [HIGH]
- `/api/products` list returns: `{ regular_price, sale_price, price_range: { min_amount, max_amount } }`
- `/api/products/search` returns: `{ base_price_cents, sale_price_cents, currency: 'USD' }`
- **Fix**: Normalize `searchCatalog` in `catalog.service.ts` to return the same `{ regular_price, sale_price }` shape as the list.

### ISSUE 4 — SECURITY: Admin search endpoints have NO auth middleware [HIGH]
- `GET /products/search-sku` (line 96) and `GET /products/search` (line 124) in `admin-api/routes/products.ts` lack `requireRole` middleware
- Any unauthenticated user can read internal SKUs, prices, stock levels
- **Fix**: Add `requireRole(['superadmin', 'manager', 'editor'])` to both routes.

### ISSUE 5 — Empty `inArray` D1 SQL crash in ProductService [HIGH]
- `product.service.ts:L189`: `inArray(schema.assets.r2_key, params.imageUrls)` generates invalid SQL `IN ()` when `imageUrls` is empty `[]`
- Any create/update WITHOUT new image uploads throws a DB syntax error
- **Fix**: Guard with `if (params.imageUrls && params.imageUrls.length > 0)` before the inArray query.

### ISSUE 6 — Cascading soft-delete missing for variations [HIGH]
- `DELETE /products/:id` soft-deletes the parent row but leaves child `products` rows (variations) with `deleted_at = NULL`
- Variations remain queryable, appear in stock checks, and break the admin list
- **Fix**: Add `UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE parent_id = :id` after soft-deleting the parent.

### ISSUE 7 — Price subqueries lack `price_list_id` filter [MEDIUM]
- In `admin-api/routes/products.ts` at L45, L107, L135: raw subquery `SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1` returns arbitrary prices when multiple price lists exist (no `price_list_id` condition)
- Same issue in `catalog.service.ts` at L21, L43, L68, L111, L128, L163
- **Fix**: Add `AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1)` to all price subqueries.

### ISSUE 8 — `Math.min/max` Infinity bug in ProductService [MEDIUM]
- `product.service.ts:L14-L15`: `Math.min(...amounts)` returns `Infinity` / `-Infinity` if a variable product has no valid variation prices
- These corrupt the JSON price_range output
- **Fix**: Guard with `amounts.length > 0` check before calling Math.min/max.

### ISSUE 9 — Admin UI ProductsTab edit form breaks for page 2+ [MEDIUM]
- `ProductsTab.tsx:L48`: `products.find(p => p.id === id)` only searches the currently loaded 50-item page
- Products on page 2+ cannot be edited via URL or after pagination
- **Fix**: When `id` param is present, fetch product details directly from `/products/:id` API instead of searching local list.

### ISSUE 10 — Route shadowing: `GET /search` can match `GET /:slug` [MEDIUM]
- In `catalog.ts`, `GET /search` is declared at L40 and `GET /:slug` at L69
- If a product slug is `"search"`, route execution may be ambiguous depending on Hono router order
- **Fix**: Ensure `GET /search` is registered BEFORE `GET /:slug` in `catalog.ts` (verify and comment this ordering). Hono routes process in declaration order so declaration order matters.

### ISSUE 11 — Weak slug generation in categories.ts [LOW]
- `body.name.toLowerCase().replace(/\s+/g, '-')` leaves special characters unescaped
- **Fix**: Add a proper slug sanitizer that removes non-alphanumeric characters.

### ISSUE 12 — Dead code: `formatForStorefront` in product.service.ts [LOW]
- `product.service.ts:L35-L70`: `formatForStorefront` method declared but never called
- **Fix**: Remove dead method with a comment explaining it was removed.

### ISSUE 13 — Category delete doesn't clean collection_products [LOW]
- `categories.ts:L109-L110`: Deletion clears `parent_id` and `primary_category_id` but doesn't delete rows in `collection_products` mapping table
- **Fix**: Add `DELETE FROM collection_products WHERE collection_id = :id` before deleting the category.

### ISSUE 14 — JSON-LD price and availability bugs on product page [LOW]
- `[slug]/page.tsx:L67`: JSON-LD price always `0` for variable products because `regular_price` is `null` on parent
- `[slug]/page.tsx:L69`: JSON-LD availability says `OutOfStock` for variable products (stock on child rows)
- **Fix**: Use `price_range.min_amount` as fallback for JSON-LD price; for availability use total variation stock.

---

## Sub-Tasks (auto-created)

### Task 1 — Research Phase
Read ALL files listed in the Context section above in full before writing any code. Confirm all issues above exist and find any additional ones.

### Task 2 — Fix catalog.service.ts (Issues 2, 3, 7)
- Add sale price to `getCatalogList` and `getCatalogItem` queries
- Filter price subqueries with `price_list_id` condition for base vs sale lists
- Normalize `searchCatalog` return shape to match list/item

### Task 3 — Fix product.service.ts (Issues 5, 8, 12)
- Guard `inArray` with empty array check
- Guard `Math.min/max` with empty array check 
- Remove dead `formatForStorefront` method

### Task 4 — Fix admin-api/routes/products.ts (Issues 4, 6, 7)
- Add `requireRole` to search endpoints
- Cascade soft-delete to child variations
- Fix price subquery to include `price_list_id` filter

### Task 5 — Fix admin-api/routes/categories.ts (Issues 11, 13)
- Improve slug sanitization
- Delete `collection_products` rows when a category is deleted

### Task 6 — Fix storefront-ui type checks (Issues 1, 10, 14)
- Replace `'variable'` with `'configurable'` in all storefront type checks
- Fix JSON-LD price and availability on product detail page
- Verify route ordering in catalog.ts (search before :slug)

### Task 7 — Fix admin-ui/ProductsTab.tsx (Issue 9)
- When `id` param present, fetch directly from `/products/:id`

### Task 8 — Build + Lint + Test
- `pnpm --filter @ecommerce/storefront-ui build` → exit 0
- `pnpm --filter @ecommerce/public-api lint` → 0 errors
- `pnpm --filter @ecommerce/admin-api lint` → 0 errors
- `pnpm --filter @ecommerce/core-services test` → all pass
- Fix any errors found

### Task 9 — Git Commit & Push
```
git add .
git commit -m "refactor(catalog): fix type mismatch, sale prices, auth, cascade delete, price queries"
git push
```

---

## Requirements

### R1. Product type consistency
- All storefront UI checks use `'configurable'` (NOT `'variable'`)
- Contract schema `productFormSchema` type enum is unchanged (`['simple', 'configurable', 'virtual']`)

### R2. Sale prices working in catalog API
- `getCatalogList` and `getCatalogItem` in `catalog.service.ts` return non-null `sale_price` when a sale price exists in `price_list_items`
- Sale badge shows on storefront homepage for products with `sale_price < regular_price`

### R3. Unified price schema
- `searchCatalog` returns `{ regular_price, sale_price }` matching the list/item shape

### R4. Admin search routes secured
- `GET /products/search-sku` requires `requireRole(['superadmin', 'manager', 'editor'])`
- `GET /products/search` requires `requireRole(['superadmin', 'manager', 'editor'])`

### R5. Empty imageUrls crash fixed
- `product.service.ts` guards `inArray` with `params.imageUrls.length > 0` check
- Creating/updating products without image uploads no longer throws DB errors

### R6. Cascading soft-delete
- `DELETE /products/:id` also soft-deletes all child variations (rows with `parent_id = :id`)

### R7. Build + Lint + Tests pass
- `pnpm --filter @ecommerce/storefront-ui build` exits 0
- `pnpm --filter @ecommerce/admin-api lint` exits 0 errors
- `pnpm --filter @ecommerce/public-api lint` exits 0 errors
- `pnpm --filter @ecommerce/core-services test` all pass

### R8. Final commit pushed
- Commit message: `refactor(catalog): fix type mismatch, sale prices, auth, cascade delete, price queries`

---

## Acceptance Criteria

### Storefront
- [ ] `product.type === 'configurable'` check is used (not `'variable'`) in `page.tsx` and `[slug]/page.tsx`
- [ ] `sale_price` is non-null in catalog API response when a sale price exists
- [ ] `isOnSale` badge logic works correctly on homepage product grid
- [ ] JSON-LD on product detail page uses `price_range.min_amount` as price fallback

### Backend API
- [ ] `GET /products/search-sku` returns 403 without auth token
- [ ] `GET /products/search` returns 403 without auth token
- [ ] `DELETE /products/:id` also sets `deleted_at` on all child variation rows
- [ ] Price subqueries in `getCatalogList`, `getCatalogItem` include `price_list_id` filter
- [ ] `searchCatalog` returns same price field shape as `getCatalogList`

### Core Services
- [ ] `inArray(schema.assets.r2_key, imageUrls)` is never called with empty array
- [ ] `Math.min/max` price calculations guard against empty `amounts` array
- [ ] `formatForStorefront` dead code is removed

### Admin
- [ ] Category delete removes rows from `collection_products` mapping table
- [ ] Category slug sanitization removes special characters

### Admin UI
- [ ] `ProductsTab` fetches product data from `/products/:id` when editing a product by URL id param (not just from local page cache)

### Build & Lint
- [ ] `pnpm --filter @ecommerce/storefront-ui build` exits 0
- [ ] `pnpm --filter @ecommerce/admin-api lint` exits 0 errors
- [ ] `pnpm --filter @ecommerce/public-api lint` exits 0 errors
- [ ] All pre-existing tests pass

### Git
- [ ] Commit `refactor(catalog): fix type mismatch, sale prices, auth, cascade delete, price queries` pushed to origin/main
