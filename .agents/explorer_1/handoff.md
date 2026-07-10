# Handoff Report - BA Audit Planning Analysis

## 1. Observation
*   **Compilation Failure / Missing Tables**:
    *   In `/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database/migrations/0010_cold_kid_colt.sql`, the following lines were executed:
        ```sql
        DROP TABLE `coupon_audit_log`;--> statement-breakpoint
        DROP TABLE `coupon_customer_uses`;--> statement-breakpoint
        DROP TABLE `coupons`;--> statement-breakpoint
        DROP TABLE `fulfillment_items`;--> statement-breakpoint
        DROP TABLE `fulfillments`;--> statement-breakpoint
        DROP TABLE `order_discounts`;--> statement-breakpoint
        DROP TABLE `product_reviews`;--> statement-breakpoint
        DROP TABLE `rma_requests`;--> statement-breakpoint
        DROP TABLE `wishlists`;--> statement-breakpoint
        ```
    *   In `/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/apps/admin-api/src/routes/coupons.ts` (Line 23):
        ```typescript
        const existing = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code)).get();
        ```
        This references the dropped table, causing direct compilation failure.
    *   Similar references exist in `audit.ts`, `rma.service.ts`, `rma.ts`, `fulfillment.service.ts`, `order.repository.ts`, `orders.ts`, `reviews.ts`, and `wishlist.service.ts`.
*   **Inventory location_id omission**:
    *   In `/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/core-services/src/inventory.service.ts` (Lines 170-179):
        ```typescript
        db.update(schema.inventoryLevels)
          .set({
            stock_quantity: sql`stock_quantity - ${item.quantity}`,
            updated_at: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(schema.inventoryLevels.product_id, item.product_id),
              sql`stock_quantity >= ${item.quantity}` // guard against going negative
            )
          )
        ```
        This update query lacks `schema.inventoryLevels.location_id` in its `where` clause.
*   **Cron trigger ReferenceError**:
    *   The 5-minute cron job in `apps/public-api/src/index.ts` uses the `and` operator in a Drizzle query but does not import it, leading to a `ReferenceError` at runtime.
*   **Zero Trust Bypass**:
    *   In `apps/admin-api/src/index.ts`, when `LOCAL_DEV=true` is set, a spoofed `X-Local-Admin-Email` header completely bypasses authentication checkouts.
*   **Execution QA Tasks**:
    *   In `/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/plan/execution-tasks.md` (Lines 43-47):
        ```markdown
        - [ ] **Phase 7: QA & Testing (QA)**
          - [ ] Load Test (Overselling): Dùng k6/Artillery giả lập 1,000 request/giây thanh toán cùng 1 sản phẩm.
          - [ ] Security Test (IDOR): Lấy guest token user A đi xem Order ID user B.
          - [ ] Stripe Mock Test: Gửi webhook giả lập lỗi/trùng lặp qua Stripe CLI.
        ```

## 2. Logic Chain
1.  **Dropped Table References**: The migration SQL dropped 9 tables (Observation 1), but those tables are still referenced in route controllers and services (Observation 2). Therefore, the application code fails to compile and cannot run.
2.  **Inventory Omission**: The update statements for inventory deductions and restocking lack `location_id` in the query filters (Observation 3). Therefore, when a product is stocked in multiple locations, Drizzle updates all rows matching the `product_id`, corrupting the stock levels.
3.  **Authentication and Role Security**: Low-privilege admin roles have access to state-changing write routes because no role validation is enforced on specific routes (Observation 4). Spoofed email headers bypass Zero Trust when `LOCAL_DEV` is true. Thus, a production environment is vulnerable to unauthorized administrative operations and credential spoofing.
4.  **Race Conditions**: Payment webhook success updates the order status only if it is `pending_payment`. Since the cancel cron cancels orders in 15 minutes, late Stripe webhooks bypass this check, leaving orders cancelled, inventory restocked, and customer cards charged.
5.  **Durable Object Decoupling**: Checkouts check and write stock inside the Durable Object's SQLite instance, while the catalog reads from D1. Since there is no synchronization back to D1, the storefront displays stale stock.
6.  **Actionable Remediation**: Grouping these items into a PM Prioritization Brief, a 9-slice Technical Delivery Plan (resolving P0s in Sprint 0 and P1s in Sprint 1), adding them to the Debt Register, and defining a strict Phase 7 QA-based DoD is required to systematically resolve all platform blocks.

## 3. Caveats
*   This audit was conducted as a read-only investigation. No local builds were compiled, and no database sandboxes were run.
*   It is assumed that the new schemas (such as `promotions`, `returns`, `shipments`) are physically present and correct in the migrated database, and only the application layer requires refactoring. If the migration failed or needs alterations, database schemas must be updated.

## 4. Conclusion
The Aura Store platform is currently unbuildable and insecure due to missing database tables and lack of authentication roles. Shipping in this state would lead to immediate checkout failures, data corruption in multi-location warehouses, and security breaches. Unblocking the platform requires executing the 9 delivery slices detailed in `analysis.md` and passing the Phase 7 QA tests.

## 5. Verification Method
*   **Compile Test**: Run `pnpm build` in the root folder of the workspace. If compilation succeeds, references to deleted tables have been successfully refactored.
*   **Audit Check**: Run grep searches for references to `schema.coupons`, `schema.rmaRequests`, `schema.fulfillments`, `schema.orderDiscounts`, `schema.productReviews`, or `schema.wishlists`. If zero occurrences are returned, compilation debt is repaid.
*   **Database Query Verification**: Inspect `/packages/core-services/src/inventory.service.ts` to verify that `locationId` (or equivalent context parameter) is included in `eq(schema.inventoryLevels.location_id, locationId)` filters inside both `getCommitDeductionQueries` and `getRestockQueries`.
*   **QA Run**: Execute the Phase 7 QA tasks (Overselling Load Test, IDOR Security Test, Stripe Mock Webhook Test) and verify all checks pass successfully.
