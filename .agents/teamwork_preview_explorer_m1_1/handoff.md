# Handoff Report: Promotions, Coupons & Order Repository Analysis (Explorer 1)

This report details the compilation and refactoring requirements for SL-01 (Promotions & Coupons) and the order references/repository.

---

## 1. Observation

### A. Dropped Table References in compilation
Running `npx tsc --noEmit` in `apps/admin-api` and `apps/public-api` returned the following exact compilation errors (verbatim excerpts):

*   **`apps/admin-api/src/routes/coupons.ts` errors:**
    *   Line 23: `error TS2339: Property 'coupons' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`
    *   Line 98: `error TS2339: Property 'couponCustomerUses' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`
*   **`apps/admin-api/src/middleware/audit.ts` error:**
    *   Line 24: `error TS2339: Property 'couponAuditLog' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`
*   **`apps/admin-api/src/routes/orders.ts` errors:**
    *   Line 54: `error TS2339: Property 'orderDiscounts' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`
    *   Line 57: `error TS2339: Property 'coupons' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`
*   **`packages/core-services/src/order.repository.ts` error:**
    *   Line 65: `error TS2339: Property 'orderDiscounts' does not exist on type 'typeof import("@ecommerce/database/src/schema")'.`

### B. Missing `and` Operator Cron Issue
Running `npx tsc --noEmit` in `apps/public-api` returned:
*   `src/index.ts(328,11): error TS2304: Cannot find name 'and'.`
Inside `apps/public-api/src/index.ts` (Line 4), the import statement is:
```typescript
import { eq, sql } from 'drizzle-orm'
```
However, the hourly cron uses the `and` operator (Line 328) inside:
```typescript
      const abandonedCarts = await db
        .select({
          id: schema.carts.id,
          customer_id: schema.carts.customer_id
        })
        .from(schema.carts)
        .where(
          and(
            eq(schema.carts.status, 'active'),
            ...
```

### C. Drizzle Schema Comparison
Inspecting `packages/database/src/schema.ts` (Lines 377–399) confirms that `promotions` and `promotionRules` exist, but `coupons`, `couponAuditLog`, `couponCustomerUses`, and `orderDiscounts` are completely missing.

---

## 2. Logic Chain

1.  **D1/Drizzle Schema Overhaul**: The database schema snapshot shows the legacy tables (`coupons`, `couponAuditLog`, `couponCustomerUses`, `orderDiscounts`) were replaced by the newly designed `promotions` and `promotionRules` tables, and the `applied_promotions_json` column on the `orders` and `carts` tables (as verified by *Observation C*).
2.  **Compilation Failures**: Code in the API routes (`coupons.ts`, `orders.ts`, `audit.ts`) and core repository (`order.repository.ts`) still imports and queries the deleted properties on the `@ecommerce/database` schema, leading to the TypeScript type-checking errors in *Observation A*.
3.  **Missing DB Columns**: The codebase tries to access properties such as `order.applied_coupon_id` in `order.service.ts` which are not present in the new `orders` schema (which has `applied_promotions_json` instead). Due to the `drizzleDb` parameter being typed as `any`, TypeScript did not warn about this, but it will fail at runtime.
4.  **Implicit `and` Error**: In the `public-api` worker, the hourly cron job attempts to invoke `and()` to filter abandoned carts, but fails to import this operator, causing compile-time and runtime failures (as verified by *Observation B*).

---

## 3. Caveats

*   We assumed the schema in `packages/database/src/schema.ts` is fixed and should not be modified, meaning the missing legacy fields like `description` and `created_by` in the `promotions` table will be permanently dropped in the refactor.
*   We did not test the actual database migration behavior or write seed data for the promotions table.

---

## 4. Conclusion

The application fails to compile because the codebase has not been updated to align with the new schema in migration `0010_cold_kid_colt.sql`.
*   The `/coupons` routes and audit middleware must be mapped to use `schema.promotions` and the generic `schema.auditLogs` table.
*   `orderDiscounts` table operations should be completely replaced by storing and reading serialized promotions JSON in `orders.applied_promotions_json`.
*   The missing `and` import in `public-api/src/index.ts` must be added to compile the hourly cron job.

---

## 5. Verification Method

*   **Clean Compile Check**:
    Run `npx tsc --noEmit` in both `apps/admin-api` and `apps/public-api` after implementing changes.
    *   *Invalidation Condition:* Any remaining `TS2339` errors for `coupons`, `orderDiscounts`, `couponAuditLog`, `couponCustomerUses`, or `TS2304` errors for `and`.
*   **Cron Execution**:
    Verify that the cron compiles and runs in wrangler local environment:
    ```bash
    pnpm --filter public-api dev
    ```

---

## 6. Remaining Work (Concrete Next Steps)

1.  **Refactor `apps/admin-api/src/routes/coupons.ts`**:
    - Update all database queries from `schema.coupons` to `schema.promotions`.
    - Map payload parameters: `type` (`'percent'` -> `'percentage'`, `'freeship'` -> `'free_shipping'`), `is_active` -> `status` (`'active'`/`'disabled'`), `expires_at` -> `ends_at`, `max_uses` -> `usage_limit`.
    - Replace the `couponCustomerUses` query with retrieving `times_used` directly from the `promotions` record.
2.  **Refactor `apps/admin-api/src/middleware/audit.ts`**:
    - Replace `schema.couponAuditLog` with `schema.auditLogs` insertion, setting `entity_type = 'promotion'` and encoding payload details in `payload_json`.
3.  **Refactor `apps/admin-api/src/routes/orders.ts`**:
    - Parse applied discounts from the order's `applied_promotions_json` column.
4.  **Refactor `packages/core-services/src/order.repository.ts`**:
    - Write serialized applied promotion details into the `applied_promotions_json` field when creating orders, instead of calling `schema.orderDiscounts`.
5.  **Refactor `packages/core-services/src/order.service.ts`**:
    - Replace references to `order.applied_coupon_id` with parsed promotions from `order.applied_promotions_json`.
6.  **Fix `apps/public-api/src/index.ts` import**:
    - Add `and` to `import { eq, sql } from 'drizzle-orm'`.
