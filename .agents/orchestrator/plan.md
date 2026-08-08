# Refactoring Plan — Admin System Refactor

## Scope & Objective
Refactor `apps/admin-api/` and `apps/admin-ui/` in `D:\myproject\cloudflare-ecommerce` according to requirements R1-R10.

## Milestones Breakdown

### Task 1: Research & Codebase Exploration
- Dispatch 3 parallel Explorers / Spec Miners to investigate key files in `apps/admin-api/` and `apps/admin-ui/`.
- Verify existing test suites (`apps/admin-api/src/routes/__tests__/`), type definitions, route handlers, and coupon references.

### Task 2: Milestone 1 — admin-api Backend Refactoring
- **R1**: Extract `GET /landing-leads` from `orders.ts` to `apps/admin-api/src/routes/landingLeads.ts` and mount in `index.ts`.
- **R2**: Add `requireRole(['superadmin', 'manager', 'support'])` middleware to `GET /orders` and `GET /orders/:id`.
- **R3**: Add soft-delete endpoint `DELETE /products/:id` setting `deleted_at = CURRENT_TIMESTAMP` requiring `superadmin` or `manager`.
- **R4**: Refactor `mapPromotionToCoupon` in `coupons.ts` to use canonical field names (`ends_at`, `usage_limit`, `times_used`) and export `CouponDTO`.
- **R9**: Document flat shipping fee in `checkout.ts` with constant `ADMIN_FLAT_SHIPPING_FEE_VND_CENTS = 999`.

### Task 3: Milestone 2 — admin-ui Frontend Refactoring
- **R4**: Update `admin-ui` callers (e.g. `PromotionsTab.tsx`) to use canonical coupon fields from `CouponDTO`.
- **R5**: Extract `ROLE_ROUTES` config and implement `<ProtectedRoute>` route guard component in `App.tsx`.
- **R6**: Extract `<PageTransition>` component in `apps/admin-ui/src/components/PageTransition.tsx` and wrap all 11 routes in `App.tsx`.
- **R7**: Update `OrderData.status` union type in `apps/admin-ui/src/types.ts` to include `'pending'`, `'confirmed'`, `'shipped'`.
- **R8**: Fix currency formatting in `OverviewTab.tsx` to display VNĐ minor unit conversion with comment.

### Task 4: Milestone 3 — Build, Lint, Test & Verification (R10)
- Run `pnpm --filter @ecommerce/admin-ui build` -> exit 0.
- Run `pnpm --filter @ecommerce/admin-api lint` -> 0 errors.
- Run `pnpm --filter @ecommerce/admin-api test` -> all tests pass.
- Reviewer checks, Challenger verification, and Forensic Auditor integrity verification.

### Task 5: Milestone 4 — Git Commit & Push
- Execute git commit with message: `refactor(admin): route extraction, RBAC guard, soft-delete, VND currency, type fixes`.
- Push to git repository and notify parent Sentinel.
