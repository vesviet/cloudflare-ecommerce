# Detailed Frontend Checkout Analysis

**Explorer**: Explorer 1 (Frontend Checkout Explorer)  
**Target Path**: `D:\myproject\cloudflare-ecommerce\apps\storefront-ui`  
**Date**: 2026-08-07  

---

## 1. Overview & Target File Index

This document provides a line-by-line analysis and structural breakdown of the frontend checkout flow in `apps/storefront-ui`. 

### Key Investigated Files:
- `apps/storefront-ui/src/app/checkout/page.tsx` — Main checkout page component (currently broken).
- `apps/storefront-ui/src/components/checkout/AddressSelector.tsx` — Address selector & guest address inputs.
- `apps/storefront-ui/src/components/checkout/B2bGdprSection.tsx` — B2B company/VAT tax ID section & GDPR marketing consent checkbox.
- `apps/storefront-ui/src/components/checkout/ContactForm.tsx` — Contact email input form.
- `apps/storefront-ui/src/components/checkout/CouponForm.tsx` — Coupon code input & applied coupon chip component.
- `apps/storefront-ui/src/components/checkout/OrderSummary.tsx` — Sticky order summary with cart items, totals, discount, loyalty points slider, and shipping fee display.
- `apps/storefront-ui/src/hooks/useCheckoutData.ts` — Prefills customer email, saved addresses, loyalty balance, B2B data, marketing consent.
- `apps/storefront-ui/src/hooks/useShippingEstimate.ts` — Fetches server-authoritative shipping fee based on postcode.
- `apps/storefront-ui/src/hooks/usePriceValidation.ts` — Validates local cart item prices against server prices.
- `apps/storefront-ui/src/store/cartStore.ts` — Zustand store managing cart items, coupon, subtotal, discount, and sync.
- `apps/storefront-ui/src/lib/checkout-api.ts` — API client wrappers (`postCheckout`, `getShippingEstimate`, `getAddresses`, `getLoyalty`, `validatePrices`, `applyCoupon`, `syncCart`).

---

## 2. Line-by-Line Analysis of `checkout/page.tsx`

### Current Code Structure in `page.tsx` (Lines 1 to 67):
```tsx
 1: "use client";
 2: 
 3: import React, { useState, useEffect, Suspense, useRef } from 'react';
 4: import { useCartStore } from '../../store/cartStore';
 5: import { useAuthStore } from '../../store/authStore';
 6: import { useSearchParams } from 'next/navigation';
 7: import Link from 'next/link';
 8: import { ContactForm } from '../../components/checkout/ContactForm';
 9: import { AddressSelector, GuestAddress } from '../../components/checkout/AddressSelector';
10: import { B2bGdprSection } from '../../components/checkout/B2bGdprSection';
11: import { OrderSummary } from '../../components/checkout/OrderSummary';
12: import { Turnstile } from '@marsidev/react-turnstile';
13: import { isTrustedCheckoutUrl } from '../../lib/url';
14: import { postCheckout } from '../../lib/checkout-api';
15: import { alertErrorStyle, alertWarnStyle } from '../../lib/styles';
16: import { useShippingEstimate } from '../../hooks/useShippingEstimate';
17: import { useCheckoutData } from '../../hooks/useCheckoutData';
18: import { usePriceValidation } from '../../hooks/usePriceValidation';
19: 
20: const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
21: const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
22: const TURNSTILE_MISSING_IN_PROD = isProd && !TURNSTILE_SITE_KEY;
23: 
24: if (TURNSTILE_MISSING_IN_PROD) {
25:   console.error('[Checkout] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set in production. Turnstile protection is disabled.');
26: }
27: 
28: export default function CheckoutPage() {
29:   return (
30:     <Suspense fallback={<main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p></main>}>
31:       <CheckoutInner />
32:     </Suspense>
33:   );
34: }
35: 
36: function CheckoutInner() {
37:   const { items, getCartSubtotal, coupon } = useCartStore();
38:   const { isAuthenticated, customer } = useAuthStore();
39:   const searchParams = useSearchParams();
40: 
41:   const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);
42:   const [turnstileToken, setTurnstileToken] = useState('');
43:   const [mounted, setMounted] = useState(false);
44: 
45:   const {
46:     email, setEmail,
47:     savedAddresses, selectedAddressId, setSelectedAddressId,
48:     addressError, loyaltyBalance,
49:     acceptsMarketing, setAcceptsMarketing,
50:     isB2B, setIsB2B, b2bCompany, setB2bCompany, b2bVatId, setB2bVatId,
51:   } = useCheckoutData(isAuthenticated, customer);
52: 
53:   const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);
54: 
55:   const activePostcode = isAuthenticated && selectedAddressId
56:     ? savedAddresses.find(a => a.id === selectedAddressId)?.postcode || ''
57:     : guestAddress.postcode;
58: 
59:   const { shippingFeeCents, shippingLoading } = useShippingEstimate(activePostcode);
60: 
61:   return (
62:     <Suspense fallback={<main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p></main>}>
63:       <CheckoutInner />
64:     </Suspense>
65:   );
66: }
```

