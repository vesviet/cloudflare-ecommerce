'use client';

import React from 'react';
import Script from 'next/script';
import ReactMarkdown from 'react-markdown';
import type { LandingPageData, ComboRule, LandingFormData, SuccessData } from './types';

interface LandingOrderFormProps {
  lp: LandingPageData;
  comboRules: ComboRule[];
  formData: LandingFormData;
  setFormData: React.Dispatch<React.SetStateAction<LandingFormData>>;
  isSubmitting: boolean;
  successData: SuccessData | null;
  errorMsg: string;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function LandingOrderForm({
  lp,
  comboRules,
  formData,
  setFormData,
  isSubmitting,
  successData,
  errorMsg,
  handleSubmit,
}: LandingOrderFormProps) {
  const isOutOfStock = Boolean(
    lp?.product && (
      (lp.product.status !== 'active' && lp.product.status !== 'published') ||
      (lp.variants && lp.variants.length > 0
        ? lp.variants.reduce((s, v) => s + (v.stock || 0), 0) <= 0
        : (lp.product.stock || 0) <= 0)
    )
  );

  return (
    <>
      <div id="checkout-form" style={{ backgroundColor: '#f9fafb', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px' }}>Đặt Hàng Ngay</h2>
        
        {successData ? (
          <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
            <h3 style={{ color: '#166534', fontWeight: '700', fontSize: '1.3rem', marginBottom: '8px' }}>Đặt hàng thành công!</h3>
            
            <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Mã đơn hàng</p>
              <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '900', color: '#111827', letterSpacing: '0.1em' }}>#{successData.order_reference}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', padding: '6px 14px', background: '#dcfce7', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', color: '#166534' }}>
                💵 Thanh toán khi nhận hàng (COD)
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                🚚 Dự kiến giao: <strong>{successData.estimated_delivery}</strong>
              </p>
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Chúng tôi sẽ liên hệ xác nhận đơn hàng qua số điện thoại bạn đã cung cấp.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Combo Selection */}
            {comboRules.length > 0 && (
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
                        onChange={() => setFormData({ ...formData, comboId: combo.id })}
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

            {/* Variant Selector */}
            {lp?.variants && lp.variants.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Chọn Phân Loại / Phân Mẫu</label>
                <select
                  value={formData.selectedVariantId || lp.variants[0].id}
                  onChange={e => setFormData({ ...formData, selectedVariantId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {lp.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={(v.stock || 0) <= 0}>
                      {v.title || v.sku} (Còn {v.stock ?? 0} sp) {(v.stock || 0) <= 0 ? '- [Hết hàng]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Họ và Tên</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Nguyễn Văn A" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Số Điện Thoại</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="09xxxxxxx" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Địa chỉ nhận hàng</label>
              <textarea required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px' }} placeholder="Số nhà, Đường, Phường, Quận, Thành phố..." />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Ghi chú (Tùy chọn)</label>
              <input type="text" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Giao giờ hành chính..." />
            </div>

            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '5px' }}>{errorMsg}</div>
            )}

            {/* Cloudflare Turnstile */}
            <div style={{ marginTop: '10px' }}>
              <div 
                className="cf-turnstile" 
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
              ></div>
            </div>

            {isOutOfStock ? (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginTop: '10px' }}>
                ⚠️ Tạm Hết Hàng - Sản phẩm hiện đang tạm ngưng nhận đơn mới.
              </div>
            ) : (
              <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '15px', backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                {isSubmitting ? 'Đang Xử Lý...' : 'HOÀN TẤT ĐẶT HÀNG'}
              </button>
            )}
          </form>
        )}
      </div>

      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />

      {/* Footer Rich Text */}
      {lp.footer_content && (
        <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.6' }}>
          <ReactMarkdown>{lp.footer_content}</ReactMarkdown>
        </footer>
      )}
    </>
  );
}
