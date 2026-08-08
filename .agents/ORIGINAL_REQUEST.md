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

## Follow-up — 2026-08-08T04:20:28Z

Refactor the checkout + order system of the `cloudflare-ecommerce` monorepo — a production Cloudflare Workers + Next.js e-commerce platform. Fix ALL known bugs, runtime crashes, security vulnerabilities, data integrity issues, and structural problems found in the research audit. Produce clean TypeScript code that passes build and lint checks.

Working directory: D:\myproject\cloudflare-ecommerce

Integrity mode: development

---

## Context — System Overview

The checkout + order system spans:
- `apps/public-api/src/routes/checkout.ts` (345 lines) — Public checkout API with idempotency, rate limiting, Stripe session creation
- `apps/admin-api/src/routes/orders.ts` (358 lines) — Admin order CRUD: list, detail, fulfill, refund, approve/cancel
- `apps/admin-api/src/routes/checkout.ts` (164 lines) — Admin POS manual order creation
- `apps/storefront-ui/src/app/checkout/page.tsx` (238 lines) — Client checkout page with Turnstile, address, coupon
- `apps/storefront-ui/src/app/checkout/success/page.tsx` (123 lines) — Order success page
- `apps/storefront-ui/src/lib/checkout-api.ts` (61 lines) — Typed API client
- `apps/storefront-ui/src/hooks/useCheckoutData.ts` (73 lines) — Customer profile + address prefill hook
- `apps/storefront-ui/src/hooks/useShippingEstimate.ts` (30 lines) — Shipping fee hook
- `apps/storefront-ui/src/hooks/usePriceValidation.ts` (48 lines) — Cart price validation hook
- `apps/storefront-ui/src/store/cartStore.ts` (143 lines) — Zustand cart store with persistence
- `packages/core-services/src/order.service.ts` (313 lines) — 2PC checkout orchestrator
- `packages/core-services/src/inventory.service.ts` (243 lines) — Stock verification + deduction
- `packages/core-services/src/payment.service.ts` (162 lines) — Stripe integration + pricing
- `packages/contract/src/index.ts` (252 lines) — Shared Zod schemas
- `apps/admin-ui/src/tabs/OrdersTab.tsx` (365 lines) — Admin order list with SWR
- `apps/admin-ui/src/components/OrderDetailModal.tsx` (195 lines) — Order detail modal

---

## Critical Issues Found (Research Audit)

### ISSUE 1 — RUNTIME CRASH: `c.env` passed instead of `c.env.DB` [CRITICAL]
- `apps/public-api/src/routes/checkout.ts:L330`: `OrderService.cancelOrderAndRestock(db, c.env, orderId)` — passes `c.env` instead of `c.env.DB` as the `rawD1Db` parameter
- `apps/admin-api/src/routes/orders.ts:L114`: `OrderService.refundOrderAndRestock(db, c.env, orderId, order.status)` — same bug
- `packages/core-services/src/order.service.ts:L14, L93, L181`: Methods signatures `(drizzleDb, rawD1Db, ...)` — `rawD1Db` expects `D1Database`, not the full `Bindings` env object
- **Impact**: ANY refund or order cancel operation crashes at runtime with a `TypeError` when `rawD1Db.prepare` is invoked on `c.env`
- **Fix**: Change both callers to pass `c.env.DB` as the second argument

