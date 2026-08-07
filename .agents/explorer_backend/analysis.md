# Deep Technical Analysis: Backend Checkout Routes & Core Services

**Explorer:** Explorer 2 (Backend Checkout & Core Services Explorer)  
**Date:** 2026-08-07  
**Scope:** `apps/public-api/src/routes/checkout.ts`, `packages/core-services/src/order.service.ts`, `packages/core-services/src/inventory.service.ts`, `packages/core-services/src/payment.service.ts`, `packages/core-services/src/promotion.engine.ts`, `packages/contract/src/index.ts`

---

## Executive Summary

This report documents the detailed findings of the investigation into the backend checkout flow and core services of `cloudflare-ecommerce`. Three critical architectural/implementation issues were identified:
1. **Item Shape Mismatch & Silent `undefined` Propagation**: Field key discrepancies between `id` and `variation_id` across `CheckoutSchema`, `ValidatePricesSchema`, `CartItem`, `InventoryService.validateAndReserveInventory`, and `OrderService.processCheckout`. If `id` is supplied without `variation_id`, `undefined` is silently propagated into inventory lookup queries, D1 stock deduction, order items table insertion, and payment metadata logging.
2. **Dead Feature Flag (`checkout-v2`)**: In `apps/public-api/src/routes/checkout.ts` (lines 170–179), `getSetting(db, 'checkout-v2', true)` is called, but both `if` and `else` branches execute identical business logic. This adds unnecessary DB latency per checkout request.
3. **Currency Mismatch in Shipping & Stripe**:
   - Shipping estimate endpoint `/api/checkout/shipping-estimate` formats `shipping_fee_display` as `$${(feeCents / 100).toFixed(2)}` (USD format `$30.00` / `$50.00`), conflicting with the store's VNĐ currency context.
   - Constants `SHIPPING_ZONE_7_CENTS` (3000) and `SHIPPING_DEFAULT_CENTS` (5000) carry misleading `// $30.00` comments.
   - `PaymentService.createStripeSession` hardcodes `currency: 'usd'` (lines 70, 81, 92) due to Stripe's lack of native VNĐ settlement support; this must be documented as technical debt without breaking existing Stripe checkout.

---

## 1. Item Shape Mismatch Analysis

### 1.1 Field Mapping Discrepancy Across Components

| Layer / Component | File & Line | Target Property Key | Input Expected | Remarks |
|---|---|---|---|---|
| **Contract Schema** (`CheckoutSchema`) | `packages/contract/src/index.ts:41-44` | `variation_id` | `{ variation_id: z.string(), quantity: z.number().int().positive() }` | Fails Zod validation if request payload uses `id` instead of `variation_id`. |
| **Validate Prices Schema** (`ValidatePricesSchema`) | `apps/public-api/src/routes/checkout.ts:50-55` | `id` & `product_id` | `{ id: z.string(), product_id: z.string() }` | Cart items on frontend store use `id` for variation_id. |
| **Frontend Cart Item** (`CartItem`) | `apps/storefront-ui/src/store/cartStore.ts:5-13` | `id` (and `product_id`) | `{ id: string, product_id: string, quantity: number, ... }` | `id` stores variation ID, `product_id` stores parent product ID. |
| **Inventory Service** (`validateAndReserveInventory`) | `packages/core-services/src/inventory.service.ts:14-16, 129-136` | `variation_id` | `items: { variation_id: string; quantity: number }[]` | Extracts `items.map(i => i.variation_id)`. Returns `validItems` containing `variation_id`. |
| **Order Service** (`processCheckout`) | `packages/core-services/src/order.service.ts:68` | `variation_id` | `validItems: { variation_id: string, ... }[]` | Maps `validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }))`. |
| **Order Repository** (`createOrder`) | `packages/core-services/src/order.repository.ts:62` | `variation_id` | `validItems: { variation_id: string, ... }[]` | Inserts `product_id: item.variation_id` into `order_items`. |
| **Payment Service** (`createStripeSession`) | `packages/core-services/src/payment.service.ts:65-67` | `variation_id` | `validItems: { variation_id: string, ... }[]` | Logs `item.variation_id` on price drift warning. |

