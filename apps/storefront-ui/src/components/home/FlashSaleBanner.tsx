"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../lib/format';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

interface FlashItem {
  item_id: string;
  product_id: string;
  title: string | null;
  slug: string | null;
  price: number;
  quota: number;
  sold_quantity: number;
  left: number | null;
  sold_out: boolean;
}

interface FlashSaleData {
  id: string;
  name: string;
  ends_at: number | null;
  items: FlashItem[];
}

function useCountdown(endsAt: number | null): string {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!endsAt) return '';
  const diff = Math.max(0, endsAt - now);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function FlashSaleBanner() {
  const [sale, setSale] = useState<FlashSaleData | null>(null);
  const countdown = useCountdown(sale?.ends_at ?? null);

  useEffect(() => {
    fetch(`${API_BASE}/flash-sales`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data) setSale(data.data);
      })
      .catch(() => { /* silent — banner is optional */ });
  }, []);

  if (!sale || sale.items.length === 0) return null;

  return (
    <section style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      <div className="glass glass-card" style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, color: '#ef4444', fontSize: '1.4rem', fontWeight: 800 }}>
            ⚡ {sale.name}
          </h2>
          {sale.ends_at && (
            <span style={{
              fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              padding: '6px 14px', borderRadius: '8px', color: '#fca5a5',
            }} aria-label="Flash sale countdown">
              {countdown}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {sale.items.map((item) => {
            const href = item.slug ? `/product/${item.slug}` : `/product/${item.product_id}`;
            return (
              <Link key={item.item_id} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '16px',
                  height: '100%', opacity: item.sold_out ? 0.55 : 1,
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem' }}>
                    {item.title || item.product_id.slice(0, 8)}
                  </p>
                  <p style={{ margin: 0, color: '#ef4444', fontWeight: 800, fontSize: '1.15rem' }}>
                    {formatCurrency(item.price)}
                  </p>
                  {item.quota > 0 && (
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {item.sold_out ? '🔥 Hết suất' : `Còn ${item.left}/${item.quota} suất`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
