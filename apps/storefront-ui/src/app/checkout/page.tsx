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

if (TURNSTILE_MISSING_IN_PROD) {
  console.error('[Checkout] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set in production. Turnstile protection is disabled.');
}

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

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p>
        </main>
      }
    >
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
        items: items.map(i => ({ variation_id: i.id, quantity: i.quantity })),
        email,
        selected_address_id: isAuthenticated ? selectedAddressId : undefined,
        guest_address: !isAuthenticated || !selectedAddressId ? guestAddress : undefined,
        address: !isAuthenticated || !selectedAddressId ? {
          fullname: guestAddress.fullName || `${guestAddress.first_name || ''} ${guestAddress.last_name || ''}`.trim(),
          address: guestAddress.addressLine1 || guestAddress.address_1 || '',
          zipcode: guestAddress.postcode,
        } : undefined,
        coupon_code: coupon?.code,
        redeem_points: redeemPoints,
        is_b2b: isB2B,
        b2b_company: isB2B ? b2bCompany : undefined,
        b2b_vat_id: isB2B ? b2bVatId : undefined,
        accepts_marketing: acceptsMarketing,
        turnstileToken: turnstileToken,
      };

      const res = await postCheckout(payload, idempotencyKey);

      if (res && res.success) {
        if (res.checkout_url && isTrustedCheckoutUrl(res.checkout_url)) {
          window.location.href = res.checkout_url;
        } else if (res.order_id) {
          clearCart();
          router.push(`/checkout/success?order_id=${res.order_id}`);
        } else {
          clearCart();
          router.push('/checkout/success');
        }
      } else {
        setSubmitError(res?.error || 'Checkout failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'An error occurred while processing checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p>
      </main>
    );
  }

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
