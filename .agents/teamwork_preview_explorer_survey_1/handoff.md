# Handoff Report: Backend APIs & Database Requirements Investigation

**Agent**: teamwork_preview_explorer survey_explorer_1  
**Directory**: `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_1`  
**Date**: 2026-08-07  

---

## 1. Observation

### A. Public API GET /:slug Query Flow (`apps/public-api/src/routes/landing-pages.ts`)
Lines 48–126 handle `GET /api/landing-pages/:slug`:
- **Line 52**: `data = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).get();`
- **Lines 60–63**:
  ```ts
  productData = await db.select().from(schema.products).where(eq(schema.products.id, data.product_id)).get();
  variantsData = await db.select().from(schema.products).where(eq(schema.products.parent_id, data.product_id)).all();
  const priceRow = await db.select({ price: schema.priceListItems.price }).from(schema.priceListItems).where(eq(schema.priceListItems.product_id, data.product_id)).get();
  ```
  *Observation*: These 3 queries run sequentially after the landing page record is fetched.
- **Lines 67–93**:
  ```ts
  const stockedIds = variantsData.length > 0 ? variantsData.map(v => v.id) : [data.product_id];
  const stockRows = await db.select(...).from(schema.inventoryLevels)...all();
  const assetRows = await db.select(...).from(schema.productAssets)...all();
  ```
  *Observation*: `stockRows` and `assetRows` also run sequentially after `stockedIds` is constructed.

### B. Admin API Slug Validation (`apps/admin-api/src/routes/landing-pages.ts`)
- **Line 2**: Currently imports `import { eq, sql } from 'drizzle-orm';`
- **Lines 53–116**: `POST /landing-pages` parses the request body and directly executes `db.insert(schema.landingPages).values(...)` at line 93 without checking if `body.slug` already exists.
- **Lines 118–180**: `PUT /landing-pages/:id` parses the request body and directly executes `db.update(schema.landingPages).set(...)` at line 159 without checking if `body.slug` is used by another landing page (`id != currentId`).
- **Catch Blocks (lines 39, 113, 177)**: `catch (err: any)` returns `c.json({ success: false, error: err.message }, 500)`. Duplicate slug attempts trigger D1 SQLite `UNIQUE constraint failed: landing_pages.slug`, resulting in an unhandled HTTP 500 error instead of a friendly HTTP 409 Conflict.

### C. Database Schema (`packages/database/src/schema.ts`)
- **Lines 490–510**: Definition of `landingPages` table:
  ```ts
  export const landingPages = sqliteTable('landing_pages', {
    id: text('id').primaryKey(),
    title: text('title').notNull().default(''),
    slug: text('slug').notNull().unique(),
    product_id: text('product_id').references(() => products.id),
    ...
  });
  ```
  *Observation*: The `slug` column is defined with `.notNull().unique()`. The database constraint already exists; only the API-level validation and 409 response handling are missing in `apps/admin-api/src/routes/landing-pages.ts`.

### D. Unit & Integration Tests Execution
Tested using local repository workspace commands:
- **`pnpm --filter public-api test`**: Exited with code 0. **59 passed** across 9 test files (including `landing-pages.test.ts`, `reviews.test.ts`, `scheduled.test.ts`).
- **`pnpm --filter @ecommerce/core-services test`**: Exited with code 0. **115 passed** across 12 test files (including `order.service.test.ts`, `inventory.test.ts`, `catalog.test.ts`).
- **`pnpm --filter admin-api test`**: Exited with code 0. **36 passed** across 6 test files.

---

## 2. Logic Chain

1. **Query Parallelization in `public-api` (Requirement R5)**:
   - *Observation*: Lines 60, 61, and 63 execute 3 independent D1 reads sequentially for `productData`, `variantsData`, and `priceRow`.
   - *Reasoning*: All three queries require only `data.product_id` which is known after step 1. Wrapping them in `Promise.all([ ... ])` allows D1/SQLite driver to issue them concurrently.
   - *Further Optimization*: After `variantsData` resolves, `stockedIds` is calculated. Then `stockRows` and `assetRows` can also be run in parallel using a second `Promise.all([ ... ])`.
   - *Result*: Overall latency is reduced from 6 sequential DB roundtrips down to 3 phased stages (Stage 1: LP by slug -> Stage 2: Parallel fetch of product, variants, price -> Stage 3: Parallel fetch of inventory stock and product assets).

