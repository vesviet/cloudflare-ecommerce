# Contracts, Test Suites & Global Data Flow Analysis Report

**Explorer**: Explorer 3 (Contracts & Data Flow Explorer)  
**Date**: 2026-08-07  
**Working Directory**: `D:\myproject\cloudflare-ecommerce\.agents\explorer_contracts`  
**Target Monorepo**: `D:\myproject\cloudflare-ecommerce`  

---

## 1. Executive Summary

This report presents an empirical analysis of all API contracts, Zod schemas, test suites, build/lint setups, and the end-to-end checkout data flow in the `cloudflare-ecommerce` monorepo.

Key Findings:
1. **Contract Schema Alignment**: The `@ecommerce/contract` package defines `CheckoutSchema` with `items: [{ variation_id: string, quantity: number }]`. However, the frontend `CartStore` uses `{ id: string, product_id: string, quantity: number }`. In `InventoryService.validateAndReserveInventory` and `OrderService.processCheckout`, items are processed via `variation_id`. Any mismatch in property naming risks passing `undefined` down the pipeline.
2. **Broken Component Structure**: `apps/storefront-ui/src/app/checkout/page.tsx` fails TypeScript compilation and Next.js build due to duplicate `guestAddress` `useState` declarations, missing `EMPTY_GUEST` constant, infinite recursion (`CheckoutInner` rendering `<CheckoutInner />`), and a truncated function body.
3. **Test Suite Status**:
   - `packages/core-services`: 12/12 test files passed (114 tests) via `pnpm --filter @ecommerce/core-services test`.
   - `apps/public-api`: 9/9 test files passed (57 tests) via `pnpm --filter public-api test` (note filter name `public-api`).
   - `packages/contract`: 4/4 test files passed (54 tests) via `pnpm --filter @ecommerce/contract test`.
4. **Build & Lint Status**:
   - `pnpm --filter public-api run lint`: Passed with 0 errors (4 warnings).
   - `pnpm --filter storefront-ui run build`: FAILED (Exit code 1) due to syntax/duplicate declaration errors in `checkout/page.tsx`.
5. **Data Flow & Edge Cases**: Identified 7 critical edge cases including dead feature flag `checkout-v2`, USD `$` formatting in shipping estimates for VNĐ context, Stripe session currency technical debt, and idempotency lock handling.

---

## 2. Schema Contracts & Type Definitions Analysis

### 2.1 `@ecommerce/contract` Overview (`packages/contract/src/index.ts` & `admin.ts`)

The contract package exports Zod schemas and inferred TypeScript types shared across `apps/public-api`, `apps/admin-api`, and `apps/storefront-ui`.

#### Core Checkout & Cart Schemas

```ts
// CheckoutSchema
export const CheckoutSchema = z.object({
  email: z.string().email().optional(),
  customer_id: z.string().uuid().optional(),
  coupon_code: z.string().optional(),
  location_id: z.string().optional(),
  address: z.object({
    fullname: z.string().optional(),
    address: z.string().optional(),
    zipcode: z.string().optional()
  }).passthrough().optional(),
  shipping_address_json: z.record(z.any()).optional(),
  billing_address_json: z.record(z.any()).optional(),
  items: z.array(z.object({
    variation_id: z.string(),
    quantity: z.number().int().positive()
  })),
  affiliate_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  accepts_marketing: z.union([z.boolean(), z.number().transform(v => Boolean(v))]).optional(),
  turnstileToken: z.string().optional(),
  redeem_points: z.number().int().nonnegative().optional(),
  b2b_company: z.string().optional(),
  b2b_vat_id: z.string().optional(),
}).openapi('Checkout')

export const checkoutSchema = CheckoutSchema;
```

#### Inferred Types Table