### ISSUE 2 — CRITICAL BILLING BUG: Stripe charges USD when business sells in VNĐ [CRITICAL]
- `packages/core-services/src/payment.service.ts:L63-L64`: `currency: 'usd'` hardcoded
- VNĐ price 50,000 ₫ gets sent to Stripe as `$50,000.00 USD`
- **Fix**: This is known technical debt (Stripe doesn't support VNĐ natively). Add a clear `PAYMENT_CONFIG` constant block documenting the VNĐ→USD conversion strategy (divide by 100 to express as USD cents if treating 1 VNĐ = 0.01 USD, or add TODO with explicit conversion rate). Ensure the comment is accurate so future devs don't accidentally "fix" the conversion in the wrong direction. Do NOT break existing Stripe integration — just make it safe and documented.

### ISSUE 3 — DATA INTEGRITY: cartStore.ts syncCart sends product_id instead of variation ID [HIGH]
- `apps/storefront-ui/src/store/cartStore.ts:L118-L121`: `syncCart` maps `{ productId: i.product_id, quantity: i.quantity }` — uses `i.product_id` instead of `i.id`
- **Impact**: All variation selections (Size, Color, etc.) are lost during server cart sync
- **Fix**: Change to `{ productId: i.id, quantity: i.quantity }` to preserve variation ID

### ISSUE 4 — IDEMPOTENCY FLAW: New UUID per retry negates server-side protection [HIGH]
- `apps/storefront-ui/src/app/checkout/page.tsx:L106`: `idempotencyKey = crypto.randomUUID()` generated inside `handleSubmit`
- On network failure and re-submit, a new UUID is generated → server treats it as a brand new order → duplicate orders possible
- **Fix**: Generate idempotency key in component state (useState) once on mount, reset only on successful completion

### ISSUE 5 — SECURITY: RBAC mismatch — editor can approve/cancel but cannot view orders [HIGH]
- `apps/admin-api/src/routes/orders.ts:L13, L34`: `GET /orders` and `GET /orders/:id` added `requireRole(['superadmin', 'manager', 'support'])` in previous refactor
- `L291, L324`: `POST /orders/:id/approve` and `POST /orders/:id/cancel` include `'editor'` in allowed roles
- **Impact**: Editors can approve/cancel orders they cannot see (blind actions)
- **Fix**: Add `'editor'` to `GET /orders` and `GET /orders/:id` RBAC lists OR remove `'editor'` from approve/cancel

### ISSUE 6 — SILENT STOCK DEDUCTION FAILURE [HIGH]
- `packages/core-services/src/inventory.service.ts:L193`: SQL `WHERE stock_quantity >= item.quantity` — if stock is missing or insufficient at commit time, D1 updates 0 rows without throwing or rolling back
- **Impact**: Orders can be confirmed with 0 stock silently
- **Fix**: After the batch deduction, verify that rows were actually updated. If `changes === 0` for any item, throw an error to trigger rollback

### ISSUE 7 — MISSING APPROVE/CANCEL BUTTONS in Admin UI [MEDIUM]
- `apps/admin-ui/src/tabs/OrdersTab.tsx:L224`: Orders in non-processing states show `—` in action column
- Backend `POST /orders/:id/approve` and `POST /orders/:id/cancel` routes exist but Admin UI has no UI to trigger them
- **Fix**: Add "Approve" button for `pending`/`confirmed` orders and "Cancel" button for cancellable statuses in OrdersTab

### ISSUE 8 — CURRENCY MISMATCH in Admin UI [MEDIUM]
- `apps/admin-ui/src/tabs/OrdersTab.tsx:L106`: Formats amounts with `en-US/USD`
- `apps/admin-ui/src/components/OrderDetailModal.tsx:L38`: Same USD formatter
- **Fix**: Change both to `vi-VN/VND` locale with `/100` conversion comment

### ISSUE 9 — DISCOUNT CALCULATION BUG in OrderDetailModal [MEDIUM]
- `apps/admin-ui/src/components/OrderDetailModal.tsx:L171`: Subtotal reads only `order.discounts?.[0]?.discount_amount` — ignores multiple discounts
- **Fix**: Sum all discount amounts: `order.discounts?.reduce((sum, d) => sum + d.discount_amount, 0) ?? 0`

### ISSUE 10 — SHIPPING ESTIMATE not debounced [MEDIUM]
- `apps/storefront-ui/src/hooks/useShippingEstimate.ts`: No debounce on postcode input — every keystroke fires an HTTP request
- **Fix**: Add 400ms debounce before fetching shipping estimate

### ISSUE 11 — CART RETENTION BUG after Stripe redirect [LOW]
- `apps/storefront-ui/src/app/checkout/page.tsx:L129-L137`: When Stripe redirect happens, `clearCart()` is NOT called before redirecting
- **Fix**: Call `clearCart()` before `window.location.href = checkout_url`

### ISSUE 12 — CART SYNC on success page without verification [LOW]
- `apps/storefront-ui/src/app/checkout/success/page.tsx:L30-L32`: `clearCart()` called on mount without verifying order status from backend
- **Fix**: Keep `clearCart()` on success mount (acceptable since success page is only reached after payment), but add a comment explaining this is intentional

### ISSUE 13 — hardcoded `cart_id: 'draft'` in applyCoupon [LOW]
- `apps/storefront-ui/src/lib/checkout-api.ts:L21`: `cart_id: 'draft'` — stale placeholder
- **Fix**: Remove hardcoded value or make it dynamic

### ISSUE 14 — useShippingEstimate initial state hardcoded to 5000 [LOW]
- `apps/storefront-ui/src/hooks/useShippingEstimate.ts:L6`: Initial state `5000` — this displays before first API call
- **Fix**: Change to `null` or `0` and handle loading state

### ISSUE 15 — Location ID inconsistency: 'loc-1' vs 'loc_default' vs 'loc-1' [LOW]
- `public-api/checkout.ts:L112`, `admin-api/checkout.ts:L18`, `order.service.ts:L72`, `inventory.service.ts:L17`: All use `'loc-1'` as default
- `admin-api/products.ts`: Uses `'loc_default'`
- **Fix**: Create a shared constant `DEFAULT_LOCATION_ID = 'loc-1'` in the contract/shared package and use it everywhere (or at least document the canonical value)

### ISSUE 16 — Missing search/filter in GET /orders [LOW]
- `admin-api/routes/orders.ts:L25`: Total count ignores filters
- Admin orders list cannot be filtered by status, date, or searched by email/ID
- **Fix**: Add optional `?status=` and `?search=` query params to `GET /orders`

---

## Sub-Tasks (auto-created)

### Task 1 — Research Phase
Read ALL files in Context section above before writing code. Confirm all 16 issues exist. Note exact line numbers.

### Task 2 — Fix runtime crashes (Issues 1)
- Fix `c.env` → `c.env.DB` in both `public-api/checkout.ts:L330` and `admin-api/orders.ts:L114`

### Task 3 — Fix data integrity issues (Issues 3, 6, 9)
- Fix `cartStore.ts` syncCart variation ID bug
- Add stock deduction verification in `inventory.service.ts`
- Fix multi-discount sum in `OrderDetailModal.tsx`

### Task 4 — Fix idempotency + cart retention (Issues 4, 11)
- Move idempotency key to component state in `checkout/page.tsx`
- Call `clearCart()` before Stripe redirect

### Task 5 — Fix RBAC mismatch + add approve/cancel buttons (Issues 5, 7)
- Fix editor role RBAC in `admin-api/orders.ts`
- Add Approve/Cancel action buttons in `OrdersTab.tsx`

### Task 6 — Fix currency display + document Stripe VNĐ (Issues 2, 8)
- Fix currency formatters in `OrdersTab.tsx` and `OrderDetailModal.tsx` to use VNĐ
- Add clear `PAYMENT_CONFIG` constant block in `payment.service.ts` documenting the VNĐ/USD situation

### Task 7 — Fix UX issues (Issues 10, 13, 14, 15, 16)
- Add debounce to `useShippingEstimate`
- Fix `cart_id: 'draft'` in `checkout-api.ts`
- Fix initial shipping state to `null`
- Document location ID constant
- Add `?status=` filter to `GET /orders`

### Task 8 — Build + Lint + Test
- `pnpm --filter @ecommerce/storefront-ui build` → exit 0
- `pnpm --filter @ecommerce/public-api lint` → 0 errors
- `pnpm --filter @ecommerce/admin-api lint` → 0 errors
- `pnpm --filter @ecommerce/core-services test` → all pass (including `order.service.test.ts`, `inventory.test.ts`, `payment.test.ts`)
- Fix all errors found

### Task 9 — Git Commit & Push
```
git add .
git commit -m "refactor(checkout): fix runtime crash, variation sync, idempotency, RBAC, currency display"
git push
```

---

## Requirements

### R1. Runtime crashes fixed
- `OrderService.cancelOrderAndRestock` and `refundOrderAndRestock` receive `c.env.DB` (not `c.env`) in all callers

### R2. Cart variation preserved
- `cartStore.ts` `syncCart` uses `i.id` (variation ID) not `i.product_id`

### R3. Idempotency key stable across retries
- Idempotency UUID stored in React state, not regenerated on each submit

### R4. Cart cleared before Stripe redirect
- `clearCart()` called before `window.location.href = checkout_url`

### R5. RBAC consistent for editor role
- `GET /orders` and `GET /orders/:id` include `'editor'` role OR editor is removed from approve/cancel routes (choose consistent policy)

### R6. Admin UI: Approve + Cancel buttons present
- `OrdersTab.tsx` shows Approve button for `pending`/`confirmed` orders
- Cancel button shown for non-terminal statuses

### R7. VNĐ currency in admin UI
- `OrdersTab.tsx` and `OrderDetailModal.tsx` format amounts with `vi-VN/VND` locale

### R8. Stock deduction verified
- `inventory.service.ts` throws if any item deduction results in 0 DB rows changed

### R9. Stripe VNĐ situation documented
- `payment.service.ts` has clear `PAYMENT_CONFIG` constant block explaining the currency handling

### R10. Build + lint + tests pass
- All 3 build/lint commands exit 0
- All pre-existing core-services tests pass

### R11. Final commit pushed
- Commit: `refactor(checkout): fix runtime crash, variation sync, idempotency, RBAC, currency display`

---

## Acceptance Criteria

### Runtime & Data
- [ ] `OrderService.cancelOrderAndRestock(db, c.env.DB, orderId)` — NOT `c.env`
- [ ] `OrderService.refundOrderAndRestock(db, c.env.DB, orderId, status)` — NOT `c.env`
- [ ] `cartStore.ts` syncCart uses `i.id` for variation ID
- [ ] Inventory deduction throws if `changes === 0` for any item
- [ ] Idempotency key generated once in React state, not inside `handleSubmit`
- [ ] `clearCart()` called before Stripe redirect URL

### Admin UI
- [ ] Orders in `pending`/`confirmed` status show "Approve" button in OrdersTab
- [ ] Non-terminal orders show "Cancel" button in OrdersTab
- [ ] `OrdersTab.tsx` uses `vi-VN/VND` currency format
- [ ] `OrderDetailModal.tsx` uses `vi-VN/VND` currency format
- [ ] `OrderDetailModal.tsx` sums ALL discount amounts (not just `discounts[0]`)

### API & Services
- [ ] `GET /orders` supports optional `?status=` filter
- [ ] RBAC for editor role is consistent across list + detail + approve/cancel
- [ ] `payment.service.ts` has `PAYMENT_CONFIG` constant block with VNĐ/USD comment

### Build & Tests
- [ ] `pnpm --filter @ecommerce/storefront-ui build` exits 0
- [ ] `pnpm --filter @ecommerce/admin-api lint` exits 0
- [ ] `pnpm --filter @ecommerce/public-api lint` exits 0
- [ ] All pre-existing `core-services` tests pass

### Git
- [ ] Commit `refactor(checkout): fix runtime crash, variation sync, idempotency, RBAC, currency display` pushed to origin/main