2. **Edge Case Analysis for `GET /:slug`**:
   - *Missing `product_id`*: `data.product_id` is null/undefined. The `if (data.product_id)` block is bypassed completely, returning `{ success: true, data: { ...data, product: null, variants: [] } }`.
   - *Missing Product Record*: `data.product_id` is set but does not exist in `products` table. `productRes` evaluates to `undefined`, handled by `if (productData) { ... }` guard without crashing.
   - *Missing Price Row*: `priceRow` is `undefined`. `productPrice` evaluates to `null`.
   - *Missing Variants*: `variantsData` is empty array `[]`. `stockedIds` falls back to `[data.product_id]`.
   - *Missing Stock / Assets*: Empty arrays returned, maps default to `0` stock and `[]` images.

3. **Slug Uniqueness Validation in `admin-api` (Requirement R4)**:
   - *Observation*: POST and PUT routes currently attempt insert/update directly without prior check. D1 unique constraint violation produces HTTP 500 with raw error message.
   - *Reasoning*: Standard REST API best practices require validating resource uniqueness beforehand and returning `409 Conflict` with JSON payload `{ success: false, error: 'A landing page with this slug already exists' }`.
   - *Implementation Plan*:
     - **POST**: `const existing = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, body.slug)).get();` -> if `existing` return 409.
     - **PUT**: `const existing = await db.select().from(schema.landingPages).where(and(eq(schema.landingPages.slug, body.slug), ne(schema.landingPages.id, id))).get();` -> if `existing` return 409.
     - Add `and` and `ne` imports to `import { and, eq, ne, sql } from 'drizzle-orm';` in `apps/admin-api/src/routes/landing-pages.ts`.

4. **Database Schema Stability**:
   - `landingPages.slug` already has `.notNull().unique()`. No D1 migrations or Drizzle schema changes in `packages/database/src/schema.ts` are necessary.

5. **Test Readiness**:
   - Existing unit tests for `public-api`, `admin-api`, and `@ecommerce/core-services` pass 100%.

---

## 3. Caveats

- **Database Migration**: No database schema migration needed (`schema.ts` already contains `.notNull().unique()`).
- **Race Condition Safety Net**: Pre-checking slug existence in `admin-api` application code handles 99.9% of user requests cleanly with HTTP 409. If a rare race condition occurs during concurrent POSTs, the D1 UNIQUE constraint will catch it at the DB level.
- **Test Package Filtering**: Note that `apps/public-api` is named `"public-api"` in `package.json`, `apps/admin-api` is named `"admin-api"`, while `@ecommerce/core-services` is named `"@ecommerce/core-services"`. Commands must use correct package filter names.

---

## 4. Conclusion

- `apps/public-api/src/routes/landing-pages.ts` can be cleanly refactored to use `Promise.all` for parallelizing product, variants, and price queries, followed by parallelizing stock levels and product assets queries.
- `apps/admin-api/src/routes/landing-pages.ts` requires adding pre-write slug check queries on POST and PUT returning HTTP status 409 with error `{ success: false, error: 'A landing page with this slug already exists' }`.
- Exact proposed code changes have been generated in `proposed_backend_changes.patch` in this working directory.

---

## 5. Verification Method

1. **Verify `public-api` tests**:
   ```bash
   pnpm --filter public-api test
   ```
   Expect: All tests pass (10/10 in `landing-pages.test.ts`, 59/59 total).

2. **Verify `@ecommerce/core-services` tests**:
   ```bash
   pnpm --filter @ecommerce/core-services test
   ```
   Expect: All tests pass (115/115 total across 12 test files).

3. **Verify `admin-api` tests**:
   ```bash
   pnpm --filter admin-api test
   ```
   Expect: All tests pass (36/36 total across 6 test files).

4. **Patch Verification**:
   Inspect `proposed_backend_changes.patch` in `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_explorer_survey_1\proposed_backend_changes.patch`.