### 1.2 Failure Cascade when `id` is passed without `variation_id`

If an item object `{ id: "var_123", quantity: 2 }` or `{ id: "var_123", product_id: "prod_456", quantity: 2 }` is provided to `validateAndReserveInventory`:

1. **`InventoryService.validateAndReserveInventory`** (`inventory.service.ts:16`):
   ```ts
   const variationIds = items.map((i) => i.variation_id);
   ```
   Since `i.variation_id` is `undefined`, `variationIds` evaluates to `[undefined]`.

2. **Database Queries**:
   - `inArray(schema.products.id, variationIds)` queries `id IN (undefined)`.
   - Line 106: `variations.find((v: any) => v.id === item.variation_id)` fails to match, throwing `Error: Product variation undefined is invalid or unavailable`.

3. **`validItems` Construction & `undefined` Access**:
   - Even if Zod or a loose caller permits `id`, `validItems.push({ variation_id: item.variation_id, ... })` pushes `{ variation_id: undefined, quantity: 2, price: 1000, name: "..." }`.
   - In `OrderService.processCheckout` (`order.service.ts:68`):
     ```ts
     const itemsToDeduct = orderData.validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }));
     ```
     `itemsToDeduct` becomes `[{ productId: undefined, quantity: 2 }]`.
   - In `InventoryRepository.deductStock` (`inventory.repository.ts:49-51`):
     ```sql
     UPDATE inventory_levels SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND location_id = ? AND stock_quantity >= ?
     ```
     Binds `item.productId` as `undefined` (or `NULL`), causing DB query failure or matching zero rows, failing inventory lock.
   - In `OrderRepository.createOrder` (`order.repository.ts:62`):
     `product_id: item.variation_id` inserts `NULL` / `undefined` into the `order_items` table.

### 1.3 Recommended Fix Strategy (Task 3)

1. **Schema Standardization**:
   - Update `CheckoutSchema` and `CartItemSchema` in `@ecommerce/contract` to accept item objects containing `variation_id` (or fallback to `id`).
   - In `apps/public-api/src/routes/checkout.ts`, map items before calling `validateAndReserveInventory`:
     ```ts
     const normalizedItems = items.map(item => ({
       variation_id: item.variation_id || (item as any).id,
       quantity: item.quantity
     }));
     ```
2. **Core Service Defensive Normalization**:
   - In `InventoryService.validateAndReserveInventory` (`inventory.service.ts`), resolve variation ID safely:
     ```ts
     const varId = item.variation_id || (item as any).id;
     ```
   - Ensure `validItems` array output strictly guarantees `variation_id: varId` (non-null, string).
   - In `OrderService.processCheckout` (`order.service.ts`), verify `i.variation_id` is defined before mapping to `productId`.

---

## 2. Dead Feature Flag (`checkout-v2`) Analysis

### 2.1 Code Location & Verbatim Snippet

**File:** `apps/public-api/src/routes/checkout.ts`  
**Lines:** 170–179

```ts
170:    // Progressive Delivery: Feature Flag
171:    const isCheckoutV2Enabled = await getSetting(db, 'checkout-v2', true)
172:
173:    if (!isCheckoutV2Enabled) {
174:      // NOTE: Fallback to old checkout behavior if needed.
175:      // For now, we will proceed but log a warning or execute V1 logic if it differs.
176:      console.log('[Checkout] Using V1 Logic (V2 disabled)')
177:    } else {
178:      console.log('[Checkout] Using V2 Logic')
179:    }
```

### 2.2 Findings & Impact

1. **Identical Execution Paths**: Regardless of whether `isCheckoutV2Enabled` resolves to `true` or `false`, the exact same downstream execution flow runs (lines 181–345).
2. **Unnecessary Latency**: Calling `getSetting(db, 'checkout-v2', true)` executes an asynchronous database / cache fetch on every single POST `/api/checkout` request.
3. **Dead Code Classification**: The check provides zero functional differentiation.

### 2.3 Required Cleanup (Task 4)