### Specific Key Findings & Line-by-Line Documentation:

#### 1. Duplicate `guestAddress` State Declaration
- **Line 41**: `const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);`
- **Line 53**: `const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);`
- **Impact**: Duplicate state declaration causes TypeScript compilation errors and identifier redeclaration error (`Identifier 'guestAddress' has already been declared`). Exactly one declaration is needed.

#### 2. Recursive `CheckoutInner` Rendering / Truncated Function Body
- **Lines 61–65**:
  ```tsx
  return (
    <Suspense fallback={<main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p></main>}>
      <CheckoutInner />
    </Suspense>
  );
  ```
- **Impact**: `CheckoutInner` returns an instance of itself inside `<Suspense>`, causing infinite recursive rendering and immediate stack overflow / freeze upon component mount.
- **Truncated Function Body**: Immediately after line 59 (`useShippingEstimate`), the complete function logic, state declarations (e.g. `isSubmitting`, `submitError`, `redeemPoints`), price validation hook invocation (`usePriceValidation`), form submission logic (`handleSubmit`), and JSX return block rendering the actual checkout layout are completely missing.

#### 3. Definition and Usage of `EMPTY_GUEST` Constant
- **Lines 41 & 53**: References `EMPTY_GUEST` as default argument to `useState<GuestAddress>(EMPTY_GUEST)`.
- **Finding**: `EMPTY_GUEST` is **not defined** in `page.tsx` and is **not exported** by `AddressSelector.tsx`.
- **Required Definition**:
  ```typescript
  const EMPTY_GUEST: GuestAddress = {
    first_name: '',
    last_name: '',
    company: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'VN',
    phone: '',
  };
  ```

#### 4. Unused / Truncated Hook Usages & Components
- **`usePriceValidation`** (imported at line 18): Not invoked in `CheckoutInner`. Must be invoked with `items` and `updatePrices` from `cartStore`: `const priceChanged = usePriceValidation(items, updatePrices);`.
- **Components Imported but Unrendered**:
  - `ContactForm` (imported at line 8)
  - `AddressSelector` (imported at line 9)
  - `B2bGdprSection` (imported at line 10)
  - `OrderSummary` (imported at line 11)
  - `Turnstile` (imported at line 12)
  - `isTrustedCheckoutUrl` (imported at line 13)
  - `postCheckout` (imported at line 14)

---

## 3. Analysis of Frontend Checkout Hooks

### A. `useCheckoutData` (`src/hooks/useCheckoutData.ts`)
- **Signature**: `useCheckoutData(isAuthenticated: boolean, customer: any)`
- **Behavior**:
  - Sets up local states for `email`, `savedAddresses`, `selectedAddressId`, `addressError`, `loyaltyBalance`, `acceptsMarketing`, `isB2B`, `b2bCompany`, `b2bVatId`.
  - On mount / change of `isAuthenticated` or `customer`:
    - Prefills email from `customer.email`.
    - If `customer.company_name` exists, enables `isB2B`, sets `b2bCompany` and `b2bVatId`.
    - Prefills `acceptsMarketing` from `customer.accepts_marketing === 1`.
    - Asynchronously calls `getAddresses()`. If successful, sets `savedAddresses` and sets `selectedAddressId` to default shipping address (`is_default_shipping === 1`) or first address.
    - Asynchronously calls `getLoyalty()`. Sets `loyaltyBalance` from `data.balance`.

