import React, { useState, useEffect } from 'react';
import type { OrderData } from '../types';
import { apiFetch } from '../lib/apiFetch';

interface OrderDetailModalProps {
  orderId: string;
  API_BASE_URL: string;
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose, addToast }) => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/orders/${orderId}`);
        const result = await res.json();
        if (result.success) {
          setOrder(result.data);
        } else {
          addToast(result.error || 'Failed to fetch order details', 'error');
          onClose();
        }
      } catch (err: any) {
        addToast(err.message || 'Error fetching order', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId, onClose, addToast]);

  // Format monetary amounts (passed after /100 conversion from cents/base units) to VNĐ currency format
  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const getStatusBadge = (status: string | undefined) => {
    const statusColors: Record<string, { bg: string; color: string; border: string }> = {
      pending_payment: { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00', border: 'rgba(255,204,0,0.3)' },
      processing:      { bg: 'rgba(88,166,255,0.12)', color: '#58a6ff', border: 'rgba(88,166,255,0.3)' },
      completed:       { bg: 'rgba(75,210,143,0.12)', color: '#4bd28f', border: 'rgba(75,210,143,0.3)' },
      cancelled:       { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
      refunded:        { bg: 'rgba(255,88,88,0.12)', color: '#ff5858', border: 'rgba(255,88,88,0.3)' },
      failed:          { bg: 'rgba(255,88,88,0.08)', color: '#ff8888', border: 'rgba(255,88,88,0.2)' },
    };
    const sc = statusColors[status ?? 'pending_payment'] || statusColors['pending_payment'];
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        background: sc.bg,
        color: sc.color,
        border: `1px solid ${sc.border}`,
      }}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const parseAddress = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const shippingAddr = parseAddress(order?.shipping_address_json || null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" role="dialog" aria-modal="true" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading order details...</div>
        ) : !order ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Order not found.</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ marginBottom: '8px' }}>Order #{order.id.slice(0, 8).toUpperCase()}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>{new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {getStatusBadge(order.status)}
                </div>
              </div>
              <button className="btn-secondary" onClick={onClose}>✕ Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-main)' }}>Customer Information</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0' }}>
                  <strong>Email:</strong> {order.guest_email || order.customer_id || 'Guest'}
                </p>
              </div>

              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-main)' }}>Shipping Information</h3>
                {shippingAddr ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <div>{shippingAddr.first_name} {shippingAddr.last_name}</div>
                    <div>{shippingAddr.address_1} {shippingAddr.address_2}</div>
                    <div>{shippingAddr.city}, {shippingAddr.state} {shippingAddr.postcode}</div>
                    <div>{shippingAddr.country}</div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No shipping address provided.</p>
                )}
                {order.tracking_number && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>Tracking Information</p>
                    <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>{order.carrier_name}: {order.tracking_number}</p>
                  </div>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-main)' }}>Order Items</h3>
            <div className="form-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Product</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>SKU</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>Quantity</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Price</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: i < order.items!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '12px 16px' }}>{item.product_title || 'Unknown Product'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--accent-color)' }}>{item.sku || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(item.price_at_purchase / 100)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency((item.price_at_purchase * item.quantity) / 100)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '300px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency((order.total_amount - order.shipping_fee + (order.discounts?.reduce((sum, d) => sum + (d.discount_amount || 0), 0) ?? 0)) / 100)}</span>
                </div>
                {order.discounts && order.discounts.length > 0 && order.discounts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--success-accent)', fontSize: '0.85rem' }}>
                    <span>Discount ({d.coupon_code || 'Coupon'})</span>
                    <span>-{formatCurrency(d.discount_amount / 100)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_fee / 100)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--accent-color)' }}>{formatCurrency(order.total_amount / 100)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
