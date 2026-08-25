"use client";

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/format';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // RMA State
  const [rmaEnabled, setRmaEnabled] = useState(false);
  const [showRmaForm, setShowRmaForm] = useState(false);
  const [rmaReason, setRmaReason] = useState('');
  const [rmaSubmitting, setRmaSubmitting] = useState(false);
  const [rmaSuccess, setRmaSuccess] = useState(false);
  const [rmaError, setRmaError] = useState('');

  // T1.3: self-cancel + reorder state
  const CANCELLABLE_STATUSES = ['pending_payment', 'pending', 'confirmed'];
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/my-account');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Order
        const orderRes = await fetch(`${apiBase}/api/customer/orders/${id}`, { credentials: 'include' });
        const orderData = await orderRes.json();
        if (orderData.success) {
          setOrder(orderData.data);
        }
        
        // Fetch Feature Flags for Progressive Delivery
        const ffRes = await fetch(`${apiBase}/api/feature-flags`);
        const ffData = await ffRes.json();
        if (ffData.success && ffData.data.rma_self_service) {
          setRmaEnabled(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router, id]);

  const handleRmaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRmaSubmitting(true);
    setRmaError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';
      const res = await fetch(`${apiBase}/api/rma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          reason: rmaReason
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setRmaSuccess(true);
        setShowRmaForm(false);
      } else {
        setRmaError(data.error || 'Failed to submit RMA request');
      }
    } catch (err: any) {
      setRmaError('Network error submitting RMA');
    } finally {
      setRmaSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Huỷ đơn hàng này? Kho sẽ được hoàn lại tự động.')) return;
    setCancelling(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/customer/orders/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: 'ok', text: 'Đơn hàng đã được huỷ. Kho đã được hoàn lại.' });
        setOrder((prev: any) => ({ ...prev, status: 'cancelled' }));
      } else {
        setActionMsg({ type: 'err', text: data.error || 'Không thể huỷ đơn hàng.' });
      }
    } catch {
      setActionMsg({ type: 'err', text: 'Lỗi mạng khi huỷ đơn.' });
    }
    setCancelling(false);
  };

  const handleReorder = async () => {
    setReordering(true);
    setActionMsg(null);
    try {
      const { useCartStore } = await import('../../../store/cartStore');
      const cart = useCartStore.getState();
      const res = await fetch(`${apiBase}/api/customer/orders/${id}/reorder`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        setActionMsg({ type: 'err', text: data.error || 'Không thể đặt lại đơn hàng.' });
      } else if ((data.data.items || []).length === 0) {
        setActionMsg({ type: 'err', text: 'Các sản phẩm trong đơn này hiện không còn khả dụng.' });
      } else {
        for (const item of data.data.items) {
          cart.addItem({
            id: item.product_id,
            product_id: item.product_id,
            name: item.title || item.sku || item.product_id,
            price: Number(item.price),
            quantity: Number(item.quantity),
          });
        }
        const skippedCount = (data.data.skipped || []).length;
        setActionMsg({
          type: 'ok',
          text: `Đã thêm ${data.data.items.length} sản phẩm vào giỏ hàng.` + (skippedCount > 0 ? ` (${skippedCount} sản phẩm không còn hàng)` : ''),
        });
      }
    } catch {
      setActionMsg({ type: 'err', text: 'Lỗi mạng khi đặt lại đơn.' });
    }
    setReordering(false);
  };

  if (!isAuthenticated || loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading order details...</div>;
  }

  if (!order) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Order not found.</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', minHeight: '60vh' }}>
      <Link href="/orders" style={{ color: 'var(--accent-color)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to Orders
      </Link>
      
      <div className="glass glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontFamily: 'monospace' }}>Order #{(typeof order.id === 'string' ? order.id.slice(0, 8) : String(order.id ?? '')).toUpperCase()}</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span style={{ 
            padding: '6px 12px', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--text-main)'
          }}>
            {(typeof order.status === 'string' ? order.status.replace('_', ' ') : 'Unknown')}
          </span>
        </div>

        <h3 style={{ color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Items</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {order.items && order.items.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-main)' }}>Product ID: {item.product_id.slice(0,8)} (x{item.quantity})</span>
              <span style={{ color: 'var(--text-main)' }}>{formatCurrency(item.price_at_purchase)}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 8px 0' }}>Shipping: {formatCurrency(order.shipping_fee)}</p>
          <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Total: {formatCurrency(order.total_amount)}</h2>
        </div>

        {/* T1.3: Self-cancel + reorder actions */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {CANCELLABLE_STATUSES.includes(order.status) && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="btn"
              style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '10px 18px' }}
            >
              {cancelling ? 'Đang huỷ...' : 'Huỷ đơn hàng'}
            </button>
          )}
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="btn"
            style={{ padding: '10px 18px' }}
          >
            {reordering ? 'Đang thêm...' : 'Đặt lại đơn này'}
          </button>
        </div>
        {actionMsg && (
          <div style={{
            marginTop: '14px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem',
            background: actionMsg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${actionMsg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: actionMsg.type === 'ok' ? '#4ade80' : '#f87171',
          }}>
            {actionMsg.text}
          </div>
        )}

        {/* RMA Self-Service Section (Feature Flag Gated) */}
        {rmaEnabled && (order.status === 'completed' || order.status === 'processing') && (
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {rmaSuccess ? (
              <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                Your refund request has been submitted successfully. Our team will review it shortly.
              </div>
            ) : showRmaForm ? (
              <form onSubmit={handleRmaSubmit} style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Request a Refund</h3>
                {rmaError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.9rem' }}>
                    <span>{rmaError}</span>
                  </div>
                )}
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Reason for return/refund:</label>
                <textarea 
                  required
                  value={rmaReason}
                  onChange={(e) => setRmaReason(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '15px' }}
                  placeholder="Please describe why you want to return this order..."
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowRmaForm(false)} className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>Cancel</button>
                  <button type="submit" disabled={rmaSubmitting} className="btn" style={{ background: '#ef4444', color: 'white' }}>
                    {rmaSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setShowRmaForm(true)}
                className="btn" 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-main)' }}
              >
                Request Refund
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
