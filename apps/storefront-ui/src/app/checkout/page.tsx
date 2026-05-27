"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Building2, ShieldCheck } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

// Flat rate shipping fee in dollars — matches backend FLAT_SHIPPING_FEE_CENTS / 100
const FLAT_SHIPPING_FEE = 9.99;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500,
};

interface GuestAddress {
  first_name: string; last_name: string; company: string;
  address_1: string; address_2: string; city: string;
  state: string; postcode: string; country: string; phone: string;
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
  const { items, getCartTotal, clearCart, updateQuantity } = useCartStore();
  const { isAuthenticated, customer } = useAuthStore();
  const searchParams = useSearchParams();

  // --- Contact ---
  const [email, setEmail] = useState('');

  // --- Addresses ---
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<GuestAddress>(EMPTY_GUEST);

  // --- B2B ---
  const [isB2B, setIsB2B] = useState(false);
  const [b2bCompany, setB2bCompany] = useState('');
  const [b2bVatId, setB2bVatId] = useState('');

  // --- GDPR ---
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);

  // --- UTM (extracted from URL) ---
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });

  // --- Price validation ---
  const [priceChanged, setPriceChanged] = useState(false);

  // --- Order status ---
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Extract UTM params on mount
  useEffect(() => {
    setUtm({
      source: searchParams.get('utm_source') || '',
      medium: searchParams.get('utm_medium') || '',
      campaign: searchParams.get('utm_campaign') || '',
    });

    // Handle Stripe cancel redirect
    if (searchParams.get('cancelled') === 'true') {
      setErrorMessage('Payment was cancelled. Your cart has been preserved — you can try again.');
    }
  }, [searchParams]);

  // Pre-fill from account profile
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
    } catch (e) { console.error(e); }
  }, [isAuthenticated, customer]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  // Server-side price validation — detect if prices changed since add-to-cart
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
              // Update cart with latest server price (quantity unchanged)
              updateQuantity(item.id, item.quantity);
            }
          }
        } catch { /* fail silently — server price will win at submit */ }
      }
      if (changed) setPriceChanged(true);
    };

    validatePrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId) || null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setStatus('loading');
    setErrorMessage('');

    const shippingAddressJson = isAuthenticated && selectedAddress
      ? selectedAddress
      : guestAddress;

    if (isB2B && b2bCompany) {
      (shippingAddressJson as any).company = b2bCompany;
      (shippingAddressJson as any).vat_id = b2bVatId;
    }

    const payload: Record<string, any> = {
      email,
      customer_id: customer?.id || undefined,
      shipping_address_json: shippingAddressJson,
      items: items.map(item => ({ variation_id: item.id, quantity: item.quantity })),
      accepts_marketing: acceptsMarketing ? 1 : 0,
    };

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
        // Redirect to Stripe hosted checkout — do NOT clearCart() here.
        // Cart is cleared on the /checkout/success page after Stripe confirms.
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

  // --- Empty cart screen ---
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

        {/* ─── Left: Form ─── */}
        <div className="glass glass-card" style={{ padding: '32px' }}>

          {/* Price change warning banner */}
          {priceChanged && (
            <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '20px', color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Some prices were updated since you added items. Your total reflects the latest prices.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* Section: Contact */}
            <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '28px', height: '28px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</span>
              Contact Information
            </h2>
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={inputStyle}
              />
            </div>

            {/* Section: Shipping Address */}
            <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '28px', height: '28px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</span>
              <MapPin size={18} /> Shipping Address
            </h2>

            {isAuthenticated && savedAddresses.length > 0 ? (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {savedAddresses.map(addr => (
                    <label
                      key={addr.id}
                      style={{ display: 'flex', gap: '14px', padding: '16px', background: selectedAddressId === addr.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedAddressId === addr.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <input
                        type="radio" name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginTop: '2px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{addr.alias}</strong>
                          {addr.is_default_shipping === 1 && (
                            <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '0.65rem', padding: '2px 7px', borderRadius: '20px', fontWeight: 700 }}>DEFAULT</span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {addr.first_name} {addr.last_name}{addr.company ? ` · ${addr.company}` : ''}<br />
                          {addr.address_1}{addr.address_2 ? `, ${addr.address_2}` : ''}<br />
                          {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode}, {addr.country}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '12px', color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'underline' }}>
                  + Manage addresses
                </Link>
              </div>
            ) : isAuthenticated && savedAddresses.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '28px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem' }}>No saved addresses yet.</p>
                <Link href="/dashboard"><button type="button" className="btn" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Add Address</button></Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <Link href="/my-account" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Sign in</Link> to use saved addresses, or fill in below as guest.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>First Name *</label><input style={inputStyle} required value={guestAddress.first_name} onChange={e => setGuestAddress({ ...guestAddress, first_name: e.target.value })} /></div>
                  <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} required value={guestAddress.last_name} onChange={e => setGuestAddress({ ...guestAddress, last_name: e.target.value })} /></div>
                </div>
                <div><label style={labelStyle}>Street Address *</label><input style={inputStyle} required value={guestAddress.address_1} onChange={e => setGuestAddress({ ...guestAddress, address_1: e.target.value })} placeholder="Street, House No." /></div>
                <div><label style={labelStyle}>Address Line 2</label><input style={inputStyle} value={guestAddress.address_2} onChange={e => setGuestAddress({ ...guestAddress, address_2: e.target.value })} placeholder="Apartment, Floor (Optional)" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>City *</label><input style={inputStyle} required value={guestAddress.city} onChange={e => setGuestAddress({ ...guestAddress, city: e.target.value })} /></div>
                  <div><label style={labelStyle}>State</label><input style={inputStyle} value={guestAddress.state} onChange={e => setGuestAddress({ ...guestAddress, state: e.target.value })} /></div>
                  <div><label style={labelStyle}>Postcode *</label><input style={inputStyle} required value={guestAddress.postcode} onChange={e => setGuestAddress({ ...guestAddress, postcode: e.target.value })} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Country *</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={guestAddress.country} onChange={e => setGuestAddress({ ...guestAddress, country: e.target.value })}>
                      <option value="VN">Vietnam</option>
                      <option value="US">United States</option>
                      <option value="SG">Singapore</option>
                      <option value="JP">Japan</option>
                      <option value="AU">Australia</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Phone</label><input type="tel" style={inputStyle} value={guestAddress.phone} onChange={e => setGuestAddress({ ...guestAddress, phone: e.target.value })} /></div>
                </div>
              </div>
            )}

            {/* Section: B2B */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: isB2B ? '14px' : 0 }}>
                <input
                  type="checkbox" checked={isB2B}
                  onChange={e => setIsB2B(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <Building2 size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.9rem' }}>This is a <strong>B2B / Business purchase</strong> (I need a VAT invoice)</span>
              </label>
              {isB2B && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
                  <div>
                    <label style={labelStyle}>Company Name *</label>
                    <input style={inputStyle} required={isB2B} value={b2bCompany} onChange={e => setB2bCompany(e.target.value)} placeholder="Your Company Ltd." />
                  </div>
                  <div>
                    <label style={labelStyle}>VAT / Tax ID</label>
                    <input style={inputStyle} value={b2bVatId} onChange={e => setB2bVatId(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              )}
            </div>

            {/* Section: GDPR Consent */}
            <div style={{ marginBottom: '28px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <input
                id="checkout-marketing"
                type="checkbox"
                checked={acceptsMarketing}
                onChange={e => setAcceptsMarketing(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0, accentColor: 'var(--accent-color)' }}
              />
              <label htmlFor="checkout-marketing" style={{ cursor: 'pointer', lineHeight: 1.5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <ShieldCheck size={14} color="var(--accent-color)" />
                  <strong style={{ fontSize: '0.88rem' }}>Marketing Consent (GDPR)</strong>
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  I agree to receive personalized promotions and newsletters from Aura. You can unsubscribe at any time.
                </span>
              </label>
            </div>

            {/* UTM attribution indicator */}
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

        {/* ─── Right: Order Summary ─── */}
        <div className="glass glass-card" style={{ padding: '28px', position: 'sticky', top: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Order Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '46px', height: '46px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--accent-color)', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>{item.quantity}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.attributes ? Object.values(item.attributes).join(', ') : ''}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(getCartTotal())}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span>Shipping</span>
              <span>${FLAT_SHIPPING_FEE.toFixed(2)}</span>
            </div>
            {isB2B && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>VAT (B2B)</span>
                <span>Invoiced separately</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-color)' }}>{formatCurrency(getCartTotal() + FLAT_SHIPPING_FEE * 100)}</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '16px', textAlign: 'center', lineHeight: 1.5 }}>
            🔒 Payments are encrypted and secured via Stripe.
          </p>
        </div>
      </div>
    </main>
  );
}
