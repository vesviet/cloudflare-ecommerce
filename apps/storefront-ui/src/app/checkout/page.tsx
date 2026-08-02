"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ContactForm } from '../../components/checkout/ContactForm';
import { AddressSelector, GuestAddress } from '../../components/checkout/AddressSelector';
import { B2bGdprSection } from '../../components/checkout/B2bGdprSection';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { Turnstile } from '@marsidev/react-turnstile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
const TURNSTILE_MISSING_IN_PROD = isProd && !TURNSTILE_SITE_KEY;

if (TURNSTILE_MISSING_IN_PROD) {
  console.error('[Checkout] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set in production. Turnstile protection is disabled.');
}

// Only ever redirect to an HTTPS Stripe-hosted checkout URL. Prevents an
// open-redirect if the API response is ever tampered with.
function isTrustedCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'stripe.com' || u.hostname.endsWith('.stripe.com'));
  } catch {
    return false;
  }
}

const EMPTY_GUEST: GuestAddress = {
  first_name: '', last_name: '', company: '',
  address_1: '', address_2: '', city: '',
  state: '', postcode: '', country: 'VN', phone: '',
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p></main>}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const { items, getCartSubtotal, coupon } = useCartStore();
  const { isAuthenticated, customer } = useAuthStore();
  const searchParams = useSearchParams();
  const updatePrices = useCartStore((s: any) => s.updatePrices);

  // --- State ---
  const [email, setEmail] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);
  const [isB2B, setIsB2B] = useState(false);
  const [b2bCompany, setB2bCompany] = useState('');
  const [b2bVatId, setB2bVatId] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });
  const [priceChanged, setPriceChanged] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [addressError, setAddressError] = useState(''); // S8: address fetch error state
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);

  // S1: Server-authoritative shipping fee (in cents). Default=5000 while fetching.
  const [shippingFeeCents, setShippingFeeCents] = useState<number>(5000);
  const [shippingLoading, setShippingLoading] = useState(false);

  // S3: Idempotency key — generated once on mount, regenerated after successful submit.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setUtm({
      source: searchParams.get('utm_source') || '',
      medium: searchParams.get('utm_medium') || '',
      campaign: searchParams.get('utm_campaign') || '',
    });
    if (searchParams.get('cancelled') === 'true') {
      setErrorMessage('Payment was cancelled. Your cart has been preserved — you can try again.');
    }
  }, [searchParams]);

  // S1: Fetch shipping estimate from server whenever the active postcode changes.
  const fetchShippingEstimate = useCallback(async (postcode: string) => {
    setShippingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/checkout/shipping-estimate?postcode=${encodeURIComponent(postcode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.shipping_fee_cents === 'number') {
          setShippingFeeCents(data.shipping_fee_cents);
        }
      }
    } catch {
      // Fail open: keep the current estimate, do not block checkout
    } finally {
      setShippingLoading(false);
    }
  }, []);

  // Derive active postcode from selected source (authenticated vs guest)
  const activePostcode = isAuthenticated && selectedAddressId
    ? savedAddresses.find(a => a.id === selectedAddressId)?.postcode || ''
    : guestAddress.postcode;

  useEffect(() => {
    fetchShippingEstimate(activePostcode);
  }, [activePostcode, fetchShippingEstimate]);

  // S8: Load user data with explicit error handling for each fetch
  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !customer) return;
    setEmail(customer.email);

    if (customer.company_name) {
      setIsB2B(true);
      setB2bCompany(customer.company_name);
      setB2bVatId(customer.vat_tax_id || '');
    }

    if (customer.accepts_marketing) {
      setAcceptsMarketing(customer.accepts_marketing === 1);
    }

    // Address fetch — explicit error boundary so failures are surfaced to user
    try {
      const res = await fetch(`${API_BASE}/api/customer/addresses`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Address fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setSavedAddresses(data.data);
        const def = data.data.find((a: any) => a.is_default_shipping === 1) || data.data[0];
        setSelectedAddressId(def.id);
      }
    } catch (e) {
      console.error('[Checkout] Address fetch failed:', e);
      setAddressError('Could not load saved addresses. Please enter your address below.');
      // Graceful: show guest form as fallback — do not block checkout
    }

    // Loyalty fetch — failures are non-blocking
    try {
      const loyaltyRes = await fetch(`${API_BASE}/api/customer/loyalty`, { credentials: 'include' });
      if (loyaltyRes.ok) {
        const loyaltyData = await loyaltyRes.json();
        if (loyaltyData.success) {
          setLoyaltyBalance(loyaltyData.data.balance);
        }
      }
    } catch {
      setLoyaltyBalance(0); // non-blocking, loyalty just won't be shown
    }
  }, [isAuthenticated, customer]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  // S5: Batch price validation — single request replaces N+1 sequential loop.
  // Handles both simple and variable products (variation_id vs product_id lookup).
  useEffect(() => {
    if (items.length === 0) return;
    const validatePrices = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/checkout/validate-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // DEF-004 FIX: Guard against items with undefined product_id (legacy cart hydration)
            items: items
              .filter(item => item.id && (item.product_id || item.id))
              .map(item => ({ id: item.id, product_id: item.product_id ?? item.id })),
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.updates)) {
          const priceUpdates = data.updates
            .filter((u: any) => {
              const localItem = items.find(i => i.id === u.id);
              return localItem && localItem.price !== u.price;
            })
            .map((u: any) => ({ id: u.id, price: u.price }));

          if (priceUpdates.length > 0) {
            updatePrices(priceUpdates);
            setPriceChanged(true);
          }
        }
      } catch {
        // fail silently — price validation is best-effort
      }
    };
    validatePrices();
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // DEF-005 FIX: When address fetch failed and user is authenticated, they fall back
    // to guestAddress form. Validate it has at least address_1 + phone before submitting.
    if (addressError || !isAuthenticated) {
      if (!guestAddress.address_1?.trim() || !guestAddress.phone?.trim()) {
        setStatus('error');
        setErrorMessage('Please enter your shipping address and phone number before proceeding.');
        return;
      }
    }
    
    if (!turnstileToken) {
      setStatus('error');
      setErrorMessage('Please complete the security check (Turnstile) before proceeding.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId) || null;
    // S8: if addressError was set and user is authenticated with no addresses, use guestAddress
    const shippingAddressJson = (isAuthenticated && selectedAddress && !addressError) ? selectedAddress : guestAddress;

    const finalAddressJson = shippingAddressJson ? { ...shippingAddressJson } : null;
    if (finalAddressJson && isB2B && b2bCompany) {
      (finalAddressJson as any).company = b2bCompany;
      (finalAddressJson as any).vat_id = b2bVatId;
    }

    const payload: Record<string, any> = {
      email,
      customer_id: customer?.id || undefined,
      shipping_address_json: finalAddressJson,
      items: items.map(item => ({ variation_id: item.id, quantity: item.quantity })),
      accepts_marketing: acceptsMarketing,
      turnstileToken,
    };

    if (redeemPoints > 0) payload.redeem_points = redeemPoints;

    if (coupon?.code) payload.coupon_code = coupon.code;
    if (utm.source) payload.utm_source = utm.source;
    if (utm.medium) payload.utm_medium = utm.medium;
    if (utm.campaign) payload.utm_campaign = utm.campaign;
    if (isB2B) {
      payload.b2b_company = b2bCompany;
      payload.b2b_vat_id = b2bVatId;
    }

    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // S3: Send idempotency key to prevent double-order on double-click/retry
          'Idempotency-Key': idempotencyKey.current,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.checkout_url && isTrustedCheckoutUrl(data.checkout_url)) {
        // Regenerate key so a future retry (e.g. after browser back) gets a fresh key
        idempotencyKey.current = crypto.randomUUID();
        window.location.href = data.checkout_url;
      } else if (data.success && data.checkout_url) {
        setStatus('error');
        setErrorMessage('Received an unexpected checkout URL. Please try again.');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to place order. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'A network error occurred. Please try again.');
    }
  };

  if (!mounted) {
    return <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading checkout...</p></main>;
  }

  if (items.length === 0) {
    return (
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ marginBottom: '20px' }}>Your Cart is Empty</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Add some premium gear to your cart before checking out.</p>
        <Link href="/"><button className="btn">Browse Catalog</button></Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1040px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: '40px' }}>Checkout</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Left: Form */}
        <div className="glass glass-card" style={{ padding: '32px' }}>
          {priceChanged && (
            <div role="alert" style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '20px', color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Some prices were updated since you added items. Your total reflects the latest prices.
            </div>
          )}

          {/* S8: Surface address fetch errors gracefully */}
          {addressError && (
            <div role="alert" style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '20px', color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ {addressError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <ContactForm email={email} onChangeEmail={setEmail} />
            
            <AddressSelector 
              isAuthenticated={isAuthenticated && !addressError}
              savedAddresses={savedAddresses}
              selectedAddressId={selectedAddressId}
              guestAddress={guestAddress}
              onChangeSelectedAddressId={setSelectedAddressId}
              onChangeGuestAddress={setGuestAddress}
            />

            <B2bGdprSection 
              isB2B={isB2B} b2bCompany={b2bCompany} b2bVatId={b2bVatId} acceptsMarketing={acceptsMarketing}
              onChangeIsB2B={setIsB2B} onChangeB2bCompany={setB2bCompany} onChangeB2bVatId={setB2bVatId} onChangeAcceptsMarketing={setAcceptsMarketing}
            />

            {(utm.source || utm.medium || utm.campaign) && (
              <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '8px', fontSize: '0.78rem', color: 'rgba(74,222,128,0.7)' }}>
                📊 Attribution tracked: {[utm.source, utm.medium, utm.campaign].filter(Boolean).join(' / ')}
              </div>
            )}

            {errorMessage && (
              <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.9rem' }}>
                ✕ {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            {TURNSTILE_MISSING_IN_PROD ? (
              <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.9rem' }}>
                Security check is not configured. Please contact support.
              </div>
            ) : (
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setErrorMessage('Turnstile verification failed. Please try again.')}
                options={{ theme: 'auto' }}
              />
            )}
          </div>

          <button
            className="btn" type="submit"
            disabled={status === 'loading' || TURNSTILE_MISSING_IN_PROD}
            style={{ width: '100%', padding: '16px', fontSize: '1.05rem', letterSpacing: '0.02em', opacity: TURNSTILE_MISSING_IN_PROD ? 0.6 : 1, cursor: TURNSTILE_MISSING_IN_PROD ? 'not-allowed' : 'pointer' }}
          >
              {status === 'loading' ? 'Redirecting to payment...' : '🔒 Proceed to Payment'}
            </button>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
              You will be redirected to Stripe's secure checkout to complete your payment.
            </p>
          </form>
        </div>

        {/* Right: Order Summary */}
        <OrderSummary 
          items={items}
          isB2B={isB2B}
          subtotal={getCartSubtotal()}
          shippingFeeCents={shippingFeeCents}
          isCalculating={status === 'loading' || shippingLoading}
          loyaltyBalance={loyaltyBalance}
          redeemPoints={redeemPoints}
          onRedeemPointsChange={setRedeemPoints}
        />
      </div>
    </main>
  );
}
