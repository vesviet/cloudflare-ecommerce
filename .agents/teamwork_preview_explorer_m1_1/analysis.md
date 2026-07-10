# Structured Analysis Report: SL-01 Promotions, Coupons & Order Repository Refactoring

## 📌 Summary of Core Findings
The Cloudflare Ecommerce codebase contains significant compilation and runtime issues due to a database schema overhaul (specifically migration `0010_cold_kid_colt.sql`), which dropped legacy tables (`coupons`, `couponAuditLog`, `couponCustomerUses`, `orderDiscounts`) in favor of standardized tables (`promotions`, `promotionRules`, `auditLogs`) and JSON-based columns (`orders.applied_promotions_json`). Additionally, a critical missing import of the `and` operator from `drizzle-orm` in the public API entrypoint prevents the hourly cron task from compiling.

---

## 🔍 File-by-File Code Analysis

### 1. `apps/admin-api/src/routes/coupons.ts`
This file is the CRUD route handler for the `/coupons` endpoint. It fails compilation because the schema elements it references have been dropped.
*   **Property 'coupons' does not exist** (Lines 23, 43, 62, 67, 70, 72, 73, 78, 81, 83, 94, 110, 123, 139, 143, 157, 160, 162, 167):
    *   *Reference:* `schema.coupons`
    *   *Issue:* The `coupons` table is dropped and must be replaced by `schema.promotions`.
*   **Property 'couponCustomerUses' does not exist** (Lines 98, 99):
    *   *Reference:* `schema.couponCustomerUses`
    *   *Issue:* Used to fetch the total count of times a coupon has been used. This is now tracked dynamically in `promotions.times_used` and should be retrieved from there.
*   **Legacy Fields in Logic:**
    *   `type`: Handled values `'percent'`, `'fixed'`, `'freeship'`.
    *   `is_active`: Status flag represented as `1` or `0`.
    *   `expires_at`, `max_uses`, `uses`, `description`, `created_by`, `starts_at`.

### 2. `apps/admin-api/src/middleware/audit.ts`
This middleware logs administrative actions for coupons/promotions.
*   **Property 'couponAuditLog' does not exist** (Line 24):
    *   *Reference:* `schema.couponAuditLog`
    *   *Issue:* The table `couponAuditLog` was dropped. It must be refactored to use the generic `schema.auditLogs` table.

### 3. `apps/admin-api/src/routes/orders.ts`
This route handler retrieves order details and manages fulfillment/refunds.
*   **Property 'orderDiscounts' and 'coupons' do not exist** (Lines 53-62):
    *   *Reference:* Joins `schema.orderDiscounts` with `schema.coupons`.
    *   *Issue:* Both tables are dropped. Applied discounts are now serialized in `orders.applied_promotions_json` and must be parsed from there.

### 4. `packages/core-services/src/order.repository.ts`
This repository handles creating and updating orders.
*   **Property 'orderDiscounts' does not exist** (Line 65):
    *   *Reference:* Inserts into `schema.orderDiscounts` when `discountAmount > 0`.
    *   *Issue:* The table `orderDiscounts` is dropped. Instead, the details must be saved in the `applied_promotions_json` column of the `orders` table insertion query.

---

## 🗄️ Database Mapping Strategy & Refactoring Plan

### 1. `promotions` Table Field Mapping
The legacy fields in `/coupons` routes must map to the new `promotions` table fields in `packages/database/src/schema.ts` as follows:

| Old Coupon Field / Logic | New Promotion Table Field | Type Mapping / Notes |
| :--- | :--- | :--- |
| `id` | `id` | `text` (UUIDv4) |
| `code` | `code` | `text` (Unique, Nullable for auto-applied rules) |
| `type` (`'percent'`, `'fixed'`, `'freeship'`) | `type` | `text` (Percentage mappings: `'percentage'`, `'fixed'`, `'free_shipping'`) |
| `value` | `value` | `real` |
| `min_order_amount` | `min_order_amount` | `integer` (Stored in cents) |
| `starts_at` | `starts_at` | `integer` (UNIX Timestamp) |
| `expires_at` | `ends_at` | `integer` (UNIX Timestamp) |
| `max_uses` | `usage_limit` | `integer` (Nullable) |
| `uses` | `times_used` | `integer` (Default: 0) |
| `is_active` (`1` / `0`) | `status` | `text` (`'active'` or `'disabled'`) |
| `description` | *Dropped* | No matching column exists in `promotions`. |
| `created_by` | *Dropped* | No matching column exists in `promotions`. |

