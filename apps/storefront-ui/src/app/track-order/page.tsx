"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../lib/format';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'completed'];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.error || 'Không tìm thấy đơn hàng.');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;
  // Non-linear statuses (cancelled/refunded/failed/pending_payment/abandoned)
  // render as a plain badge instead of the progress steps.
  const isLinearFlow = order && currentStepIndex >= 0;

  return (
    <main style={{ maxWidth: '640px', margin: '80px auto', padding: '0 20px', minHeight: '60vh' }}>
      <h1 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.75rem' }}>Track Your Order</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.95rem' }}>
        Nhập mã đơn hàng và email đã dùng khi đặt hàng để xem trạng thái.
      </p>

      <form onSubmit={handleSubmit} className="glass glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mã đơn hàng *</label>
          <input
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Ví dụ: 550e8400-e29b-..."
            style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </div>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn" style={{ padding: '12px' }}>
          {loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}
        </button>
      </form>

      {order && (
        <div className="glass glass-card" style={{ padding: '24px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
              textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)',
            }}>
              {(order.status || '').replace('_', ' ')}
            </span>
          </div>

          {isLinearFlow ? (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
              {STATUS_STEPS.map((step, idx) => (
                <div key={step} title={step} style={{
                  flex: 1, height: '6px', borderRadius: '3px',
                  background: idx <= currentStepIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.12)',
                }} />
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {(order.items || []).map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.92rem' }}>
                <span style={{ color: 'var(--text-main)' }}>{item.title || item.product_id?.slice(0, 8)} (x{item.quantity})</span>
                <span style={{ color: 'var(--text-main)' }}>{formatCurrency(item.price_at_purchase)}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <p style={{ margin: '0 0 6px 0' }}>Shipping: {formatCurrency(order.shipping_fee)}</p>
            {Number(order.discount_amount) > 0 && (
              <p style={{ margin: '0 0 6px 0', color: '#4ade80' }}>Discount: -{formatCurrency(order.discount_amount)}</p>
            )}
            <h3 style={{ color: 'var(--text-main)', margin: 0 }}>Total: {formatCurrency(order.total_amount)}</h3>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '16px' }}>
            Đặt lúc: {new Date(order.created_at).toLocaleString('vi-VN')}
          </p>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '0.9rem' }}>
        <Link href="/" style={{ color: 'var(--accent-color)' }}>&larr; Về trang chủ</Link>
      </p>
    </main>
  );
}