### B. `useShippingEstimate` (`src/hooks/useShippingEstimate.ts`)
- **Signature**: `useShippingEstimate(activePostcode: string)`
- **Behavior**:
  - Accepts `activePostcode`.
  - Maintains `shippingFeeCents` state (default 5000 cents) and `shippingLoading` state (boolean).
  - Triggers async fetch `getShippingEstimate(activePostcode)` whenever `activePostcode` changes.
  - Returns `{ shippingFeeCents, shippingLoading }`.

### C. `usePriceValidation` (`src/hooks/usePriceValidation.ts`)
- **Signature**: `usePriceValidation(items: CartItem[], updatePrices: (updates: { id: string; price: number }[]) => void)`
- **Behavior**:
  - Computes `itemsKey = items.map(i => `${i.id}:${i.quantity}`).join(',')`.
  - On `itemsKey` change, calls `validatePrices(items)`.
  - If server returns price updates for items in cart, calls `updatePrices(priceUpdates)` on `cartStore` and returns `priceChanged = true`.

---

## 4. Analysis of Checkout Components

| Component | File Path | Props & Rendering Behavior |
|---|---|---|
| **`ContactForm`** | `src/components/checkout/ContactForm.tsx` | Accepts `email`, `onChangeEmail`. Renders section header "1 Contact Information" and email input. |
| **`AddressSelector`** | `src/components/checkout/AddressSelector.tsx` | Accepts `isAuthenticated`, `savedAddresses`, `selectedAddressId`, `guestAddress`, `onChangeSelectedAddressId`, `onChangeGuestAddress`. Renders radio list for saved addresses if authenticated, or guest address form fields (first/last name, address lines, city, state, postcode, country select, phone) if guest. |
| **`B2bGdprSection`** | `src/components/checkout/B2bGdprSection.tsx` | Accepts `isB2B`, `b2bCompany`, `b2bVatId`, `acceptsMarketing`, and their respective setters. Renders B2B checkbox (expanding company name and VAT ID fields) and GDPR marketing consent checkbox. |
| **`OrderSummary`** | `src/components/checkout/OrderSummary.tsx` | Accepts `items`, `isB2B`, `subtotal`, `shippingFeeCents`, `isCalculating`, `loyaltyBalance`, `redeemPoints`, `onRedeemPointsChange`. Renders item list with quantities/prices, `CouponForm`, loyalty points slider, subtotal, discount, loyalty deduction, shipping fee (or Free), VAT notice, and calculated total. |
| **`CouponForm`** | `src/components/checkout/CouponForm.tsx` | Rendered inside `OrderSummary`. Handles coupon code submission via `useCartStore().applyCoupon(code)`. Shows applied coupon chip with remove button. |
| **`Turnstile`** | `@marsidev/react-turnstile` | React wrapper for Cloudflare Turnstile widget. Rendered with `siteKey={TURNSTILE_SITE_KEY}` and `onSuccess={(token) => setTurnstileToken(token)}`. |

---

## 5. Analysis of Cart Store & API Integration

### A. Cart Store (`src/store/cartStore.ts`)
- Zustand store with persistence key `'aura-cart-storage'`.
- Core state: `items` (`CartItem[]`), `coupon` (`{ id, code, type, value } | null`), `isCartOpen`.
- Helper getters:
  - `getCartSubtotal()`: sum of `item.price * item.quantity`.
  - `getDiscountAmount()`: calculates discount based on `coupon.type` ('percent' or 'fixed').
  - `getCartTotal()`: `Math.max(0, subtotal - discountAmount)`.
