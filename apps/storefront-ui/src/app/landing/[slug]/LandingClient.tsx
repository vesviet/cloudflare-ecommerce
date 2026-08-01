'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export default function LandingClient({ lp: initialLp, comboRules: initialComboRules, initialSlug, apiUrl }: { lp?: any, comboRules?: any[], initialSlug?: string, apiUrl: string }) {
  const params = useParams();
  const [lp, setLp] = useState<any>(initialLp || null);
  const [loading, setLoading] = useState(!initialLp);
  const [error, setError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const slug = initialSlug || (params?.slug as string) || (typeof window !== 'undefined' ? window.location.pathname.split('/landing/')[1] : '');

  useEffect(() => {
    if (lp || !slug) return;
    fetch(`${apiUrl}/api/landing-pages/${slug}`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLp(data.data);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch landing page in client', err);
        setError(true);
        setLoading(false);
      });
  }, [slug, lp, apiUrl]);

  let comboRules: any[] = initialComboRules || [];
  if (!initialComboRules && lp && lp.combo_rules_json) {
    try {
      comboRules = typeof lp.combo_rules_json === 'string'
        ? JSON.parse(lp.combo_rules_json)
        : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : []);
    } catch (e) {}
  }

  let parsedFeatures: string[] = [];
  if (lp && lp.features_json) {
    try {
      parsedFeatures = typeof lp.features_json === 'string'
        ? JSON.parse(lp.features_json)
        : (Array.isArray(lp.features_json) ? lp.features_json : []);
    } catch (e) {}
  }

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    comboId: '',
    selectedVariantId: '',
  });

  useEffect(() => {
    if (comboRules.length > 0 && !formData.comboId) {
      setFormData(prev => ({ ...prev, comboId: comboRules[0].id }));
    }
  }, [comboRules]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCombo = comboRules.find((c: any) => c.id === formData.comboId) || comboRules[0];

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
          selected_variants_json: formData.selectedVariantId ? [formData.selectedVariantId] : (lp?.variants?.[0]?.id ? [lp.variants[0].id] : []),
          total_amount: selectedCombo ? selectedCombo.price : 0,
          turnstile_token: tToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Đặt hàng thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
        setFormData({ name: '', phone: '', address: '', note: '', comboId: formData.comboId, selectedVariantId: '' });
        
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
        <p style={{ fontSize: '1.2rem' }}>Đang tải landing page...</p>
      </div>
    );
  }

  if (error || (!lp && !loading)) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1 style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '10px' }}>404</h1>
        <p style={{ fontSize: '1.2rem', color: '#4b5563', marginBottom: '20px' }}>Trang Landing Page không tồn tại hoặc đã bị gỡ bỏ.</p>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>Trở về trang chủ</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Dynamic Pixels Injection */}
      {lp.facebook_pixel_id && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${(lp.facebook_pixel_id || '').replace(/[^A-Za-z0-9._-]/g, '')}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
      
      {lp.tiktok_pixel_id && (
        <Script id="tt-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${(lp.tiktok_pixel_id || '').replace(/[^A-Za-z0-9._-]/g, '')}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* Header Sticky */}
      {(lp.header_logo_url || lp.header_cta_text) && (
        <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #e5e7eb', margin: '-40px -20px 20px -20px' }}>
          <div style={{ flex: 1 }}>
            {lp.header_logo_url ? (
              <img src={lp.header_logo_url?.startsWith('http') ? lp.header_logo_url : `${apiUrl}${lp.header_logo_url}`} alt="Logo" style={{ maxHeight: '40px', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#111827' }}>{lp.title}</span>
            )}
          </div>
          {lp.header_cta_text && (
            <button 
              onClick={() => { document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ padding: '8px 16px', backgroundColor: '#ea580c', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {lp.header_cta_text}
            </button>
          )}
        </header>
      )}

      {/* Hero Section */}
      <div style={{ marginBottom: '40px' }}>
        {/* Fake Urgency Viewers */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#fdf2f8', color: '#be123c', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px', borderRadius: '8px' }}>
          <span>👁️ Đang có</span>
          <span style={{ color: '#e11d48', fontSize: '1.2rem' }}>{lp.urgency_fake_views || 800}</span>
          <span>người xem sản phẩm này</span>
        </div>

        {/* Image Gallery */}
        {lp?.product?.images && lp.product.images.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '5px' }}>
            <img 
              src={lp.product.images[activeImageIndex]?.url?.startsWith('http') ? lp.product.images[activeImageIndex].url : `${apiUrl}${lp.product.images[activeImageIndex]?.url}`} 
              alt={lp.product.images[activeImageIndex]?.alt_text || lp.seo_title || 'Product Image'} 
              style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block', objectFit: 'cover', aspectRatio: '4/5' }} 
            />
            {lp.product.images.length > 1 && (
              <>
                <button 
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : lp.product.images.length - 1))}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  ‹
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev < lp.product.images.length - 1 ? prev + 1 : 0))}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  ›
                </button>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {lp?.product?.images && lp.product.images.length > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '20px' }}>
            {lp.product.images.slice(0, 4).map((img: any, idx: number) => (
              <img 
                key={idx}
                src={img.url?.startsWith('http') ? img.url : `${apiUrl}${img.url}`}
                onClick={() => setActiveImageIndex(idx)}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', opacity: activeImageIndex === idx ? 1 : 0.6 }}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontSize: '1.4rem', fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: '15px', lineHeight: '1.4' }}>
          {lp.seo_title || 'ÁO SƠ MI NAM CỔ TRỤ THIẾT KẾ PHONG ĐỘ - TRẺ TRUNG - LỊCH LÃM'}
        </h1>

        {/* Fake Rating & Sold */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#ea580c', fontWeight: 'bold', textDecoration: 'underline' }}>4.9</span>
            <span style={{ color: '#fbbf24', fontSize: '1.1rem' }}>★★★★★</span>
          </div>
          <div style={{ width: '1px', height: '12px', background: '#d1d5db' }}></div>
          <div><span style={{ textDecoration: 'underline' }}>1200</span> Đánh giá</div>
          <div style={{ width: '1px', height: '12px', background: '#d1d5db' }}></div>
          <div><span style={{ textDecoration: 'underline' }}>583 824</span> Đã bán</div>
        </div>

        {/* Price Section */}
        {(() => {
          const salePrice = selectedCombo ? selectedCombo.price : (lp?.product?.price ? lp.product.price / 100 : 189000);
          const originalPrice = lp?.product?.regular_price ? lp.product.regular_price / 100 : 0;
          
          const isDiscount = originalPrice > salePrice;
          const savings = isDiscount ? originalPrice - salePrice : 0;
          const discountPercent = isDiscount ? Math.round((savings / originalPrice) * 100) : 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '4px' }}>
              
              {/* Always show original price if available */}
              {originalPrice > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#6b7280' }}>Giá gốc sản phẩm:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '600', color: isDiscount ? '#9ca3af' : '#374151', textDecoration: isDiscount ? 'line-through' : 'none' }}>
                    {originalPrice.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              )}

              {/* Combo or Sale Price */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#4b5563' }}>
                  {selectedCombo ? 'Giá Combo:' : 'Giá chỉ:'}
                </span>
                <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ea580c' }}>
                  {salePrice.toLocaleString('vi-VN')} VNĐ
                </span>
                {isDiscount && (
                  <span style={{ backgroundColor: '#fbbf24', color: '#fff', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>
                    GIẢM {discountPercent}%
                  </span>
                )}
              </div>

              {/* Savings */}
              {isDiscount && (
                <div style={{ color: '#6b7280', fontSize: '1rem', marginTop: '2px' }}>
                  Tiết kiệm <span style={{ fontWeight: 'bold' }}>{savings.toLocaleString('vi-VN')} vnđ</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Features Bullet Points */}
        {parsedFeatures && parsedFeatures.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px', fontSize: '1.1rem', color: '#374151', marginBottom: '20px' }}>
            {parsedFeatures.map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#d1d5db', fontSize: '1.2rem' }}>●</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        )}

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
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
                ⏳ Khuyến mãi kết thúc vào: {date.toLocaleString('vi-VN')}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Checkout Form */}
      <div id="checkout-form" style={{ backgroundColor: '#f9fafb', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
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

            {/* Variant Selector if Variants exist */}
            {lp?.variants && lp.variants.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Chọn Phân Loại / Phân Mẫu</label>
                <select
                  value={formData.selectedVariantId || lp.variants[0].id}
                  onChange={e => setFormData({ ...formData, selectedVariantId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {lp.variants.map((v: any) => (
                    <option key={v.id} value={v.id} disabled={(v.stock || 0) <= 0}>
                      {v.title || v.sku} (Còn {v.stock ?? 0} sp) {(v.stock || 0) <= 0 ? '- [Hết hàng]' : ''}
                    </option>
                  ))}
                </select>
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

            {lp?.product && ((lp.product.status !== 'active' && lp.product.status !== 'published') || (lp.variants && lp.variants.length > 0 ? lp.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0) <= 0 : (lp.product.stock || 0) <= 0)) ? (
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
      {/* Footer Rich Text */}
      {lp.footer_content && (
        <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.6' }}>
          <ReactMarkdown>{lp.footer_content}</ReactMarkdown>
        </footer>
      )}

    </div>
  );
}
