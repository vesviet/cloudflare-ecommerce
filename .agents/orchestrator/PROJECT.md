# Project: Admin System Refactor (Cloudflare Ecommerce)

## Architecture
- Backend: `apps/admin-api/` (Hono.js on Cloudflare Workers)
- Frontend: `apps/admin-ui/` (Vite + React SPA)

## Feature Inventory & Requirements Mapping
| # | Requirement | Description | Milestone | Source |
|---|-------------|-------------|-----------|--------|
| 1 | R1 | Extract `GET /landing-leads` from `orders.ts` to `landingLeads.ts` | M1 | ORIGINAL_REQUEST.md §R1 |
| 2 | R2 | Add `requireRole(['superadmin', 'manager', 'support'])` to `GET /orders` & `GET /orders/:id` | M1 | ORIGINAL_REQUEST.md §R2 |
| 3 | R3 | Add soft-delete endpoint `DELETE /products/:id` (`deleted_at = CURRENT_TIMESTAMP`) | M1 | ORIGINAL_REQUEST.md §R3 |
| 4 | R4 | Refactor `mapPromotionToCoupon` to canonical field names & create `CouponDTO` | M1 & M2 | ORIGINAL_REQUEST.md §R4 |
| 5 | R5 | Fix RBAC route guard in `App.tsx` using `ROLE_ROUTES` and `<ProtectedRoute>` | M2 | ORIGINAL_REQUEST.md §R5 |
| 6 | R6 | Extract `<PageTransition>` component and wrap all 11 routes in `App.tsx` | M2 | ORIGINAL_REQUEST.md §R6 |
| 7 | R7 | Fix `OrderData.status` union type in `types.ts` | M2 | ORIGINAL_REQUEST.md §R7 |
| 8 | R8 | Fix currency formatting in `OverviewTab.tsx` to display VNĐ minor units | M2 | ORIGINAL_REQUEST.md §R8 |
| 9 | R9 | Document flat shipping fee constant `ADMIN_FLAT_SHIPPING_FEE_VND_CENTS` in `checkout.ts` | M1 | ORIGINAL_REQUEST.md §R9 |
| 10 | R10 | Verify build (`admin-ui`), lint (`admin-api`), and test suite execution | M3 | ORIGINAL_REQUEST.md §R10 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | admin-api Refactor | R1, R2, R3, R4 (backend), R9 | None | IN_PROGRESS |
| M2 | admin-ui Refactor | R4 (frontend), R5, R6, R7, R8 | M1 (Coupon DTO) | PLANNED |
| M3 | Build, Lint & E2E Testing | R10, unit tests, lint checks | M1, M2 | PLANNED |
| M4 | Git Commit & Push | Final commit and parent notification | M3 | PLANNED |

## Interface Contracts
### Coupons API (admin-api ↔ admin-ui)
- Canonical DTO fields: `id`, `code`, `discount_percent`, `discount_amount`, `starts_at`, `ends_at`, `usage_limit`, `times_used`, `is_active`.
- Deprecated aliases (`expires_at`, `max_uses`, `uses`) are removed from API payload and DTO.