| Schema Name | Inferred TypeScript Type | Key Fields & Constraints |
|---|---|---|
| `CheckoutSchema` | `CheckoutInput` | `items`: `{ variation_id: string, quantity: number }[]`, `accepts_marketing`: boolean or coerced number |
| `CartSchema` | `Cart` | `id?`, `customer_id?`, `items`: `CartItem[]`, `updated_at?` |
| `CartItemSchema` | `CartItem` | `id?`, `variation_id`, `product_id?`, `quantity` (pos int), `price?`, `title?` |
| `AddToCartSchema` | `AddToCartInput` | `variation_id`, `quantity` (default 1) |
| `ProductSchema` | `Product` | `id` (uuid), `slug`, `title`, `status` ('draft'\|'published'\|'archived'), `created_at`, `updated_at` |
| `CouponSchema` | `Coupon` | `id` (uuid), `code`, `type` ('percent'\|'fixed'\|'freeship'\|'percentage'\|'free_shipping'), `value`, `is_active` |
| `CustomerAddressSchema` | `CustomerAddressInput` | `first_name`, `last_name`, `address_1`, `city`, `postcode` |

### 2.2 Schema & Model Mismatches Discovered

1. **`items` Field Shape Inconsistency**:
   - `CheckoutSchema` (contract): `items: Array<{ variation_id: string; quantity: number }>`
   - `CartStore` (frontend store): `items: Array<{ id: string; name: string; price: number; quantity: number; product_id: string }>`
   - `ValidatePricesSchema` (`checkout.ts`): `items: Array<{ id: string; product_id: string }>`
   - `InventoryService.validateAndReserveInventory`: expects `{ variation_id: string; quantity: number }[]`
   - `OrderService.processCheckout`: maps `validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }))`
   - **Risk**: If the storefront sends `id` instead of `variation_id` in the `postCheckout` payload, `CheckoutSchema` validation fails. If `validItems` in `OrderService` lacks `variation_id`, `productId` becomes `undefined`, breaking DB queries.

---

## 3. Test Suites, Build, and Lint Analysis

### 3.1 Empirical Execution Results

All commands were executed in the repository root `D:\myproject\cloudflare-ecommerce`.

| Command | Status | Details |
|---|---|---|
| `pnpm --filter @ecommerce/core-services test` | **PASS (100%)** | 12 test files passed, 114 tests passed in 5.10s. |
| `pnpm --filter public-api test` | **PASS (100%)** | 9 test files passed, 57 tests passed in 15.81s. |
| `pnpm --filter @ecommerce/contract test` | **PASS (100%)** | 4 test files passed, 54 tests passed in 1.40s. |
| `pnpm --filter storefront-ui run build` | **FAIL (Exit 1)** | Next.js build failed on `./src/app/checkout/page.tsx` due to duplicate identifier `guestAddress` & truncation. |
| `pnpm --filter public-api run lint` | **PASS (100%)** | ESLint passed with 0 errors (4 minor unused var warnings). |

### 3.2 Filter Naming Discrepancy Note

- In prompt / task instructions: `pnpm --filter @ecommerce/public-api test`
- Workspace `package.json` package names:
  - `apps/public-api/package.json` -> `"name": "public-api"`
  - `apps/storefront-ui/package.json` -> `"name": "storefront-ui"`
- Running `pnpm --filter @ecommerce/public-api test` returns `No projects matched the filters`.
- The exact pnpm command for public-api is `pnpm --filter public-api test` (or `pnpm --filter public-api run lint`).

---

## 4. End-to-End Data Flow & Pipeline Architecture

