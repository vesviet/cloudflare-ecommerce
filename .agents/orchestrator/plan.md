# Project: Cloudflare E-Commerce Sprint 0 Remediation

## Architecture
Monorepo consisting of:
- `apps/admin-api` (Hono, Admin routes)
- `apps/public-api` (Hono, Public/Customer routes)
- `packages/core-services` (Core service logic, database adapters, repositories using Drizzle ORM)
- `packages/database` (Drizzle schemas, migrations)

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Run code search / lint to locate all errors; propose exact mappings | None | DONE (0065ea7a, 33d6d0d7, afb5b2a3) |
| 2 | SL-01: Promotions & Coupons | Refactor all files targeting `coupons`, `couponAuditLog`, `couponCustomerUses`, `orderDiscounts` | M1 | DONE |
| 3 | SL-02: RMA & Clean Architecture | Refactor RMA logic to use `returns`, `returnItems`, `refunds`. Delegate controller logic to `RmaService` and unify order status checks | M1 | DONE |
| 4 | SL-03: Fulfillment | Refactor fulfillment service/routes to use `shipments` and `shipmentItems` | M1 | DONE |
| 5 | SL-04: Misc Build & Cron Fixes | Fix wishlist service, product reviews route, cart cleanup import `and` from `drizzle-orm` | M2 | DONE |
| 6 | SL-05: RBAC & Auth Bypass Lockout | Secure admin write routes and block `LOCAL_DEV` header bypass in non-local environments | M1 | DONE |
| 7 | Global Build & Test Gate | Verify `pnpm build` passes monorepo-wide and all tests run cleanly with zero regressions | M2, M3, M4, M5, M6 | DONE |

## Interface Contracts & Mapping Strategy
- **Promotions & Coupons (SL-01)**:
  - Map `schema.coupons` references to `schema.promotions`
  - Map `schema.couponAuditLog` to generic `schema.auditLogs`
  - Replace `schema.orderDiscounts` with serialised JSON inside `orders.applied_promotions_json`
  - Fix missing `and` operator import in `apps/public-api/src/index.ts`
- **RMA & Clean Architecture (SL-02)**:
  - Map `schema.rmaRequests` to `schema.returns`, `schema.returnItems`, and `schema.refunds`
  - Thin controller `apps/public-api/src/routes/rma.ts` delegates all DB, validation, and Stripe calls to `RmaService.createReturnRequest`
  - Unify order eligibility status check to `'completed'` or `'delivered'`
- **Fulfillment (SL-03)**:
  - Map `schema.fulfillments` and `schema.fulfillmentItems` to `schema.shipments` and `schema.shipmentItems`
  - Refactor `apps/admin-api/src/routes/orders.ts` `/orders/:id/fulfill` to delegate to `FulfillmentService.createFulfillment`
- **Reviews & Wishlists (SL-04)**:
  - Refactor `WishlistService` to store/retrieve wishlist items in `customers.metafields_json` (under key `"wishlist"` as an array of product IDs)
  - Refactor `reviews.ts` to store/retrieve reviews in `cmsEntries` table with `type = 'review'` and `placement = product_id`
- **Security Guards (SL-05)**:
  - Secure `X-Local-Admin-Email` bypass in `apps/admin-api/src/middleware/auth.ts` by checking `c.env.ENVIRONMENT === 'local'`
  - Enforce `requireRole` middleware on admin write routes (Categories, Settings, Customers creation, Products, Coupons/Promotions)

