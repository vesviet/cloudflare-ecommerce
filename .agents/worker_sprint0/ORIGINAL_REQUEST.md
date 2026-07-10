## 2026-07-07T14:43:40Z

You are teamwork_preview_worker. Your working directory is /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/worker_sprint0/.
Your task is to implement the Sprint 0 remediation plan for cloudflare-ecommerce.
Please read the following analysis reports before writing any code:
- Explorer 1 Report (Promotions & Coupons): /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/teamwork_preview_explorer_m1_1/analysis.md
- Explorer 2 Report (RMA & Fulfillment): /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/teamwork_preview_explorer_m1_2/analysis.md
- Explorer 3 Report (Reviews/Wishlist & Security): /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/teamwork_preview_explorer_m1_3/analysis.md

Implement the following slices:
1. SL-01 (Promotions & Coupons):
   - Refactor apps/admin-api/src/routes/coupons.ts, apps/admin-api/src/middleware/audit.ts, apps/admin-api/src/routes/orders.ts, packages/core-services/src/order.repository.ts, and packages/core-services/src/order.service.ts to use schema.promotions, schema.auditLogs, and orders.applied_promotions_json instead of dropped tables.
   - In apps/public-api/src/index.ts, fix the missing `and` operator import from drizzle-orm.

2. SL-02 (RMA & Clean Architecture):
   - Refactor apps/public-api/src/routes/rma.ts and packages/core-services/src/rma.service.ts to use the return, returnItems, and refunds tables.
   - Ensure the rma controller delegates all DB/Stripe operations to RmaService, and unify order status checks to 'completed' or 'delivered'.

3. SL-03 (Fulfillment):
   - Refactor packages/core-services/src/fulfillment.service.ts to use shipments and shipmentItems tables.
   - Refactor apps/admin-api/src/routes/orders.ts fulfill route to call FulfillmentService.createFulfillment instead of raw database inserts.

4. SL-04 (Misc Compilation / Reviews & Wishlist):
   - Refactor packages/core-services/src/wishlist.service.ts to store/retrieve wishlist items in customer.metafields_json (key "wishlist", array of product IDs) to avoid modifying packages/database/src/schema.ts.
   - Refactor apps/public-api/src/routes/reviews.ts to store/retrieve reviews in cmsEntries with type = 'review' and placement = product_id.

5. SL-05 (Security: RBAC & LOCAL_DEV Auth Bypass):
   - In apps/admin-api/src/middleware/auth.ts, restrict LOCAL_DEV bypass to local sandbox only (ENVIRONMENT === 'local' check) and reject X-Local-Admin-Email header otherwise.
   - Enforce requireRole middleware on admin write routes in Categories, Products, Customers creation, Settings, and Coupons (Promotions).

After completing implementations, run builds and tests using pnpm in the workspace root to verify zero compile errors and zero regression. Report the exact build/test output in your handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
