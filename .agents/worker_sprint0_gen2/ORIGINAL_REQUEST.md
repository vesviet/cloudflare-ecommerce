## 2026-07-08T11:32:52Z
You are teamwork_preview_worker. Your working directory is /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/worker_sprint0_gen2/.
Your task is to fix the Victory Auditor Gen 2 rejection by re-refactoring the application layer to use the new database tables and columns at runtime while keeping packages/database/src/schema.ts completely pristine.

Follow these steps exactly:
1. Ensure packages/database/src/schema.ts is reverted to its original HEAD state (100% clean and unmodified).
2. Create a local schema file at packages/core-services/src/local-schema.ts that defines the new and extended Drizzle schemas for the SQLite D1 database. This file must define:
   - Extended tables mapping to existing SQLite tables but including the new columns:
     * `customers` table including `loyalty_points_balance`
     * `carts` table including `discount_amount`, `applied_promotions_json`, `last_active_at`, `abandoned_email_sent_at`
     * `orders` table including `discount_amount`, `tax_amount`, `shipping_fee`, `applied_promotions_json`, `utm_source`, `utm_medium`, `utm_campaign`, `shipping_lines_json`, `tax_lines_json`
   - New tables matching migration 0010:
     * `promotions`
     * `promotionRules`
     * `shipments`
     * `shipmentItems`
     * `returns`
     * `returnItems`
     * `refunds`
     * `loyaltyLedgers`
3. Export these definitions from `@ecommerce/core-services` (e.g., via packages/core-services/src/index.ts) so that Hono apps and repositories can import them.
4. Refactor the application layer to use these new table definitions at runtime:
   - **Promotions & Coupons**: Refactor coupon management and order route files in apps/admin-api/src/routes/coupons.ts, apps/admin-api/src/middleware/audit.ts, apps/admin-api/src/routes/orders.ts, and packages/core-services/src/order.repository.ts/service.ts to use `promotions` and `promotionRules` from localSchema and write serialized coupon allocations to `applied_promotions_json`.
   - **RMA**: Refactor public API RMA routes (apps/public-api/src/routes/rma.ts) and packages/core-services/src/rma.service.ts to use `returns`, `returnItems`, and `refunds` from localSchema. Ensure it delegates D1 and Stripe actions to RmaService, and unifies status checks tocompleted/delivered.
   - **Fulfillment**: Refactor packages/core-services/src/fulfillment.service.ts and related admin order routes to use `shipments` and `shipmentItems`.
   - **Wishlists & Reviews**: Refactor WishlistService to use `customers.metafields_json` (key "wishlist", array of product IDs) and reviews.ts to use `cmsEntries` (type = 'review', placement = product_id) to match the runtime database schema (as wishlists and productReviews tables do not exist in D1).
   - **Loyalty Program**: Refactor loyalty points and ledger entries to use `loyaltyLedgers` (from localSchema) and updates to `customers.loyalty_points_balance`.
5. Fix the authentication middleware in apps/admin-api/src/middleware/auth.ts:
   - If the request includes the `X-Local-Admin-Email` header but ENVIRONMENT !== 'local', return `401 Unauthorized` instead of `403 Forbidden`.
6. Remove the self-certifying mock tests in packages/core-services/src/__tests__/checkout_hardening.test.ts (you can delete the file completely).
7. Run `pnpm build` and `pnpm -r test` in the workspace root to check that it compiles without error and all 116 tests pass cleanly.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
