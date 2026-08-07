# BRIEFING — 2026-08-07T13:23:25Z

## Mission
Investigate backend checkout routes and core services for item shape mismatches, dead feature flags, currency mismatches, and promotion engine issues.

## 🔒 My Identity
- Archetype: Backend Checkout & Services Explorer
- Roles: Backend Explorer
- Working directory: D:\myproject\cloudflare-ecommerce\.agents\explorer_backend
- Original parent: aef36411-b4b6-4849-bac4-0c47f140b735
- Milestone: Explorer 2 Backend Analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code fixes in source files
- Focus on backend checkout and core services
- Write findings to D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\analysis.md
- Write handoff to D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\handoff.md
- Communicate back via send_message when complete

## Current Parent
- Conversation ID: aef36411-b4b6-4849-bac4-0c47f140b735
- Updated: 2026-08-07T13:23:25Z

## Investigation State
- **Explored paths**: `apps/public-api/src/routes/checkout.ts`, `packages/core-services/src/order.service.ts`, `packages/core-services/src/inventory.service.ts`, `packages/core-services/src/payment.service.ts`, `packages/core-services/src/promotion.engine.ts`, `packages/contract/src/index.ts`, `packages/core-services/src/order.repository.ts`, `packages/core-services/src/inventory.repository.ts`.
- **Key findings**:
  1. Item Shape Mismatch: Discrepancy between `id` and `variation_id` in `CheckoutSchema`, `ValidatePricesSchema`, `CartItem`, `InventoryService.validateAndReserveInventory`, and `OrderService.processCheckout`. Passing `id` without `variation_id` causes `undefined` propagation to SQL queries, stock deduction, and DB order items insertion.
  2. Dead Feature Flag: `checkout-v2` in `checkout.ts:170-179` executes identical code paths in both branches while making unnecessary DB call `getSetting(db, 'checkout-v2', true)`.
  3. Currency Mismatch: `shipping_fee_display` in `/api/checkout/shipping-estimate` uses USD `$` formatting (`$30.00`/`$50.00`) in VNĐ context. Constants `SHIPPING_ZONE_7_CENTS` & `SHIPPING_DEFAULT_CENTS` have misleading comments. `createStripeSession` uses hardcoded `currency: 'usd'` due to Stripe VNĐ limitations and needs a technical debt comment.
- **Unexplored areas**: None (investigation complete).

## Key Decisions Made
- Written detailed analysis to `D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\analysis.md`.
- Written 5-component handoff report to `D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\handoff.md`.

## Artifact Index
- D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\DISPATCH.md — Dispatch prompt record
- D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\BRIEFING.md — Working context and memory
- D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\analysis.md — Detailed backend analysis
- D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\handoff.md — 5-component handoff report
