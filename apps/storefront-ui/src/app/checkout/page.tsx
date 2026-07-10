"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ContactForm } from '../../components/checkout/ContactForm';
import { AddressSelector, GuestAddress } from '../../components/checkout/AddressSelector';
import { B2bGdprSection } from '../../components/checkout/B2bGdprSection';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { Turnstile } from '@marsidev/react-turnstile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const FLAT_SHIPPING_FEE = 9.99;

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
  const { items, getCartSubtotal, updateQuantity, coupon } = useCartStore();
  const { isAuthenticated, customer } = useAuthStore();
  const searchParams = useSearchParams();

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
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);

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

    try {
      const res = await fetch(`${API_BASE}/api/customer/addresses`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setSavedAddresses(data.data);
        const def = data.data.find((a: any) => a.is_default_shipping === 1) || data.data[0];
        setSelectedAddressId(def.id);
      }
      
      const loyaltyRes = await fetch(`${API_BASE}/api/customer/loyalty`, { credentials: 'include' });
      const loyaltyData = await loyaltyRes.json();
      if (loyaltyData.success) {
        setLoyaltyBalance(loyaltyData.data.balance);
      }
    } catch (e) { console.error(e); }
  }, [isAuthenticated, customer]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  useEffect(() => {
    if (items.length === 0) return;
    const validatePrices = async () => {
      let changed = false;
      for (const item of items) {
        try {
          const res = await fetch(`${API_BASE}/api/products/${item.product_id}`);
          if (!res.ok) continue;
          const data = await res.json();
          const variation = data.data?.variations?.find((v: any) => v.id === item.id);
          if (variation) {
            const serverPrice = variation.sale_price ?? variation.regular_price;
            if (serverPrice !== item.price) {
              changed = true;
              updateQuantity(item.id, item.quantity);
            }
          }
        } catch { /* fail silently */ }
      }
      if (changed) setPriceChanged(true);
    };
    validatePrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    if (!turnstileToken) {
      setStatus('error');
      setErrorMessage('Please complete the security check (Turnstile) before proceeding.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId) || null;
    const shippingAddressJson = isAuthenticated && selectedAddress ? selectedAddress : guestAddress;

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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
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
            <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '20px', color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Some prices were updated since you added items. Your total reflects the latest prices.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setErrorMessage('Turnstile verification failed. Please try again.')}
                options={{ theme: 'auto' }}
              />
            </div>

            <button
              className="btn" type="submit"
              disabled={status === 'loading'}
              style={{ width: '100%', padding: '16px', fontSize: '1.05rem', letterSpacing: '0.02em' }}
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
          flatShippingFee={(isAuthenticated && savedAddresses.find(a => a.id === selectedAddressId)?.postcode?.startsWith('7')) || (!isAuthenticated && guestAddress?.postcode?.startsWith('7')) ? 30.00 : 50.00}
          isCalculating={status === 'loading'}
          loyaltyBalance={loyaltyBalance}
          redeemPoints={redeemPoints}
          onRedeemPointsChange={setRedeemPoints}
        />
      </div>
    </main>
  );
}