- Delete lines 170–179 in `apps/public-api/src/routes/checkout.ts`.
- Replace with a concise single-line comment:
  ```ts
  // Feature flag 'checkout-v2' check removed; V2 pipeline is permanent.
  ```

---

## 3. Currency Mismatch & Shipping Display Analysis

### 3.1 Shipping Fee Estimate Formatting

**File:** `apps/public-api/src/routes/checkout.ts`  
**Lines:** 21–43

```ts
21: // Shipping fee tiers in cents — server is the single source of truth.
22: // Zone 7xx postcodes (e.g. Ho Chi Minh City) get discounted rate.
23: const SHIPPING_ZONE_7_CENTS = 3000  // $30.00
24: const SHIPPING_DEFAULT_CENTS = 5000 // $50.00
25: const FLAT_SHIPPING_FEE_CENTS = 999 // legacy Stripe path — kept for backwards-compat
...
34: checkout.get('/shipping-estimate', (c) => {
35:   const postcode = (c.req.query('postcode') || '').trim()
36:   const feeCents = postcode.startsWith('7') ? SHIPPING_ZONE_7_CENTS : SHIPPING_DEFAULT_CENTS
37:   return c.json({
38:     success: true,
39:     shipping_fee_cents: feeCents,
40:     shipping_fee_display: `$${(feeCents / 100).toFixed(2)}`,
41:     zone: postcode.startsWith('7') ? 'zone-7' : 'default',
42:   })
43: })
```

#### Observations:
1. **Misleading Comments**: Lines 23 & 24 state `// $30.00` and `// $50.00`. In the store's VNĐ business model, these numeric values (3000 and 5000) represent VNĐ fee values (or base fee units).
2. **Invalid USD Display**: Line 40 formats `shipping_fee_display` with a USD `$` prefix (`$30.00` / `$50.00`).
3. **Required Fix (Task 5)**:
   - Format `shipping_fee_display` using VNĐ formatting (e.g. `${feeCents.toLocaleString('vi-VN')} ₫` or `30.000 ₫` / `50.000 ₫` without `$`).
   - Add inline comments to `SHIPPING_ZONE_7_CENTS` and `SHIPPING_DEFAULT_CENTS` explicitly clarifying that values represent VNĐ currency units.

---

### 3.2 Stripe Session Currency & Technical Debt

**File:** `packages/core-services/src/payment.service.ts`  
**Lines:** 68–97

```ts
70:          currency: 'usd',
...
81:          currency: 'usd',
...
92:          currency: 'usd',
```

#### Findings:
1. `PaymentService.createStripeSession` sets `currency: 'usd'` for line items, shipping, and tax.
2. Stripe does not support native settlement in VNĐ for many merchant account types, so Stripe checkout sessions are processed in USD.
3. **Required Action (Task 5)**:
   - Keep `currency: 'usd'` functional so as not to break existing Stripe test integration.
   - Add a prominent `// TODO / TECHNICAL DEBT:` comment explaining that `currency: 'usd'` is hardcoded because Stripe does not support VNĐ natively.

---

## 4. Summary of Task Action Items for Implementation Phase

| Task | Target File(s) | Key Fix Summary |
|---|---|---|
| **Item Shape Alignment** | `apps/public-api/src/routes/checkout.ts`, `packages/core-services/src/inventory.service.ts`, `packages/core-services/src/order.service.ts`, `packages/contract/src/index.ts` | Standardize item shape to map `id` -> `variation_id` consistently. Prevent `undefined` propagation in stock deduction, order items DB insertion, and payment metadata. |
| **Remove Dead Feature Flag** | `apps/public-api/src/routes/checkout.ts` | Remove `getSetting(db, 'checkout-v2', true)` and `if/else` block on lines ~170–179. Replace with a 1-line comment. |
| **Currency Display Fix** | `apps/public-api/src/routes/checkout.ts`, `packages/core-services/src/payment.service.ts` | Remove `$` prefix from `/api/checkout/shipping-estimate`. Update comments on `SHIPPING_ZONE_7_CENTS` & `SHIPPING_DEFAULT_CENTS`. Add technical debt TODO comment on `currency: 'usd'` in `createStripeSession`. |

---
