# Original User Request

## Initial Request — 2026-08-07T13:21:47Z

Refactor the checkout pipeline of the `cloudflare-ecommerce` monorepo — a production Cloudflare Workers + Next.js e-commerce platform. The goal is to fix all known bugs and structural issues in the checkout flow (backend API, core services, and frontend UI), produce clean TypeScript code, and ensure the whole pipeline passes build and lint checks.

Working directory: D:\myproject\cloudflare-ecommerce

Integrity mode: development

---

## Context

The repo is a Turborepo monorepo with:
- `apps/public-api` — Hono.js on Cloudflare Workers (checkout backend)
- `apps/storefront-ui` — Next.js 14 storefront (checkout frontend)
- `packages/core-services` — `InventoryService`, `PaymentService`, `OrderService`, `PromotionEngine` (shared business logic)
- `packages/database` — Drizzle ORM schema on Cloudflare D1 (SQLite)
- `packages/contract` — Zod schemas / API contracts

Key checkout files to research first before writing any code:
- `apps/public-api/src/routes/checkout.ts`
- `apps/storefront-ui/src/app/checkout/page.tsx` ← BROKEN: duplicate useState, function references itself recursively
- `apps/storefront-ui/src/components/checkout/` (AddressSelector, OrderSummary, ContactForm, CouponForm, B2bGdprSection)
- `apps/storefront-ui/src/hooks/` (useCheckoutData, usePriceValidation, useShippingEstimate)
- `apps/storefront-ui/src/store/cartStore.ts`
- `apps/storefront-ui/src/lib/checkout-api.ts`
- `packages/core-services/src/order.service.ts`
- `packages/core-services/src/inventory.service.ts`
- `packages/core-services/src/payment.service.ts`
- `packages/core-services/src/promotion.engine.ts`
- `packages/contract/src/` (CheckoutSchema and related)

---

## Sub-Tasks (auto-created)

### Task 1 — Research Phase (read ALL files before writing any code)
Read and understand every file listed in Context above. Map the complete data flow: CartStore → checkout/page.tsx → checkout-api.ts → public-api/checkout.ts → InventoryService → PaymentService → OrderService. Document all type mismatches, dead code, and bugs found.

### Task 2 — Fix checkout/page.tsx (CRITICAL — broken component)
The file has these bugs that must ALL be fixed:
1. `guestAddress` state is declared twice (duplicate `useState<GuestAddress>` call on lines 41 and 53)
2. `CheckoutPage` renders `<CheckoutInner />` but `CheckoutInner` also renders `<CheckoutInner />` — infinite recursion
3. The complete `CheckoutInner` function body is missing/truncated after `useShippingEstimate`

Rewrite `checkout/page.tsx` to be a complete, working page that:
- Has `CheckoutPage` as a thin wrapper with `<Suspense>` that renders `<CheckoutInner />`
- Has `CheckoutInner` as a complete, standalone function with NO recursive self-reference
- Declares `guestAddress` state exactly ONCE
- Uses all imported hooks: `useCheckoutData`, `useShippingEstimate`, `usePriceValidation`
- Renders all imported components: `ContactForm`, `AddressSelector`, `B2bGdprSection`, `OrderSummary`, Turnstile
- Handles form submission via `postCheckout()` from `checkout-api.ts` with a UUID idempotency key
- Shows loading state during submission
- On success: clears the cart, then redirects to `/checkout/success?order_id=...`
- On error: shows an error message
- Defines the `EMPTY_GUEST` constant that is referenced but likely missing

### Task 3 — Fix inventory item shape mismatch (checkout.ts ↔ inventory.service.ts)
`validateAndReserveInventory` in `inventory.service.ts` accepts `{ variation_id: string; quantity: number }[]` items. But `checkout.ts` calls it with items from `CheckoutSchema` which has shape `{ id: string; product_id: string; quantity: number }` — no `variation_id` field.

Also, `OrderService.processCheckout` maps `validItems` to `{ productId: i.variation_id }` which will be `undefined` if items don't have `variation_id`.

Fix: Align the input/output shapes consistently. Either:
- Map `id` → `variation_id` before calling `validateAndReserveInventory`, OR
- Rename the parameter in `validateAndReserveInventory` to accept `id` instead
Ensure `OrderService.processCheckout` accesses the correct field name with no `undefined`.