```
[CartStore] (zustand + localStorage)
    │
    ▼
[checkout/page.tsx] (Next.js 14 Client Component)
    │  ├─ useCheckoutData (addresses, loyalty, B2B)
    │  ├─ useShippingEstimate (/api/checkout/shipping-estimate)
    │  └─ usePriceValidation (/api/checkout/validate-prices)
    │
    ▼ postCheckout(payload, idempotencyKey)
[checkout-api.ts] (Frontend API Client wrapper)
    │
    ▼ POST /api/checkout (Header: Idempotency-Key)
[apps/public-api/src/routes/checkout.ts] (Hono on Cloudflare Workers)
    │  ├─ zValidator(CheckoutSchema)
    │  ├─ rateLimit (CHECKOUT_RATE_LIMITER)
    │  ├─ checkoutIdempotency check/claim
    │  │
    │  ▼
[packages/core-services/src/inventory.service.ts]
    │  └─ InventoryService.validateAndReserveInventory (stock check on inventory_levels, price on price_list_items)
    │
    ▼
[packages/core-services/src/payment.service.ts] / [promotion.engine.ts]
    │  └─ PaymentService.calculatePricing -> PromotionEngine.evaluate (discounts, taxes, shipping, loyalty)
    │
    ▼
[packages/core-services/src/order.service.ts] (Two-Phase Commit Orchestrator)
    │  ├─ Phase 0: Atomic coupon lock (promotions.times_used < usage_limit)
    │  ├─ Phase 1: OrderRepository.createOrder ('pending_payment')
    │  ├─ Phase 1.5: LoyaltyService.redeemPoints
    │  ├─ Phase 2: InventoryRepository.deductStock (inventory_levels.stock_quantity)
    │  └─ Phase 3 (Rollback on failure): update status 'failed', refund points
    │
    ▼
[PaymentService.createStripeSession]
    │  └─ Creates Stripe Checkout Session -> Updates order session_id
    │  └─ Completes checkoutIdempotency record
    │
    ▼
Return JSON: { success: true, order_id, checkout_url }
```

---

## 5. Potential Edge Cases, Bugs & Structural Vulnerabilities

### 1. `checkout/page.tsx` Component Corruption (CRITICAL)
- **Observed Bug**: Line 41 & Line 53 both declare `const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);`. `EMPTY_GUEST` is undefined. `CheckoutInner` line 63 renders `<CheckoutInner />` infinitely. Body truncated after line 60.
- **Impact**: Completely breaks storefront build and checkout functionality.

### 2. Item Variation ID Shape Mismatch across Pipeline
- **Observed Bug**: `CheckoutSchema` expects `{ variation_id: string, quantity: number }`. If frontend sends `id`, `CheckoutSchema` throws validation error. In `OrderService.processCheckout`, items are mapped via `i.variation_id`. If `variation_id` is missing, `productId` is `undefined`.
- **Impact**: Database inventory deduction query receives `undefined` product IDs.

### 3. Dead `checkout-v2` Feature Flag Block
- **Observed Bug**: `checkout.ts` lines 170–179 checks `getSetting(db, 'checkout-v2', true)`. Both branches execute the identical main checkout path.
- **Impact**: Unnecessary D1 database read query per checkout attempt.

### 4. Shipping Fee Display Currency Mismatch
- **Observed Bug**: `GET /api/checkout/shipping-estimate` returns `shipping_fee_display: "$30.00"` / `"$50.00"` for feeCents 3000 / 5000. The site operates in VNĐ.
- **Impact**: Confusing USD `$30.00` pricing displayed to VNĐ customers.

### 5. Stripe Session USD Currency Technical Debt
- **Observed Bug**: `PaymentService.createStripeSession` hardcodes `currency: 'usd'` for line items.
- **Impact**: Technical debt when integrated with VNĐ catalog pricing.

### 6. Idempotency Key Lock & Cleanup
- **Observed Behavior**: `checkoutIdempotency` claims key with status `'processing'`. If checkout fails mid-way (validation error or Stripe session error), the idempotency record is deleted so user can retry. If it succeeds, status set to `'completed'` with cached `response_json`.

### 7. Coupon Usage Limit Race Conditions
- **Observed Behavior**: `OrderService.processCheckout` executes Phase 0 atomic update (`WHERE times_used < usage_limit`). If coupon limit is reached, error is thrown before creating order or deducting stock. If order is cancelled/refunded later, `times_used` is atomically decremented by 1.

---