- Actions:
  - `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `updatePrices`, `applyCoupon`, `removeCoupon`, `syncCart`.

### B. Checkout API (`src/lib/checkout-api.ts`)
- Encapsulates fetch calls using `apiFetch`.
- **`postCheckout(payload, idempotencyKey)`**:
  - Sends POST to `/api/checkout`.
  - Header: `'Idempotency-Key': idempotencyKey` (UUID format generated via `crypto.randomUUID()`).
  - Payload structure:
    ```json
    {
      "items": [{ "id": "var_1", "product_id": "prod_1", "quantity": 1, "price": 1000 }],
      "email": "user@example.com",
      "selected_address_id": "addr_123", // or guest_address object
      "guest_address": { ... },
      "coupon_code": "DISCOUNT10",
      "redeem_points": 500,
      "is_b2b": false,
      "b2b_company": "",
      "b2b_vat_id": "",
      "accepts_marketing": true,
      "turnstile_token": "0.xxxx"
    }
    ```

### C. Form Submission Flow Specification
1. **Trigger**: User submits the checkout form (`onSubmit={handleSubmit}`).
2. **Pre-submit Check / Validation**:
   - Ensure cart is not empty (`items.length > 0`).
   - Ensure email is provided.
   - If guest: ensure guest address fields (first name, last name, address_1, city, postcode) are provided.
   - If authenticated: ensure `selectedAddressId` or guest address is selected.
   - Ensure Turnstile token is available if `TURNSTILE_SITE_KEY` is present.
3. **State Updates**:
   - Set `isSubmitting(true)`.
   - Clear previous `submitError`.
4. **Idempotency Key**:
   - Generate key: `const idempotencyKey = crypto.randomUUID();`.
5. **API Call**:
   - Execute `const res = await postCheckout(payload, idempotencyKey);`.
6. **Response Handling**:
   - **Success (`res.success === true`)**:
     - If `res.checkout_url` is provided and `isTrustedCheckoutUrl(res.checkout_url)` is true:
       - Redirect to `res.checkout_url` (Stripe Checkout).
     - Else if `res.order_id` is provided:
       - Call `clearCart()`.
       - Redirect to `/checkout/success?order_id=${res.order_id}` using `router.push()`.
   - **Failure (`res.success === false` or thrown error)**:
     - Set `submitError` state to `res.error` or generic failure message.
     - Reset `isSubmitting(false)`.

---

## 6. Proposed Fixed Architecture for `checkout/page.tsx`

To resolve all findings, `checkout/page.tsx` must be refactored into:

```tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContactForm } from '../../components/checkout/ContactForm';
import { AddressSelector, GuestAddress } from '../../components/checkout/AddressSelector';
import { B2bGdprSection } from '../../components/checkout/B2bGdprSection';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { Turnstile } from '@marsidev/react-turnstile';
import { isTrustedCheckoutUrl } from '../../lib/url';
import { postCheckout } from '../../lib/checkout-api';
import { alertErrorStyle, alertWarnStyle } from '../../lib/styles';
import { useShippingEstimate } from '../../hooks/useShippingEstimate';
import { useCheckoutData } from '../../hooks/useCheckoutData';
import { usePriceValidation } from '../../hooks/usePriceValidation';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
const TURNSTILE_MISSING_IN_PROD = isProd && !TURNSTILE_SITE_KEY;