### Task 4 — Remove dead feature flag from checkout.ts
Remove the dead `checkout-v2` feature flag check (lines ~170-179 in checkout.ts). Both branches execute the same code path — the flag provides no differentiation. Remove the `getSetting` call and the if/else block entirely. Add a one-line comment explaining it was removed.

### Task 5 — Fix currency mismatch in shipping display
The `shipping_fee_display` in `/api/checkout/shipping-estimate` response returns `$${(feeCents / 100).toFixed(2)}` — this is USD format but the business sells in VNĐ.

Update the display format to use VNĐ formatting. The constants `SHIPPING_ZONE_7_CENTS` and `SHIPPING_DEFAULT_CENTS` should have inline comments clarifying their unit. If values are in VNĐ (not cents), rename or document accordingly.

For `payment.service.ts` `createStripeSession` which hardcodes `currency: 'usd'` — add a clear TODO comment if Stripe is being used as a payment processor for a VNĐ business (Stripe does not support VNĐ natively, so this may be intentional). Do not break existing Stripe integration — just document the technical debt.

### Task 6 — Build, Lint, and Debug
After all code changes:
1. Run `pnpm --filter @ecommerce/storefront-ui run build` — fix any TypeScript/build errors
2. Run `pnpm --filter @ecommerce/public-api run lint` — fix any ESLint errors
3. Run existing tests: `pnpm --filter @ecommerce/core-services test` and `pnpm --filter @ecommerce/public-api test`
4. Fix any failures found
5. Repeat until all pass

### Task 7 — Commit all changes
After build and lint pass:
```
git add .
git commit -m "refactor(checkout): fix broken page, item shape mismatch, dead code, currency display"
git push
```

---

## Requirements

### R1. Fix checkout/page.tsx — Broken component structure
The CheckoutPage file has critical bugs that prevent it from compiling or running. Rewrite it completely as described in Task 2.

### R2. Fix shipping currency display
Ensure shipping display does not use USD `$` formatting in a VNĐ context. Add clear comments on constants.

### R3. Remove dead feature flag
Remove the dead checkout-v2 feature flag code block from checkout.ts.

### R4. Fix inventory item shape mismatch
Align the variation_id/id field names across the checkout pipeline so no `undefined` is silently passed.

### R5. Build + lint pass
All modified packages must build and lint cleanly after changes.

---

## Acceptance Criteria

### Correctness
- [ ] `apps/storefront-ui/src/app/checkout/page.tsx` compiles without TypeScript errors
- [ ] No duplicate `useState` declarations in `page.tsx`
- [ ] `CheckoutPage` renders `CheckoutInner` exactly once; `CheckoutInner` does NOT render itself
- [ ] `CheckoutInner` has a complete function body that renders ContactForm, AddressSelector, B2bGdprSection, OrderSummary, and Turnstile
- [ ] Checkout form submission calls `postCheckout()` and handles success/error responses
- [ ] Cart is cleared and user is redirected on successful checkout
- [ ] `SHIPPING_ZONE_7_CENTS` and `SHIPPING_DEFAULT_CENTS` constants have inline comments explaining their unit
- [ ] `shipping_fee_display` in `/api/checkout/shipping-estimate` does NOT use `$` prefix
- [ ] Dead feature flag `checkout-v2` code block is removed from `checkout.ts`
- [ ] `validateAndReserveInventory` callers and the function itself use a consistent item shape with no silent `undefined`
- [ ] `OrderService.processCheckout` maps `validItems` to `productId` without accessing `undefined` properties

### Build & Lint
- [ ] `pnpm --filter @ecommerce/storefront-ui build` exits with code 0
- [ ] `pnpm --filter @ecommerce/public-api lint` exits with 0 errors
- [ ] TypeScript compilation for `packages/core-services` has 0 errors

### No Regressions
- [ ] All pre-existing tests in `apps/public-api/src/__tests__/` still pass
- [ ] All pre-existing tests in `packages/core-services/src/__tests__/` still pass
- [ ] `CartStore`, `useCheckoutData`, `useShippingEstimate`, `usePriceValidation` hooks are functionally unchanged

### Final Step
- [ ] All changes committed and pushed to git with message: `refactor(checkout): fix broken page, item shape mismatch, dead code, currency display`
