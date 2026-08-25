"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/format';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // RMA Modal state
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [rmaReason, setRmaReason] = useState('');
  const [rmaError, setRmaError] = useState('');
  const [rmaSuccess, setRmaSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API_BASE}/customer/orders`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setOrders(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Order History</h2>
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <Package size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No orders yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>When you buy something, it will appear here.</p>
          <Link href="/"><button className="btn">Start Shopping</button></Link>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 0', textAlign: 'left' }}>Order ID</th>
              <th style={{ padding: '10px 0', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px 0', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '16px 0', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-color)' }}>#{order.id.slice(0, 8).toUpperCase()}</td>
                <td style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                <td style={{ padding: '16px 0' }}>
                  <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.07)', borderRadius: '20px', fontSize: '0.82rem', textTransform: 'capitalize', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  {(order.status === 'completed' || order.status === 'delivered') && (
                    <button 
                      onClick={() => { setSelectedOrder(order.id); setRmaReason(''); setRmaError(''); setRmaSuccess(''); }}
                      style={{ marginTop: '8px', padding: '4px 8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      Request Return
                    </button>
                  )}
                </td>
                <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>{formatCurrency(order.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#111', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '16px' }}>Request Return (RMA)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Order #{selectedOrder.slice(0,8).toUpperCase()}
            </p>
            {rmaError && <div style={{ color: '#ff4d4f', fontSize: '0.9rem', marginBottom: '16px' }}>{rmaError}</div>}
            {rmaSuccess ? (
              <div>
                <div style={{ color: '#52c41a', fontSize: '0.9rem', marginBottom: '16px' }}>{rmaSuccess}</div>
                <button onClick={() => setSelectedOrder(null)} className="btn" style={{ width: '100%' }}>Close</button>
              </div>
            ) : (
              <div>
                <textarea 
                  placeholder="Reason for return..." 
                  value={rmaReason}
                  onChange={(e) => setRmaReason(e.target.value)}
                  style={{ width: '100%', height: '80px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-muted)', marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSelectedOrder(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                  <button 
                    onClick={async () => {
                      if (rmaReason.length < 5) return setRmaError('Reason must be at least 5 characters');
                      setRmaError('');
                      try {
                        const res = await fetch(`${API_BASE}/rma`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ order_id: selectedOrder, reason: rmaReason }),
                          credentials: 'include'
                        });
                        const data = await res.json();
                        if (data.success) {
                          setRmaSuccess(`Return requested successfully! Status: ${data.status}`);
                          // optionally refresh orders
                          setOrders(orders.map(o => o.id === selectedOrder ? { ...o, status: data.status === 'refunded' ? 'refunded' : o.status } : o));
                        } else {
                          setRmaError(data.error || 'Failed to request return');
                        }
                      } catch (e: any) {
                        setRmaError(e.message);
                      }
                    }}
                    className="btn" style={{ flex: 1 }}>Submit</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
