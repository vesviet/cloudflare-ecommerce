# Original User Request

## Initial Request — 2026-07-07T21:27:43Z

Dựa trên kết quả BA Audit của Aura Store (plan/ba-audit-report.md), đội **Product Manager + Technical Lead** cần tạo ra một kế hoạch remediation và delivery hoàn chỉnh: ưu tiên hóa theo business impact, phân rã thành delivery slices rõ ràng, và xuất plan có thể bàn giao ngay cho engineering team để fix các P0/P1 issues và unblock platform.

Working directory: /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce

Integrity mode: development

---

## Context (đọc trước khi bắt đầu)

**BA Audit Report**: `plan/ba-audit-report.md` — đọc toàn bộ file này, đây là input chính.

**Existing plans** (tham khảo, không override):
- `plan/technical-delivery-plan.json` — 14 slices MVP đã lên kế hoạch
- `plan/execution-tasks.md` — Phase 1–7 execution checklist (Phase 7 QA chưa xong)
- `plan/debt-register.json` — 4 DEBT items (đã resolved)

**Critical findings từ BA Audit** (summary để định hướng):
1. **P0 — Build broken**: 8 files reference deleted tables sau migration `0010` (coupons, rmaRequests, fulfillments, orderDiscounts, productReviews, wishlists, and couponAuditLog) → platform không compile
2. **P0 — RBAC bypass**: Admin write routes (Categories, Products, Settings, Coupons) thiếu `requireRole` middleware; `LOCAL_DEV` auth bypass nguy hiểm
3. **P0 — Inventory corruption**: `getCommitDeductionQueries` thiếu `location_id` filter → deduct tất cả locations
4. **P0 — DO data divergence**: `INVENTORY_DO` viết vào isolated SQLite, không sync về D1 → storefront hiển thị stock sai
5. **P1 — Cron crash**: Thiếu `import { and }` trong `public-api/index.ts` → cart cleanup cron không chạy
6. **P1 — Fulfillment state skip**: Fulfill route set `completed` trực tiếp, skip `shipped` state → carrier webhook broken
7. **P1 — Late payment race condition**: Cron cancel order, sau đó Stripe webhook arrive → order remain cancelled nhưng customer đã bị charge
8. **Clean arch violation**: `public-api/rma.ts` bypass `RmaService`, dùng raw D1 query với deleted schema

---

## Requirements

### R1. PM Prioritization Brief
Hoạt động ở vai trò **Product Manager cấp Principal**. Đọc `plan/ba-audit-report.md` và tạo một Product Brief ngắn gọn:
- Phân loại issues theo business impact: Revenue Loss vs Security Risk vs Operational Degradation vs UX Degradation
- Quyết định go/no-go cho từng nhóm: cái gì phải fix trước khi có bất kỳ new feature nào?
- Đề xuất release gates: "Platform cannot ship until X is resolved"
- Frame hypothesis cho mỗi fix: "Fixing [X] will prevent [Y business outcome loss]"
- Không cần design mới, chỉ prioritize và frame business outcome

### R2. Tech Lead Technical Delivery Plan
Hoạt động ở vai trò **Technical Lead cấp Principal**. Dựa trên BA Audit findings và PM brief (R1), tạo một Remediation Delivery Plan:
- Phân rã thành delivery slices ngắn gọn, có thứ tự dependency rõ ràng
- Mỗi slice: id, mô tả (what, not how), owner role, depends_on, estimated complexity (S/M/L), quality gate
- Ưu tiên P0 → P1 → P2; P0 phải là first sprint
- Cập nhật `plan/debt-register.json`: thêm tất cả P0/P1 issues mới phát hiện từ audit vào debt register (new DEBT items)
- Xác định impact radius và rollback strategy cho từng slice

### R3. Execution Roadmap
Tổng hợp tất cả thành file `plan/remediation-plan.md` bao gồm:
1. **PM Section**: Business impact summary, prioritization rationale, release gates
2. **Tech Lead Section**: Sprint 0 (P0 fixes) + Sprint 1 (P1 fixes) delivery slices
3. **Updated Debt Register summary**: Liệt kê các DEBT items mới từ audit
4. **Risk Register**: Top 3 risks nếu không fix trước khi ship
5. **Definition of Done**: Khi nào platform được coi là "unblocked"

---

## Acceptance Criteria

### PM Brief Quality
- [ ] Mỗi P0 issue có business impact statement (revenue/security/operational) cụ thể
- [ ] Release gate condition được phát biểu rõ ràng: "[Platform cannot go to production] until [specific condition]"
- [ ] Ít nhất 3 hypothesis được viết đúng format: "Given [evidence], fixing [X] will prevent [Y]"
- [ ] Không mention implementation details — chỉ business outcomes

### Tech Lead Plan Quality
- [ ] Ít nhất 8 delivery slices được định nghĩa (cover tất cả P0 + P1 issues)
- [ ] Mỗi slice có: id, description, owner_role, depends_on, complexity (S/M/L), quality_gate
- [ ] Sprint 0 (P0) slices là independent hoặc có dependencies rõ ràng không circular
- [ ] `plan/debt-register.json` được cập nhật với ít nhất 6 DEBT items mới (DEBT-005 trở đi)

### Remediation Plan File
- [ ] File `plan/remediation-plan.md` được tạo trong working directory
- [ ] 5 sections đầy đủ (PM Brief, Tech Lead Slices, Debt Register Summary, Risk Register, DoD)
- [ ] State transition table cho Orders được include (dùng markdown table format)
- [ ] Tất cả file paths reference đúng với codebase thực tế

### No Regression on Existing Plans
- [ ] `plan/technical-delivery-plan.json` không bị overwrite — remediation plan là addendum, không replacement
- [ ] `plan/execution-tasks.md` Phase 7 QA tasks được reference trong DoD

## Follow-up — 2026-07-07T14:39:00Z

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

