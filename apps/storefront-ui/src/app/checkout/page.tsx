"use client";

import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, getCartTotal, clearCart } = useCartStore();
  const { isAuthenticated, customer } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [orderId, setOrderId] = useState('');

  // Auto-fill email if logged in
  useEffect(() => {
    if (isAuthenticated && customer) {
      setEmail(customer.email);
      // Fetch default address
      fetch('http://localhost:8788/customer/addresses', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data.length > 0) {
            const defaultAddress = data.data.find((a: any) => a.is_default_shipping === 1) || data.data[0];
            setShippingAddress(defaultAddress);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated, customer]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setStatus('loading');
    setErrorMessage('');

    try {
      const payload = {
        email,
        customer_id: customer?.id || undefined,
        shipping_address_json: shippingAddress,
        items: items.map(item => ({
          variation_id: item.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch('http://localhost:8788/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setOrderId(data.orderId);
        clearCart();
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to place order.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error occurred.');
    }
  };

  if (status === 'success') {
    return (
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <div className="glass glass-card" style={{ padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h1 style={{ marginBottom: '20px', color: 'var(--accent-color)' }}>Order Confirmed!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem' }}>
            Thank you for your purchase. Your order ID is <strong>{orderId}</strong>.
          </p>
          <Link href="/">
            <button className="btn">Continue Shopping</button>
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Your Cart is Empty</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Add some premium gear to your cart before checking out.</p>
        <Link href="/">
          <button className="btn">Browse Catalog</button>
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1000px', margin: '40px auto' }}>
      <h1 style={{ marginBottom: '40px' }}>Checkout</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
        
        {/* Left: Form */}
        <div className="glass glass-card">
          <h2 style={{ marginBottom: '24px', fontSize: '1.4rem' }}>Contact Information</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }} 
              />
            </div>

            <h2 style={{ marginBottom: '24px', marginTop: '40px', fontSize: '1.4rem' }}>Shipping Address</h2>
            
            {isAuthenticated && shippingAddress ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>{shippingAddress.alias}</h3>
                  <Link href="/dashboard"><span style={{ color: 'var(--accent-color)', fontSize: '0.9rem', cursor: 'pointer' }}>Change</span></Link>
                </div>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  {shippingAddress.first_name} {shippingAddress.last_name}<br/>
                  {shippingAddress.address_1} {shippingAddress.address_2 ? `, ${shippingAddress.address_2}` : ''}<br/>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postcode}<br/>
                  {shippingAddress.country}<br/>
                  {shippingAddress.phone}
                </p>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                <p>Please <Link href="/my-account" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>log in</Link> to use your saved addresses, or proceed as guest.</p>
                {/* Guest Address Form placeholder */}
              </div>
            )}

            {status === 'error' && (
              <div style={{ padding: '12px', background: 'rgba(255, 88, 88, 0.1)', color: '#ff5858', borderRadius: '8px', marginTop: '20px', border: '1px solid rgba(255, 88, 88, 0.2)' }}>
                {errorMessage}
              </div>
            )}

            <button 
              className="btn" 
              type="submit" 
              disabled={status === 'loading'}
              style={{ width: '100%', padding: '16px', marginTop: '40px', fontSize: '1.1rem' }}
            >
              {status === 'loading' ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="glass glass-card" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.4rem' }}>Order Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}></div>
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--text-main)', color: '#000', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.quantity}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.attributes ? Object.values(item.attributes).join(', ') : ''}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(getCartTotal())}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600, marginTop: '10px', color: '#fff' }}>
              <span>Total</span>
              <span>{formatCurrency(getCartTotal())}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
