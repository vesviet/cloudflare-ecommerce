"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Package } from 'lucide-react';
import Link from 'next/link';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api`;

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                </td>
                <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 600 }}>${(order.total_amount / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