const EMPTY_GUEST: GuestAddress = {
  first_name: '',
  last_name: '',
  company: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'VN',
  phone: '',
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p>
      </main>
    }>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const { items, getCartSubtotal, coupon, clearCart, updatePrices } = useCartStore();
  const { isAuthenticated, customer } = useAuthStore();
  const searchParams = useSearchParams();

  const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);

  const priceChanged = usePriceValidation(items, updatePrices);

  const {
    email, setEmail,
    savedAddresses, selectedAddressId, setSelectedAddressId,
    addressError, loyaltyBalance,
    acceptsMarketing, setAcceptsMarketing,
    isB2B, setIsB2B, b2bCompany, setB2bCompany, b2bVatId, setB2bVatId,
  } = useCheckoutData(isAuthenticated, customer);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activePostcode = isAuthenticated && selectedAddressId
    ? savedAddresses.find(a => a.id === selectedAddressId)?.postcode || ''
    : guestAddress.postcode;

  const { shippingFeeCents, shippingLoading } = useShippingEstimate(activePostcode);

  const subtotalCents = getCartSubtotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }
    if (!email) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        items: items.map(i => ({
          id: i.id,
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
        email,
        selected_address_id: isAuthenticated ? selectedAddressId : undefined,
        guest_address: !isAuthenticated || !selectedAddressId ? guestAddress : undefined,
        coupon_code: coupon?.code,
        redeem_points: redeemPoints,
        is_b2b: isB2B,
        b2b_company: isB2B ? b2bCompany : undefined,
        b2b_vat_id: isB2B ? b2bVatId : undefined,
        accepts_marketing: acceptsMarketing,
        turnstile_token: turnstileToken,
      };

      const res = await postCheckout(payload, idempotencyKey);

      if (res && res.success) {
        if (res.checkout_url && isTrustedCheckoutUrl(res.checkout_url)) {
          window.location.href = res.checkout_url;
        } else if (res.order_id) {
          clearCart();
          router.push(`/checkout/success?order_id=${res.order_id}`);
        } else {
          setSubmitError('Checkout completed but no order ID was returned.');
          setIsSubmitting(false);
        }
      } else {
        setSubmitError(res?.error || 'Checkout failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred during checkout.');
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <h2>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)', margin: '20px 0' }}>Add items to your cart before proceeding to checkout.</p>
        <Link href="/products"><button className="btn">Continue Shopping</button></Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      {priceChanged && (
        <div style={alertWarnStyle}>
          ⚠️ Some item prices in your cart were updated to match current catalog pricing.
        </div>
      )}
      {submitError && (
        <div style={alertErrorStyle}>
          {submitError}
        </div>
      )}
      {addressError && (
        <div style={alertWarnStyle}>
          {addressError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px' }}>
        <div>
          <ContactForm email={email} onChangeEmail={setEmail} />
          <AddressSelector
            isAuthenticated={isAuthenticated}
            savedAddresses={savedAddresses}
            selectedAddressId={selectedAddressId}
            guestAddress={guestAddress}
            onChangeSelectedAddressId={setSelectedAddressId}
            onChangeGuestAddress={setGuestAddress}
          />
          <B2bGdprSection
            isB2B={isB2B}
            b2bCompany={b2bCompany}
            b2bVatId={b2bVatId}
            acceptsMarketing={acceptsMarketing}
            onChangeIsB2B={setIsB2B}
            onChangeB2bCompany={setB2bCompany}
            onChangeB2bVatId={setB2bVatId}
            onChangeAcceptsMarketing={setAcceptsMarketing}
          />

          {TURNSTILE_SITE_KEY && (
            <div style={{ marginBottom: '24px' }}>
              <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 600 }}
          >
            {isSubmitting ? 'Processing Order...' : 'Complete Order'}
          </button>
        </div>

        <div>
          <OrderSummary
            items={items}
            isB2B={isB2B}
            subtotal={subtotalCents}
            shippingFeeCents={shippingFeeCents}
            isCalculating={shippingLoading}
            loyaltyBalance={loyaltyBalance}
            redeemPoints={redeemPoints}
            onRedeemPointsChange={setRedeemPoints}
          />
        </div>
      </form>
    </main>
  );
}
```

---

## 7. Summary & Hand-off Checklist

- [x] Identified duplicate state line numbers (41 & 53).
- [x] Identified recursive rendering lines (61–65) & truncated function body after line 59.
- [x] Analyzed usages of `useCheckoutData`, `useShippingEstimate`, and `usePriceValidation`.
- [x] Documented rendering for `ContactForm`, `AddressSelector`, `B2bGdprSection`, `OrderSummary`, and `Turnstile`.
- [x] Documented missing `EMPTY_GUEST` definition.
- [x] Documented complete `postCheckout` form submission flow with UUID idempotency key, loading state, error display, cart clearing, and redirects.
