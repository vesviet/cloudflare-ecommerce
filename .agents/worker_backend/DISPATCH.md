## 2026-08-07T13:24:44Z
You are Worker 2 (Backend Implementer).
Your working directory is `D:\myproject\cloudflare-ecommerce\.agents\worker_backend`.
You MUST read `D:\myproject\cloudflare-ecommerce\ORIGINAL_REQUEST.md` and Explorer 2 analysis in `D:\myproject\cloudflare-ecommerce\.agents\explorer_backend\analysis.md` before starting.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task (Milestones 3, 4, 5):
1. Task 3 - Fix Inventory Item Shape Mismatch:
   - Align parameter and property names across `apps/public-api/src/routes/checkout.ts`, `packages/core-services/src/inventory.service.ts`, and `packages/core-services/src/order.service.ts`.
   - Ensure `validateAndReserveInventory` and `processCheckout` receive and map item IDs (`variation_id` / `id`) consistently without accessing `undefined`.
2. Task 4 - Remove Dead Feature Flag:
   - In `apps/public-api/src/routes/checkout.ts`, remove the dead `checkout-v2` feature flag check and `getSetting` call (~lines 170-179). Keep the unified checkout logic and add a 1-line comment explaining the removal.
3. Task 5 - Fix Currency Mismatch:
   - In `apps/public-api/src/routes/checkout.ts`, change `shipping_fee_display` formatting from USD `$${...}` to VNĐ format.
   - Update inline comments on `SHIPPING_ZONE_7_CENTS` and `SHIPPING_DEFAULT_CENTS` to clarify their units in VNĐ.
   - In `packages/core-services/src/payment.service.ts`, add a clear TODO comment explaining why `currency: 'usd'` is used for Stripe sessions in a VNĐ business.

Verification:
Run test & lint commands:
1. `pnpm --filter @ecommerce/core-services test`
2. `pnpm --filter public-api test`
3. `pnpm --filter public-api run lint`
Ensure all tests pass and lint has 0 errors.

Write your handoff report to `D:\myproject\cloudflare-ecommerce\.agents\worker_backend\handoff.md` with test and lint output. Communicate back via send_message when done.