*Refactoring Action for CRUD:*
- In `POST /coupons/` and `PUT /coupons/:id`, translate the incoming payload fields (like `is_active` to `status`, `expires_at` to `ends_at`, and `type` values) to their new equivalents. Ignore or drop `description` and `created_by` properties since they do not exist in the new database schema.

---

### 2. `promotionRules` Integration
The new `promotionRules` table enables mapping promotions to specific collections, categories, or products.
*   **Schema Fields:**
    - `id`: `text` (UUID)
    - `promotion_id`: `text` (References `promotions.id`)
    - `target_type`: `text` (`'collection'`, `'category'`, `'product'`)
    - `target_id`: `text` (Target table primary key)
*   **Refactoring Action:**
    - To support fine-grained rules in the admin UI, add `promotionRules` relation mapping and allow the UI to attach target collections/categories/products to a promotion ID.

---

### 3. `auditLogs` Generic Mapping
To refactor the audit middleware without the `couponAuditLog` table:
*   Use `schema.auditLogs` table:
    *   `id`: `crypto.randomUUID()`
    *   `admin_id`: `user?.id || 'system'`
    *   `action`: `auditData.action`
    *   `entity_type`: `'promotion'`
    *   `entity_id`: `auditData.coupon_id`
    *   `payload_json`: `JSON.stringify({ diff_json: auditData.diff_json, ip_address: ipAddress })`

---

### 4. Order Discounts & Order Service Reversion
*   **Order Creation (`order.repository.ts`):**
    Remove the insert block to `schema.orderDiscounts` and instead add `applied_promotions_json` to `schema.orders` values:
    ```typescript
    applied_promotions_json: orderData.appliedCouponId ? JSON.stringify([{
      id: crypto.randomUUID(),
      promotion_id: orderData.appliedCouponId,
      discount_amount: orderData.discountAmount,
      code: "" // can be populated if coupon code is known in context
    }]) : '[]'
    ```
*   **Order Details Retrieval (`orders.ts`):**
    Parse the `applied_promotions_json` column from the retrieved order record:
    ```typescript
    const appliedPromotions = order.applied_promotions_json 
      ? JSON.parse(order.applied_promotions_json) 
      : [];
    const discounts = appliedPromotions.map((p: any) => ({
      id: p.id || p.promotion_id,
      coupon_id: p.promotion_id || p.id,
      discount_amount: p.discount_amount,
      coupon_code: p.code || "",
    }));
    ```
*   **Order Cancellation/Refund (`order.service.ts`):**
    In `packages/core-services/src/order.service.ts`, the code references `order.applied_coupon_id` (Lines 108, 142) which is missing from `schema.orders`. This should be replaced by reading `order.applied_promotions_json` and retrieving the `promotion_id` from the parsed array:
    ```typescript
    const promotions = order.applied_promotions_json ? JSON.parse(order.applied_promotions_json) : [];
    const appliedPromotionId = promotions[0]?.promotion_id || null;
    if (appliedPromotionId) {
      await drizzleDb.update(schema.promotions)
        .set({ times_used: drizzleSql`times_used - 1` })
        .where(and(eq(schema.promotions.id, appliedPromotionId), drizzleSql`times_used > 0`))
        .run();
    }
    ```

---

## ⚡ Cart Cleanup Cron Import Fix

### 1. The Issue
In `apps/public-api/src/index.ts` (Line 328), the hourly cron checks for abandoned carts and calls the `and(...)` operator:
```typescript
      const abandonedCarts = await db
        .select({
          id: schema.carts.id,
          customer_id: schema.carts.customer_id
        })
        .from(schema.carts)
        .where(
          and( // <--- Causes ReferenceError: and is not defined
            eq(schema.carts.status, 'active'),
            sql`${schema.carts.last_active_at} < ${twoHoursAgoSeconds}`,
            sql`${schema.carts.abandoned_email_sent_at} IS NULL`,
            sql`${schema.carts.customer_id} IS NOT NULL`
          )
        )
```
The file does not import `and` from `drizzle-orm` at the top of the file:
```typescript
import { eq, sql } from 'drizzle-orm' // Line 4
```

### 2. The Proposed Fix
Modify the imports at line 4 of `apps/public-api/src/index.ts` to include `and`:
```typescript
// Proposed Change
import { eq, sql, and } from 'drizzle-orm'
```
This is a straightforward, non-breaking compilation fix.
