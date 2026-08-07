# Handoff Report — Backend Checkout & Core Services Explorer

**Agent:** Explorer 2 (Backend Checkout & Core Services Explorer)  
**Working Directory:** `D:\myproject\cloudflare-ecommerce\.agents\explorer_backend`  
**Date:** 2026-08-07  

---

## 1. Observation

Direct observations from codebase inspection:

### Observation 1: Item Shape Mismatch & Silent `undefined` Access
- **`packages/contract/src/index.ts` (lines 41-44)**: `CheckoutSchema` defines items as `z.array(z.object({ variation_id: z.string(), quantity: z.number().int().positive() }))`.
- **`apps/public-api/src/routes/checkout.ts` (lines 50-55)**: `ValidatePricesSchema` defines items as `{ id: z.string(), product_id: z.string() }`.
- **`apps/storefront-ui/src/store/cartStore.ts` (lines 5-13)**: Frontend `CartItem` defines `id: string` (holding variation_id) and `product_id: string`.
- **`packages/core-services/src/inventory.service.ts` (lines 14-16, 129-136)**: `validateAndReserveInventory` accepts `items: { variation_id: string; quantity: number }[]` and extracts `items.map((i) => i.variation_id)`.
- **`packages/core-services/src/order.service.ts` (line 68)**: `OrderService.processCheckout` maps `itemsToDeduct` using `orderData.validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }))`.
- **`packages/core-services/src/order.repository.ts` (line 62)**: `OrderRepository.createOrder` inserts `product_id: item.variation_id`.
- **`packages/core-services/src/payment.service.ts` (lines 65-67)**: `createStripeSession` logs `item.variation_id`.

If an item object is supplied with key `id` instead of `variation_id`, `i.variation_id` evaluates to `undefined`, causing inventory SQL queries `id IN (undefined)` to fail or return no matches, resulting in `Product variation undefined is invalid or unavailable` or passing `productId: undefined` to stock deduction and order creation queries.

### Observation 2: Dead Feature Flag `checkout-v2`
- **`apps/public-api/src/routes/checkout.ts` (lines 170-179)**:
  ```ts
  // Progressive Delivery: Feature Flag
  const isCheckoutV2Enabled = await getSetting(db, 'checkout-v2', true)

  if (!isCheckoutV2Enabled) {
    // NOTE: Fallback to old checkout behavior if needed.
    // For now, we will proceed but log a warning or execute V1 logic if it differs.
    console.log('[Checkout] Using V1 Logic (V2 disabled)')
  } else {
    console.log('[Checkout] Using V2 Logic')
  }
  ```
- **Lines 181–345**: Post-check logic executes identical code regardless of `isCheckoutV2Enabled` value.

### Observation 3: Currency Display & Stripe Currency Technical Debt
- **`apps/public-api/src/routes/checkout.ts` (lines 23-24)**:
  ```ts
  const SHIPPING_ZONE_7_CENTS = 3000  // $30.00
  const SHIPPING_DEFAULT_CENTS = 5000 // $50.00
  ```
- **`apps/public-api/src/routes/checkout.ts` (line 40)**:
  ```ts
  shipping_fee_display: `$${(feeCents / 100).toFixed(2)}`
  ```
- **`packages/core-services/src/payment.service.ts` (lines 70, 81, 92)**:
  ```ts
  currency: 'usd'
  ```

---

## 2. Logic Chain

1. **Item Shape Mismatch Chain**:
   - Step 1: `CheckoutSchema` expects `variation_id`, while frontend `CartItem` and `ValidatePricesSchema` use `id` for variation items. (Observation 1)
   - Step 2: In `checkout.ts`, `body.items` is passed directly to `InventoryService.validateAndReserveInventory`. If `variation_id` is missing, `items.map(i => i.variation_id)` produces `[undefined]`. (Observation 1)
   - Step 3: `validItems` will contain `variation_id: undefined`, which `OrderService.processCheckout` forwards to `InventoryRepository.deductStock({ productId: undefined })` and `OrderRepository.createOrder({ product_id: undefined })`. (Observation 1)
   - Step 4: Normalizing item shape in `checkout.ts` (`variation_id: item.variation_id || item.id`) and adding fallback handling in `InventoryService.validateAndReserveInventory` guarantees type safety and prevents `undefined` property access throughout the pipeline.

2. **Dead Feature Flag Chain**:
   - Step 1: `checkout.ts` lines 170–179 queries `getSetting(db, 'checkout-v2', true)`. (Observation 2)
   - Step 2: The `if (!isCheckoutV2Enabled)` and `else` branches only log console strings and branch into identical code on line 181. (Observation 2)
   - Step 3: Removing the `getSetting` database call and `if/else` block eliminates unnecessary DB roundtrips and cleans up dead code.

3. **Currency Mismatch Chain**:
   - Step 1: The store uses VNĐ for products and loyalty points (1 point = 1 VNĐ). (Observation 3)
   - Step 2: `/api/checkout/shipping-estimate` formats `shipping_fee_display` with USD `$` prefix (`$30.00`/`$50.00`), creating currency confusion. (Observation 3)
   - Step 3: Formatting `shipping_fee_display` with VNĐ format and clarifying `SHIPPING_ZONE_7_CENTS` / `SHIPPING_DEFAULT_CENTS` comments resolves display mismatch.
   - Step 4: Stripe checkout uses `currency: 'usd'` due to Stripe's lack of native VNĐ settlement. Keeping `currency: 'usd'` while adding a technical debt comment preserves payment functionality without misleading maintainers.

---

## 3. Caveats

- **Frontend Payload Format**: The storefront UI (`apps/storefront-ui`) cart items currently use `id` for variation ID. `CheckoutSchema` in `@ecommerce/contract` requires `variation_id`. Implementers must ensure `postCheckout` or backend normalizers accommodate both `id` and `variation_id`.
- **Stripe VNĐ Limitations**: Stripe does not support native VNĐ settlement in standard accounts. `currency: 'usd'` must remain intact in `payment.service.ts` to avoid breaking active Stripe test mocks.

---

## 4. Conclusion

The backend checkout pipeline requires three targeted refactoring actions:
1. **Normalize item shapes** in `checkout.ts`, `inventory.service.ts`, `order.service.ts`, and `contract/src/index.ts` so `variation_id` and `id` are resolved seamlessly and `undefined` is never passed to stock deduction or database queries.
2. **Remove dead feature flag code** (`checkout-v2`) from `checkout.ts` lines 170–179.
3. **Correct currency formatting** in `/api/checkout/shipping-estimate` to VNĐ, add unit documentation for shipping constants, and add a technical debt TODO comment on `currency: 'usd'` in `payment.service.ts`.

---

## 5. Verification Method

To independently verify findings and subsequent implementations:

1. **Unit Tests for Core Services**:
   ```bash
   pnpm --filter @ecommerce/core-services test
   ```
2. **Unit Tests for Public API**:
   ```bash
   pnpm --filter @ecommerce/public-api test
   ```
3. **Source Inspection**:
   - Inspect `apps/public-api/src/routes/checkout.ts` for removal of `checkout-v2` and correct VNĐ formatting in `shipping-estimate`.
   - Inspect `packages/core-services/src/inventory.service.ts` and `order.service.ts` for safe item field resolution (`variation_id`).
   - Inspect `packages/core-services/src/payment.service.ts` for technical debt comment on `currency: 'usd'`.
