'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';

export default function LandingClient({ lp, comboRules, apiUrl }: { lp: any, comboRules: any[], apiUrl: string }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    comboId: comboRules.length > 0 ? comboRules[0].id : '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCombo = comboRules.find((c) => c.id === formData.comboId) || comboRules[0];

  useEffect(() => {
    // Inject Turnstile Script
    const script = document.createElement('script');
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Read turnstile token from the form
    const formElement = e.currentTarget;
    const formDataObj = new FormData(formElement);
    const tToken = formDataObj.get('cf-turnstile-response') as string;

    if (!tToken) {
      setErrorMsg('Vui lòng xác thực bạn không phải là robot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/landing-pages/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: lp.id,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_address: formData.address,
          customer_note: formData.note,
          selected_combo_id: formData.comboId,
          total_amount: selectedCombo ? selectedCombo.price : 0,
          turnstile_token: tToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Đặt hàng thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
        setFormData({ name: '', phone: '', address: '', note: '', comboId: formData.comboId });
        
        // Tracking Purchase event for FB/TikTok if window.fbq or window.ttq exists
        if (typeof window !== 'undefined') {
          const w = window as any;
          if (w.fbq && lp.facebook_pixel_id) {
             w.fbq('track', 'Purchase', { value: selectedCombo?.price, currency: 'VND' });
          }
          if (w.ttq && lp.tiktok_pixel_id) {
             w.ttq.track('CompletePayment', { value: selectedCombo?.price, currency: 'VND' });
          }
        }
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
      // Reset turnstile
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
        setTurnstileToken(null);
      }
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
          {lp.seo_title || 'Siêu Phẩm Mới'}
        </h1>
        {(() => {
          if (!lp.urgency_end_time) return null;
          let date: Date;
          if (typeof lp.urgency_end_time === 'number') {
            date = new Date(lp.urgency_end_time > 1e11 ? lp.urgency_end_time : lp.urgency_end_time * 1000);
          } else if (typeof lp.urgency_end_time === 'string') {
            const num = Number(lp.urgency_end_time);
            if (!isNaN(num)) {
              date = new Date(num > 1e11 ? num : num * 1000);
            } else {
              date = new Date(lp.urgency_end_time);
            }
          } else {
            date = new Date(lp.urgency_end_time);
          }
          if (isNaN(date.getTime())) return null;
          return (
            <p style={{ color: 'red', fontWeight: 'bold' }}>
              ⏳ Khuyến mãi kết thúc vào: {date.toLocaleString('vi-VN')}
            </p>
          );
        })()}
        {lp.urgency_fake_views > 0 && (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            🔥 Đang có {lp.urgency_fake_views} người đang xem trang này
          </p>
        )}
      </div>

      {/* Checkout Form */}
      <div style={{ backgroundColor: '#f9fafb', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px' }}>Đặt Hàng Ngay</h2>
        
        {successMsg ? (
          <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Combo Selection */}
            {comboRules && comboRules.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Chọn Combo Ưu Đãi</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {comboRules.map((combo) => (
                    <label key={combo.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', border: formData.comboId === combo.id ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: formData.comboId === combo.id ? '#eff6ff' : '#fff' }}>
                      <input 
                        type="radio" 
                        name="combo" 
                        value={combo.id} 
                        checked={formData.comboId === combo.id}
                        onChange={() => setFormData({...formData, comboId: combo.id})}
                        style={{ marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600' }}>{combo.name}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#e11d48' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Họ và Tên</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Nguyễn Văn A" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Số Điện Thoại</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="09xxxxxxx" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Địa chỉ nhận hàng</label>
              <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px' }} placeholder="Số nhà, Đường, Phường, Quận, Thành phố..." />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Ghi chú (Tùy chọn)</label>
              <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Giao giờ hành chính..." />
            </div>

            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '5px' }}>{errorMsg}</div>
            )}

            {/* Cloudflare Turnstile */}
            <div style={{ marginTop: '10px' }}>
              <div 
                className="cf-turnstile" 
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                data-callback="onTurnstileSuccess"
              ></div>
            </div>

            <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '15px', backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
              {isSubmitting ? 'Đang Xử Lý...' : 'HOÀN TẤT ĐẶT HÀNG'}
            </button>
            
          </form>
        )}
      </div>
      
      <Script id="turnstile-callback" strategy="afterInteractive">
        {`
          window.onTurnstileSuccess = function(token) {
            // Trigger react state update
            const customEvent = new CustomEvent('turnstileTokenReceived', { detail: token });
            window.dispatchEvent(customEvent);
          };
        `}
      </Script>
      <Script id="turnstile-listener" strategy="lazyOnload">
        {`
           // Turnstile automatically injects a hidden input with name "cf-turnstile-response"
           // No need for extra event listeners.
        `}
      </Script>

    </div>
  );
}
