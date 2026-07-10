## 2026-07-08T11:18:29Z
You are teamwork_preview_worker. Your working directory is /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/worker_sprint0_reversion/.
Your task is to fix the Victory Auditor rejection by reverting all changes in packages/database/src/schema.ts and refactoring the application layer to compile and work cleanly with the pristine schema.

Follow these steps exactly:
1. Revert packages/database/src/schema.ts to its original git HEAD state:
   Run `git checkout HEAD -- packages/database/src/schema.ts` (or `git restore packages/database/src/schema.ts`).
2. Verify that packages/database/src/schema.ts contains legacy tables like coupons, orderDiscounts, productReviews, wishlists, fulfillments, fulfillmentItems, and rmaRequests, and lacks new tables like promotions, returns, refunds, shipments, and loyaltyLedgers.
3. Refactor all application-layer code to interact ONLY with the legacy tables defined in the pristine schema.ts:
   - **Promotions & Coupons**: Refactor apps/admin-api/src/routes/coupons.ts, apps/admin-api/src/routes/orders.ts, packages/core-services/src/order.repository.ts, packages/core-services/src/order.service.ts, and packages/core-services/src/promotion.engine.ts to use `schema.coupons` and `schema.orderDiscounts`. Map fields: is_active (1/0), type (percent, fixed, freeship), max_uses, uses, expires_at, etc. If couponAuditLog was also dropped from the pristine schema, log to the generic `schema.auditLogs` (which exists in the pristine schema).
   - **RMA & Clean Architecture**: Refactor apps/public-api/src/routes/rma.ts and packages/core-services/src/rma.service.ts to use `schema.rmaRequests` table directly (statuses: 'requested', 'approved', 'refunded', 'rejected'). Keep the controller thin, delegating D1 and Stripe actions to RmaService. Unify status checks to 'completed' or 'delivered'.
   - **Fulfillment**: Refactor packages/core-services/src/fulfillment.service.ts to use `schema.fulfillments` and `schema.fulfillmentItems` tables (statuses: 'processing', 'shipped', 'delivered', 'cancelled', and carrier field). Refactor apps/admin-api/src/routes/orders.ts fulfill route to call FulfillmentService.
   - **Product Reviews & Wishlists**:
     - Refactor packages/core-services/src/wishlist.service.ts to query/insert/delete directly on `schema.wishlists` table.
     - Refactor apps/public-api/src/routes/reviews.ts to query/insert directly on `schema.productReviews` table.
   - **Loyalty Program**: Keep the dynamic mapping to metafields_json and cmsEntries for customer points and transactions.
   - **Security**: Maintain the requireRole middleware on write routes and block LOCAL_DEV auth bypass in non-local environments.

4. Run `pnpm build` and `pnpm -r test` in the workspace root to verify zero compile errors and ensure all 122 tests pass cleanly.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
