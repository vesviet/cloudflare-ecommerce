"use client";

import React, { useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function CartDrawer() {
  const { items, isCartOpen, toggleCart, removeItem, updateQuantity, getCartTotal } = useCartStore();

  // Prevent background scrolling when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={toggleCart}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 99,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      
      {/* Drawer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '450px',
          background: 'var(--bg-color)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={20} /> Your Cart
          </h2>
          <button onClick={toggleCart} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
              <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>Your cart is empty.</p>
              <button 
                onClick={toggleCart}
                className="btn" 
                style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(110deg, #161b22, #21262d)', borderRadius: '6px', flexShrink: 0, overflow: 'hidden' }}>
                  {item.image && <img src={`${API_BASE}${item.image}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{item.name}</h4>
                      {item.attributes?.name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Variant: {item.attributes.name}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red, #ff5858)', cursor: 'pointer', padding: 0 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                      <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}><Minus size={14} /></button>
                      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}><Plus size={14} /></button>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>
              <span>Total</span>
              <span>{formatCurrency(getCartTotal())}</span>
            </div>
            <Link href="/checkout" onClick={toggleCart} style={{ display: 'block' }}>
              <button className="btn" style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
                Proceed to Checkout
              </button>
            </Link>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </>
  );
}
