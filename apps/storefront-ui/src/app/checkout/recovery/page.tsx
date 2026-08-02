"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCartStore } from '../../../store/cartStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

export default function CartRecoveryPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>}>
      <CartRecoveryInner />
    </Suspense>
  );
}

function CartRecoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Khôi phục giỏ hàng của bạn...');

  useEffect(() => {
    const token = searchParams.get('token');

    const restoreCart = async () => {
      if (!token) {
        setStatus('Không tìm thấy phiên giỏ hàng. Chuyển hướng...');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/cart/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        if (res.status === 404) {
          setStatus('Link khôi phục không hợp lệ hoặc đã hết hạn.');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          const recovered = data.data || data;
          const items = Array.isArray(recovered) ? recovered : (recovered.items || []);
          const cartStore = useCartStore.getState();
          for (const item of items) {
            cartStore.addItem({
              id: item.variation_id || item.id,
              product_id: item.product_id,
              name: item.name || '',
              price: typeof item.price === 'string' ? parseInt(item.price, 10) : (item.price || 0),
              quantity: item.quantity || 1,
              image: item.image || item.image_url || '',
            });
          }
          setStatus('Giỏ hàng đã sẵn sàng! Đang chuyển đến trang thanh toán...');
          setTimeout(() => router.push('/checkout'), 1000);
        } else {
          setStatus(data?.error || 'Không thể khôi phục giỏ hàng. Đang chuyển hướng...');
          setTimeout(() => router.push('/'), 2500);
        }
      } catch {
        setStatus('Có lỗi xảy ra. Đang chuyển hướng...');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    restoreCart();
  }, [searchParams, router]);

  return (
    <main style={{ maxWidth: '600px', margin: '120px auto', textAlign: 'center', padding: '0 20px' }}>
      <div className="glass glass-card" style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div style={{ background: 'rgba(74,222,128,0.1)', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={48} color="#4ade80" style={{ animation: 'spin 2s linear infinite' }} />
        </div>
        
        <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Welcome Back!</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
          {status}
        </p>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </main>
  );
}
