# Project: cloudflare-ecommerce Checkout Pipeline Refactoring

## Architecture
- `apps/public-api`: Hono.js on Cloudflare Workers (checkout backend API routes)
- `apps/storefront-ui`: Next.js 14 storefront (checkout page UI & client API layer)
- `packages/core-services`: Shared business logic (`OrderService`, `InventoryService`, `PaymentService`, `PromotionEngine`)
- `packages/database`: Drizzle ORM schema on Cloudflare D1 (SQLite)
- `packages/contract`: Zod schemas / API contracts (`CheckoutSchema`, etc.)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Checkout Research | Deep analysis of full checkout data flow across packages | M1 | ORIGINAL_REQUEST § Task 1 |
| 2 | Fix checkout/page.tsx | Complete rewrite of storefront-ui checkout page component | M2 | ORIGINAL_REQUEST § Task 2 |
| 3 | Inventory Shape Mismatch | Align `variation_id`/`id` field names in `InventoryService` & `checkout.ts` & `OrderService` | M3 | ORIGINAL_REQUEST § Task 3 |
| 4 | Remove Dead Feature Flag | Remove `checkout-v2` dead code path in `checkout.ts` | M4 | ORIGINAL_REQUEST § Task 4 |
| 5 | Currency Mismatch | Fix USD formatting in `shipping_fee_display` to VNĐ format & comment constants | M5 | ORIGINAL_REQUEST § Task 5 |
| 6 | Build & Lint Verification | Run build, lint, and tests across storefront-ui, public-api, and core-services | M6 | ORIGINAL_REQUEST § Task 6 |
| 7 | Git Commit & Push | Commit refactored code with specified commit message | M7 | ORIGINAL_REQUEST § Task 7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Research & Investigation | Analyze all files in checkout data flow and map type mismatches/bugs | None | DONE |
| M2 | Fix checkout/page.tsx | Fix broken component structure, duplicate state, infinite recursion, Turnstile, form submit | M1 | IN_PROGRESS |
| M3 | Fix Inventory Item Shape Mismatch | Align variation_id and id in inventory service, checkout route, and order service | M1 | PLANNED |
| M4 | Remove Dead Feature Flag | Strip dead checkout-v2 flag block from checkout.ts | M1 | PLANNED |
| M5 | Fix Currency Mismatch in Shipping Display | Fix USD to VNĐ formatting in shipping estimate display and add comments | M1 | PLANNED |
| M6 | Build, Lint & Test Verification | Build storefront-ui, lint public-api, test core-services and public-api | M2, M3, M4, M5 | PLANNED |
| M7 | Git Commit & Push | Git add, commit with exact message, and push | M6 | PLANNED |

## Interface Contracts
### `CheckoutSchema` ↔ `InventoryService` ↔ `OrderService`
- Input item shape for `validateAndReserveInventory`: `{ id: string; product_id?: string; variation_id?: string; quantity: number }[]` or aligned mapping.
- `OrderService.processCheckout` validItems mapping: `{ productId: item.variation_id || item.id }`.

### `storefront-ui` ↔ `public-api`
- `postCheckout()` in `checkout-api.ts` posts to `/api/checkout` with idempotency key header.

## Code Layout
- `apps/public-api/src/routes/checkout.ts` — checkout API routes
- `apps/storefront-ui/src/app/checkout/page.tsx` — Next.js checkout page
- `apps/storefront-ui/src/components/checkout/` — UI components
- `apps/storefront-ui/src/hooks/` — custom checkout hooks
- `apps/storefront-ui/src/store/cartStore.ts` — Zustand cart state
- `apps/storefront-ui/src/lib/checkout-api.ts` — API client functions
- `packages/core-services/src/order.service.ts` — OrderService
- `packages/core-services/src/inventory.service.ts` — InventoryService
- `packages/core-services/src/payment.service.ts` — PaymentService
- `packages/core-services/src/promotion.engine.ts` — PromotionEngine
- `packages/contract/src/` — Zod contracts
