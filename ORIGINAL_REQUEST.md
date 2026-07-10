# Original User Request

## Initial Request — 2026-07-07T14:39:00Z

Vai trò **Backend Developer** sẽ thực thi toàn bộ Sprint 0 từ remediation plan: refactor tất cả code references đến deleted database tables (sau migration `0010_cold_kid_colt.sql`), enforce RBAC guards trên admin write routes, và block `LOCAL_DEV` auth bypass trong production. Mục tiêu: `pnpm build` pass với zero compilation errors và platform unblocked cho Sprint 1.

Working directory: /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce

Integrity mode: development

---

## Reference Documents (đọc trước khi bắt đầu)

- `plan/remediation-plan.md` — Sprint 0 delivery slices (SL-01 đến SL-05), đọc toàn bộ
- `plan/ba-audit-report.md` — Section 1 (Executive Summary) và Section 3 (Per-Domain Analysis)
- `packages/database/src/schema.ts` — Source of truth cho tất cả table names sau migration

---

## Requirements

### R1. Fix Compilation: Promotions & Coupons Module (SL-01)
Refactor tất cả files tham chiếu đến deleted tables `schema.coupons`, `schema.couponAuditLog`, `schema.couponCustomerUses`, và `schema.orderDiscounts` để sử dụng các tables mới trong schema. Affected files: `apps/admin-api/src/routes/coupons.ts`, `apps/admin-api/src/middleware/audit.ts`, `apps/admin-api/src/routes/orders.ts`, `packages/core-services/src/order.repository.ts`.

### R2. Fix Compilation: RMA, Fulfillment & Misc Modules (SL-02, SL-03, SL-04)
Refactor tất cả files tham chiếu đến deleted tables:
- `schema.rmaRequests` → new returns/refunds tables: `apps/public-api/src/routes/rma.ts`, `packages/core-services/src/rma.service.ts`. Quan trọng: route controller phải delegate qua `RmaService` thay vì raw D1 queries. Unify order status validation logic giữa controller và service.
- `schema.fulfillments`, `schema.fulfillmentItems` → `schema.shipments`, `schema.shipmentItems`: `packages/core-services/src/fulfillment.service.ts`
- `schema.productReviews` → new reviews table: `apps/public-api/src/routes/reviews.ts`
- `schema.wishlists` → new schema (hoặc deprecate nếu không có table thay thế): `packages/core-services/src/wishlist.service.ts`
- Fix missing `import { and }` trong `apps/public-api/src/index.ts` to unblock cart cleanup cron

### R3. Fix Security: RBAC & Auth Bypass (SL-05)
Enforce role-based access control trên tất cả admin write routes hiện đang thiếu `requireRole` middleware (Categories, Settings, Customer creation, Products, Promotions). Block `LOCAL_DEV=true` header bypass trong production environment — chỉ cho phép bypass trong local sandbox. Không break các routes đã có `requireRole`.

---

## Acceptance Criteria

### Build Gate (Primary)
- [ ] `pnpm build` (hoặc `turbo run build`) chạy thành công với **zero TypeScript compilation errors** trong toàn bộ monorepo
- [ ] Không có runtime reference đến bất kỳ deleted table nào: `coupons`, `couponAuditLog`, `couponCustomerUses`, `orderDiscounts`, `rmaRequests`, `fulfillments`, `fulfillmentItems`, `productReviews`, `wishlists`
- [ ] `apps/public-api/src/index.ts` import `and` từ `drizzle-orm` — verify bằng grep

### RMA Clean Architecture
- [ ] `apps/public-api/src/routes/rma.ts` không còn direct D1 queries — tất cả operations đi qua `RmaService`
- [ ] Order status validation logic thống nhất giữa controller và `RmaService` (cùng accept `completed` hoặc `delivered`)

### Security Gate
- [ ] Các admin write routes sau có `requireRole` middleware: Categories (create/update/delete), Settings (update), Customers (create), Products (create/update/delete), Promotions/Coupons (create/update/delete)
- [ ] `LOCAL_DEV` bypass: request với `X-Local-Admin-Email` header phải return `401 Unauthorized` khi `ENVIRONMENT !== 'local'` (hoặc equivalent production check)
- [ ] Không có `requireRole` nào bị remove từ routes đã có sẵn

### No Regression
- [ ] Existing tests vẫn pass: `pnpm test` (hoặc `turbo run test`) không có new failures
- [ ] `plan/technical-delivery-plan.json` và `plan/remediation-plan.md` không bị modify
- [ ] `packages/database/src/schema.ts` không bị modify — chỉ refactor application layer
