# Handoff Report — Contracts & Data Flow Explorer (Explorer 3)

**Agent**: Explorer 3 (Contracts & Data Flow Explorer)  
**Working Directory**: `D:\myproject\cloudflare-ecommerce\.agents\explorer_contracts`  
**Date**: 2026-08-07  

---

## 1. Observation

### 1.1 Source Files Inspected
- `packages/contract/src/index.ts`: Lines 29–54 define `CheckoutSchema` requiring `items: z.array(z.object({ variation_id: z.string(), quantity: z.number().int().positive() }))`.
- `apps/storefront-ui/src/app/checkout/page.tsx`:
  - Line 41: `const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);`
  - Line 53: `const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);` (Duplicate declaration)
  - Line 63: `return (<Suspense...><CheckoutInner /></Suspense>);` inside `CheckoutInner` (Recursive self-reference / infinite recursion).
  - Truncated function body after line 60.
- `apps/public-api/src/routes/checkout.ts`:
  - Lines 40: `shipping_fee_display: \`$${(feeCents / 100).toFixed(2)}\`` (USD formatting for VNĐ postcodes).
  - Lines 170–179: Dead feature flag `checkout-v2` check (`getSetting(db, 'checkout-v2', true)`); both branches execute identical code.
- `packages/core-services/src/inventory.service.ts`: Line 14 accepts `{ variation_id: string; quantity: number }[]`.
- `packages/core-services/src/order.service.ts`: Lines 68 maps `validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }))`.
- `packages/core-services/src/payment.service.ts`: Line 70 hardcodes `currency: 'usd'` for Stripe session line items.

### 1.2 Command Results Observed
1. **Core Services Tests**:
   - Command: `pnpm --filter @ecommerce/core-services test`
   - Output: `Test Files 12 passed (12) | Tests 114 passed (114)`
2. **Public API Tests**:
   - Command: `pnpm --filter public-api test` (Note: workspace package name is `public-api`)
   - Output: `Test Files 9 passed (9) | Tests 57 passed (57)`
3. **Contract Package Tests**:
   - Command: `pnpm --filter @ecommerce/contract test`
   - Output: `Test Files 4 passed (4) | Tests 54 passed (54)`
4. **Public API Lint**:
   - Command: `pnpm --filter public-api run lint`
   - Output: `0 errors, 4 warnings`
5. **Storefront UI Build**:
   - Command: `pnpm --filter storefront-ui run build`
   - Output: `Failed to compile. ./src/app/checkout/page.tsx Module parse failed: Identifier 'guestAddress' has already been declared (40:11) Exit status 1`

---

## 2. Logic Chain

1. **Observation 1.1 (page.tsx syntax & recursion)** shows that `apps/storefront-ui/src/app/checkout/page.tsx` is severely broken (duplicate `guestAddress` state, missing `EMPTY_GUEST`, infinite recursion, missing component JSX body).
2. **Observation 1.2 (storefront build error)** confirms that running `pnpm --filter storefront-ui run build` fails immediately due to `page.tsx` compilation errors.
   - **Step Conclusion 1**: `checkout/page.tsx` must be rewritten as a clean, complete React component with `CheckoutPage` wrapping `CheckoutInner` via `<Suspense>`, single `guestAddress` state, `EMPTY_GUEST` defined, and form submission calling `postCheckout()`.
3. **Observation 1.1 (schema & service variation_id)** shows `CheckoutSchema` expects `variation_id` in `items`, while `cartStore.ts` stores `id` and `product_id`. In `order.service.ts`, `processCheckout` maps `i.variation_id`.
   - **Step Conclusion 2**: If the storefront maps cart items to `{ variation_id: item.id, quantity: item.quantity }`, both `CheckoutSchema` validation and `OrderService` stock deduction will work seamlessly without passing `undefined` property values.
4. **Observation 1.1 (dead flag in checkout.ts)** shows lines 170–179 in `checkout.ts` query `getSetting(db, 'checkout-v2', true)` but both branches execute identical code.
   - **Step Conclusion 3**: The `checkout-v2` feature flag is dead code and should be removed to eliminate an unnecessary database query.
5. **Observation 1.1 (currency display)** shows `shipping_fee_display` formats `feeCents` as `$30.00` / `$50.00` in USD format.
   - **Step Conclusion 4**: The display string should use VNĐ formatting (e.g. `3.000 đ` or `5.000 đ`) and constants should have inline unit documentation.

---

## 3. Caveats

- We did not modify any source code files during this exploration phase (strictly read-only investigation).
- Stripe payment gateway requires valid API credentials to execute full end-to-end payment processing in production; unit tests use mocked Stripe clients.

---

## 4. Conclusion

The contracts (`packages/contract`), core services (`packages/core-services`), and public API (`apps/public-api`) are structurally solid, passing all 225 unit tests across the 3 test suites and 0 ESLint errors.

However, the checkout pipeline cannot currently build or execute end-to-end due to:
1. Critical syntax and runtime corruption in `apps/storefront-ui/src/app/checkout/page.tsx`.
2. Potential `variation_id` property name mismatch if frontend payload structure is not strictly aligned with `CheckoutSchema`.
3. Technical debt & minor bugs (dead feature flag query in `checkout.ts`, USD `$` formatting in VNĐ shipping display).

Resolving these issues according to the requirements in `ORIGINAL_REQUEST.md` will restore full buildability, type safety, and test pass rates across the monorepo.

---

## 5. Verification Method

To independently verify all findings and validate fixes:

1. **Verify Core Services Tests**:
   ```powershell
   pnpm --filter @ecommerce/core-services test
   ```
   *Expected*: All 12 test files (114 tests) pass with 0 failures.

2. **Verify Public API Tests**:
   ```powershell
   pnpm --filter public-api test
   ```
   *Expected*: All 9 test files (57 tests) pass with 0 failures.

3. **Verify Public API Lint**:
   ```powershell
   pnpm --filter public-api run lint
   ```
   *Expected*: 0 errors.

4. **Verify Storefront UI Build**:
   ```powershell
   pnpm --filter storefront-ui run build
   ```
   *Current Result*: Fails with Exit status 1 on `checkout/page.tsx`.  
   *Target Result after fixes*: Exits with code 0 (successful Next.js build).

---
