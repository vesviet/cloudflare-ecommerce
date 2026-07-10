# Handoff Report: Product Reviews, Wishlists, and Administrative Security Controls (SL-04 & SL-05)

## 1. Observation
The following file paths, line numbers, and compilation errors were directly observed:

### A. Product Reviews (SL-04)
*   **File Path**: `apps/public-api/src/routes/reviews.ts`
*   **Verbatim compilation error**:
    ```
    src/routes/reviews.ts(24,20): error TS2339: Property 'productReviews' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    src/routes/reviews.ts(25,24): error TS2339: Property 'productReviews' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    src/routes/reviews.ts(26,28): error TS2339: Property 'productReviews' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    src/routes/reviews.ts(46,46): error TS2339: Property 'productReviews' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ```
*   **Database Schema (`packages/database/src/schema.ts`)**: `productReviews` table is completely absent.

### B. Wishlists (SL-04)
*   **File Path**: `packages/core-services/src/wishlist.service.ts`
*   **Verbatim compilation error**:
    ```
    ../../packages/core-services/src/wishlist.service.ts(70,35): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(78,35): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(80,19): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(81,19): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(95,35): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(96,20): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(97,28): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(97,79): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ../../packages/core-services/src/wishlist.service.ts(110,35): error TS2339: Property 'wishlists' does not exist on type 'typeof import("/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/src/schema")'.
    ```
*   **Raw SQL Reference (`packages/core-services/src/wishlist.service.ts` lines 10-31)**:
    ```typescript
    SELECT ... FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.customer_id = ${customerId} ORDER BY w.created_at DESC
    ```

### C. LOCAL_DEV Bypass in Auth Middleware (SL-05)
*   **File Path**: `apps/admin-api/src/middleware/auth.ts` lines 33-39
*   **Verbatim implementation**:
    ```typescript
    const isLocalDev = c.env.LOCAL_DEV === 'true';
    let email = '';

    if (isLocalDev) {
      // In local dev, use custom header or default to admin@local.dev
      email = c.req.header('X-Local-Admin-Email') || 'admin@local.dev';
    } else {
    ```

### D. Missing `requireRole` in Admin Write Routes (SL-05)
A thorough scan of admin routes in `apps/admin-api/src/routes/` shows that `requireRole` middleware is completely missing in:
1.  `categories.ts` write routes: `POST /`, `PUT /:id`, `DELETE /:id`
2.  `products.ts` write routes: `POST /products`, `PUT /products/:id`
3.  `customers.ts` create route: `POST /customers` (but present on update & password reset)
4.  `settings.ts` write route: `PUT /settings/batch`
5.  `coupons.ts` (Promotions) write routes: `POST /`, `PUT /:id`, `PATCH /:id/toggle`, `DELETE /:id`

---

## 2. Logic Chain
1.  **Product Reviews & Wishlists Compilation failures**:
    *   Migration `0010_cold_kid_colt.sql` ran `DROP TABLE product_reviews;` and `DROP TABLE wishlists;` (Observation A, B).
    *   Drizzle schema definition in `packages/database/src/schema.ts` was updated to omit these tables, which is the source of truth for `@ecommerce/database` (Observation A, B).
    *   Since `apps/public-api/src/routes/reviews.ts` and `packages/core-services/src/wishlist.service.ts` still reference `schema.productReviews` and `schema.wishlists` and query them, the compiler fails immediately with TS2339 (Property does not exist) errors.
2.  **Authentication Bypass Risk**:
    *   In `apps/admin-api/src/middleware/auth.ts`, if `LOCAL_DEV` is set to `'true'`, the middleware reads `X-Local-Admin-Email` from request headers to authenticate (Observation C).
    *   If `LOCAL_DEV` is misconfigured to `'true'` in production or staging, anyone can spoof `X-Local-Admin-Email` and gain full admin access.
    *   Therefore, checking `c.env.ENVIRONMENT === 'local'` ensures that even if `LOCAL_DEV` is active, the bypass will not trigger in non-local environments.
3.  **RBAC Middleware Coverage**:
    *   Admin API routing imports `requireRole` in some files (like `adminUsers.ts` and `customers.ts`), but not in others (Observation D).
    *   Write endpoints that mutate settings, products, promotions, categories, and customers should be guarded by `requireRole` to prevent unauthorized admin roles (e.g. `support` or `editor`) from making restricted alterations.

---

## 3. Caveats
*   The compilation errors outside of reviews/wishlists (like `coupons.ts` referencing deleted `schema.coupons`, `orders.ts` referencing `schema.orderDiscounts`, etc.) were observed during the compilation check. This analysis focused on the requested refactoring of Reviews/Wishlists (SL-04) and Admin security (SL-05).
*   Restoring the `product_reviews` and `wishlists` tables will require creating and running a new D1 migration to physically create those tables in D1.

---

## 4. Conclusion
1.  **Product Reviews & Wishlists**: The cleanest solution to fix the compile errors is to **re-introduce** `productReviews` and `wishlists` tables in `packages/database/src/schema.ts` and generate a migration, rather than force-mapping them to the `cmsEntries` table which would degrade database constraints and query performance.
2.  **LOCAL_DEV Bypass Security**: The bypass check must be restricted by checking `c.env.ENVIRONMENT === 'local'` and explicitly blocking the `X-Local-Admin-Email` header in non-local environments.
3.  **Admin Write Routes**: The `requireRole` middleware must be added to all write/mutation routes for Categories, Products, Customers, Settings, and Coupons (Promotions) to enforce RBAC.

---

## 5. Verification Method
1.  **Compile Checks**: After applying changes, run:
    ```bash
    pnpm --filter admin-api exec tsc --noEmit
    pnpm --filter public-api exec tsc --noEmit
    ```
    Verify that TS2339 errors for `productReviews` and `wishlists` are completely resolved.
2.  **Unit Tests**: Run:
    ```bash
    pnpm --filter admin-api test
    ```
    to ensure the middleware changes do not break existing routes.
3.  **Security Integration Test**: Query the admin API on a local mock server with `ENVIRONMENT = 'production'` and `LOCAL_DEV = 'true'` using header `X-Local-Admin-Email: admin@local.dev` and confirm it returns `403 Access Denied` instead of bypassing Zero Trust.
