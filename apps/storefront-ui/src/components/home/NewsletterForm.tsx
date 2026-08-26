"use client";

import React, { useState } from 'react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'homepage' }),
      });
    } catch { /* silent-duplicate policy */ }
    setDone(true);
  };

  return (
    <section style={{ maxWidth: '640px', margin: '60px auto 80px', padding: '0 20px', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Nhận ưu đãi độc quyền</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '18px' }}>
        Đăng ký để không bỏ lỡ flash sale và mã giảm giá mới nhất.
      </p>
      {done ? (
        <p style={{ color: '#4ade80', fontWeight: 600 }}>✓ Cảm ơn bạn! Kiểm tra hộp thư nhé.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '480px', margin: '0 auto' }}>
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email đăng ký nhận tin"
            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <button type="submit" className="btn" style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>Đăng ký</button>
        </form>
      )}
    </section>
  );
}
