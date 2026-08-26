"use client";

import React, { useState } from 'react';
import Link from 'next/link';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Generic response regardless of account existence
      setSent(true);
    } catch {
      setSent(true); // same UX on network error — no enumeration signal
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: '480px', margin: '80px auto', padding: '0 20px', minHeight: '60vh' }}>
      <div className="glass glass-card" style={{ padding: '36px' }}>
        <h1 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.5rem' }}>Quên mật khẩu?</h1>

        {sent ? (
          <>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.
              Vui lòng kiểm tra hộp thư (và cả mục Spam).
            </p>
            <Link href="/my-account" style={{ color: 'var(--accent-color)', display: 'inline-block', marginTop: '16px' }}>
              &larr; Về trang đăng nhập
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
            </p>
            <input
              required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <button type="submit" disabled={loading} className="btn" style={{ padding: '12px' }}>
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
            </button>
            <Link href="/my-account" style={{ color: 'var(--accent-color)' }}>&larr; Quay lại đăng nhập</Link>
          </form>
        )}
      </div>
    </main>
  );
}
