"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
    
    // Simulate API call to restore cart from token
    const restoreCart = async () => {
      try {
        if (!token) {
          setStatus('Không tìm thấy phiên giỏ hàng. Chuyển hướng...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        // Mock delay for UI/UX demonstration (simulating fetch to /api/cart/recover)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setStatus('Giỏ hàng đã sẵn sàng! Đang chuyển đến trang thanh toán...');
        
        setTimeout(() => {
          router.push('/checkout');
        }, 1000);
      } catch (e) {
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
