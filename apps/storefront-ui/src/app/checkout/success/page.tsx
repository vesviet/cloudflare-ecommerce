"use client";

import React, { useEffect, Suspense } from 'react';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </main>
    }>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const { clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const searchParams = useSearchParams();

  const orderId = searchParams.get('order_id');
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : '';

  // Clear local cart state on mount (intentional fallback safety net after order completion / payment redirect)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <main style={{ maxWidth: '640px', margin: '80px auto', padding: '0 20px' }}>
      <div className="glass glass-card" style={{ padding: '60px 40px', textAlign: 'center' }}>

        {/* Success icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(99,102,241,0.2))',
          border: '2px solid rgba(74,222,128,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: '2.5rem',
        }}>
          ✓
        </div>

        <h1 style={{ marginBottom: '12px', color: 'var(--accent-color)', fontSize: '2rem' }}>
          Order Confirmed!
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '1rem', lineHeight: 1.6 }}>
          Thank you for your purchase. Your order has been received and is being processed.
        </p>

        {orderId && (
          <div style={{
            margin: '20px auto',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            display: 'inline-block',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Order Reference</p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>
              #{shortId}
            </p>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px', lineHeight: 1.6 }}>
          You will receive a confirmation email shortly. If you have any questions, contact our support team.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isAuthenticated && orderId ? (
            <Link href={`/my-account`}>
              <button className="btn" style={{ width: '100%', padding: '14px' }}>
                📦 Track My Order
              </button>
            </Link>
          ) : !isAuthenticated ? (
            <div style={{
              padding: '20px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '12px',
              marginBottom: '8px',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
                💡 <strong style={{ color: 'white' }}>Save time on your next order.</strong> Create an account to track orders and save your addresses.
              </p>
              <Link href="/my-account">
                <button className="btn" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                  Create Account
                </button>
              </Link>
            </div>
          ) : null}

          <Link href="/">
            <button
              className="btn"
              style={{
                width: '100%', padding: '14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              Continue Shopping
            </button>
          </Link>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', marginTop: '24px' }}>
          🔒 Secured by Stripe · Your payment information is never stored on our servers.
        </p>
      </div>
    </main>
  );
}
