"use client";

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!token) {
      setError('Liên kết không hợp lệ (thiếu token).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push('/my-account'), 1500);
      } else {
        setError(data.error || 'Đặt lại mật khẩu thất bại.');
      }
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: '480px', margin: '80px auto', padding: '0 20px', minHeight: '60vh' }}>
      <div className="glass glass-card" style={{ padding: '36px' }}>
        <h1 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.5rem' }}>Đặt lại mật khẩu</h1>

        {!token ? (
          <p style={{ color: '#f87171' }}>Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới từ trang quên mật khẩu.</p>
        ) : done ? (
          <p style={{ color: '#4ade80' }}>Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              required type="password" minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới (tối thiểu 8 ký tự, có chữ và số)"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <input
              required type="password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn" style={{ padding: '12px' }}>
              {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
