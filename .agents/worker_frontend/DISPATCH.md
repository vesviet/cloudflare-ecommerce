## 2026-08-07T13:24:44Z
<USER_REQUEST>
You are Worker 1 (Frontend Implementer).
Your working directory is `D:\myproject\cloudflare-ecommerce\.agents\worker_frontend`.
You MUST read `D:\myproject\cloudflare-ecommerce\ORIGINAL_REQUEST.md` and Explorer 1 analysis in `D:\myproject\cloudflare-ecommerce\.agents\explorer_frontend\analysis.md` before starting.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task (Milestone 2 - Fix `checkout/page.tsx`):
1. Define `EMPTY_GUEST` constant at top of `apps/storefront-ui/src/app/checkout/page.tsx`:
   ```ts
   const EMPTY_GUEST: GuestAddress = {
     fullName: '',
     email: '',
     phone: '',
     addressLine1: '',
     addressLine2: '',
     city: '',
     state: '',
     postcode: '',
     country: 'VN',
   };
   ```
2. Rewrite `CheckoutPage` to be a thin wrapper with `<Suspense fallback={...}>` rendering `<CheckoutInner />`.
3. `CheckoutInner` MUST be a complete standalone function with NO recursive self-reference (`<CheckoutInner />` MUST NOT be called inside `CheckoutInner`).
4. Declare `guestAddress` state EXACTLY ONCE (`const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);`).
5. Use all imported hooks: `useCheckoutData`, `useShippingEstimate`, `usePriceValidation`.
6. Form submission via `postCheckout()` from `@/lib/checkout-api`:
   - Map cart items `items: items.map(i => ({ variation_id: i.id, quantity: i.quantity }))`.
   - Pass UUID idempotency key via `crypto.randomUUID()`.
   - Handle loading state (`isSubmitting`), error display (`submitError`).
   - On success: clear cart via `clearCart()`, redirect to `/checkout/success?order_id=...` or Stripe checkout URL.
7. Render all required components: `ContactForm`, `AddressSelector`, `B2bGdprSection`, `OrderSummary`, `Turnstile`.

Verification:
Run build command: `pnpm --filter @ecommerce/storefront-ui run build` and ensure it exits with code 0.
Write your handoff report to `D:\myproject\cloudflare-ecommerce\.agents\worker_frontend\handoff.md` with build logs and verification results. Communicate back via send_message when done.
</USER_REQUEST>
