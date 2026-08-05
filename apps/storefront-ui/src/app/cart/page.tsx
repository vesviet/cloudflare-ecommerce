"use client";

import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '../../lib/image';
import { formatCurrency } from '../../lib/format';
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import { CouponForm } from '../../components/checkout/CouponForm';

export default function Cart() {
  const { items, removeItem, updateQuantity, getCartTotal, getCartSubtotal, getDiscountAmount } = useCartStore();
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="glass glass-card" style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '60px 20px' }}>
        <ShoppingBag size={64} style={{ opacity: 0.2, margin: '0 auto 20px auto' }} />
        <h1 style={{ marginBottom: '16px' }}>Your Cart is Empty</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Looks like you haven't added anything to your cart yet.</p>
        <Link href="/" className="btn" style={{ padding: '12px 32px' }}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="glass glass-card" style={{ maxWidth: '1000px', margin: '40px auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
      <div>
        <h1 style={{ marginBottom: '24px' }}>Shopping Cart</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: '100px', height: '100px', background: '#161b22', borderRadius: '8px', overflow: 'hidden' }}>
                {item.image && <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{item.name}</h3>
                    {item.attributes?.name && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Variant: {item.attributes.name}</p>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{formatCurrency(item.price * item.quantity)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px' }}>
                    <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Decrease quantity"><Minus size={16} /></button>
                    <span style={{ width: '24px', textAlign: 'center' }} aria-live="polite">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Increase quantity"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#ff5858', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} aria-label="Remove item">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', position: 'sticky', top: '100px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px' }}>Order Summary</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <CouponForm />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-muted)' }}>
          <span>Subtotal</span>
          <span>{formatCurrency(getCartSubtotal())}</span>
        </div>
        
        {getDiscountAmount() > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#4ade80' }}>
            <span>Discount</span>
            <span>-{formatCurrency(getDiscountAmount())}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', fontSize: '1.3rem', fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent-color)' }}>{formatCurrency(getCartTotal())}</span>
        </div>

        <button 
          onClick={() => {
            setIsNavigating(true);
            router.push('/checkout');
          }}
          disabled={isNavigating}
          className="btn" 
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          {isNavigating ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  );
}
