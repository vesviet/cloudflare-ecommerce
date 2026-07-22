"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrdersPage() {
  const { isAuthenticated, customer } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/my-account');
      return;
    }

    const fetchOrders = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';
        const res = await fetch(`${apiBase}/api/customer/orders`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, router]);

  if (!isAuthenticated || loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading orders...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', minHeight: '60vh' }}>
      <h1 style={{ color: 'var(--text-main)', marginBottom: '24px' }}>Order History</h1>
      {orders.length === 0 ? (
        <div className="glass glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          You have no orders yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order.id} className="glass glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--text-main)', margin: '0 0 8px 0', fontFamily: 'monospace' }}>#{order.id.slice(0,8).toUpperCase()}</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                  {new Date(order.created_at).toLocaleDateString()} &middot; <strong style={{ textTransform: 'capitalize', color: 'var(--accent-color)' }}>{order.status.replace('_', ' ')}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                  Total: ${(order.total_amount / 100).toFixed(2)}
                </p>
              </div>
              <Link href={`/orders/${order.id}`}>
                <button className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)' }}>View Details</button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
