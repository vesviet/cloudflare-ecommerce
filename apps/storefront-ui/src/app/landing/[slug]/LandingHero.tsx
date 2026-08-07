'use client';

import React from 'react';
import { getImageUrl } from '../../../lib/image';
import type { LandingPageData, ComboRule, LandingPageImage } from './types';

interface LandingHeroProps {
  lp: LandingPageData;
  activeImageIndex: number;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedCombo?: ComboRule;
  parsedFeatures: string[];
}

export default function LandingHero({
  lp,
  activeImageIndex,
  setActiveImageIndex,
  selectedCombo,
  parsedFeatures,
}: LandingHeroProps) {
  const images: LandingPageImage[] = lp?.product?.images || [];

  // R6 Documentation: regular_price and price from price_list_items store values in minor units (VNĐ × 100).
  // Dividing by 100 converts them to display VNĐ values.
  const originalPrice = lp?.product?.regular_price ? lp.product.regular_price / 100 : 0;
  const salePrice = lp?.product?.price ? lp.product.price / 100 : originalPrice;

  const isDiscount = originalPrice > salePrice;
  const savings = isDiscount ? originalPrice - salePrice : 0;
  const discountPercent = isDiscount ? Math.round((savings / originalPrice) * 100) : 0;

  // Format end time date
  let urgencyDate: Date | null = null;
  if (lp.urgency_end_time) {
    if (typeof lp.urgency_end_time === 'number') {
      urgencyDate = new Date(lp.urgency_end_time > 1e11 ? lp.urgency_end_time : lp.urgency_end_time * 1000);
    } else if (typeof lp.urgency_end_time === 'string') {
      const num = Number(lp.urgency_end_time);
      urgencyDate = !isNaN(num)
        ? new Date(num > 1e11 ? num : num * 1000)
        : new Date(lp.urgency_end_time);
    }
    if (urgencyDate && isNaN(urgencyDate.getTime())) {
      urgencyDate = null;
    }
  }

  return (
    <>
      {/* Header Sticky */}
      {(lp.header_logo_url || lp.header_cta_text) && (
        <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #e5e7eb', margin: '-40px -20px 20px -20px' }}>
          <div style={{ flex: 1 }}>
            {lp.header_logo_url ? (
              <img src={getImageUrl(lp.header_logo_url)} alt="Logo" style={{ maxHeight: '40px', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#111827' }}>{lp.title}</span>
            )}
          </div>
          {lp.header_cta_text && (
            <button 
              onClick={() => { document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{ padding: '8px 16px', backgroundColor: '#ea580c', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {lp.header_cta_text}
            </button>
          )}
        </header>
      )}

      {/* Hero Section */}
      <div style={{ marginBottom: '40px' }}>
        {/* Fake Urgency Viewers — count comes from DB config, shows nothing if not set or <= 0 */}
        {lp.urgency_fake_views !== undefined && lp.urgency_fake_views !== null && lp.urgency_fake_views > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#fdf2f8', color: '#be123c', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px', borderRadius: '8px' }}>
            <span>👁️ Đang có</span>
            <span style={{ color: '#e11d48', fontSize: '1.2rem' }}>{lp.urgency_fake_views}</span>
            <span>người xem sản phẩm này</span>
          </div>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '5px' }}>
            <img 
              src={getImageUrl(images[activeImageIndex]?.url)}
              alt={images[activeImageIndex]?.alt_text || lp.seo_title || 'Product Image'} 
              style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block', objectFit: 'cover', aspectRatio: '4/5' }} 
            />
            {images.length > 1 && (
              <>
                <button 
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  ‹
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  ›
                </button>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '20px' }}>
            {images.slice(0, 4).map((img, idx) => (
              <img 
                key={idx}
                src={getImageUrl(img.url)}
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

        {/* R3: Removed hardcoded fake social proof block (4.9 rating, 1200 reviews, 583 824 sold)
            as uniform fake data presents trust and legal risks. */}

        {/* Price Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '6px' }}>
          {originalPrice > 0 && isDiscount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#6b7280' }}>Giá niêm yết:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#9ca3af', textDecoration: 'line-through' }}>
                {originalPrice.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#4b5563' }}>
              {isDiscount ? 'Giá ưu đãi:' : 'Giá bán:'}
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

          {isDiscount && (
            <div style={{ color: '#6b7280', fontSize: '1rem', marginTop: '-2px' }}>
              Tiết kiệm <span style={{ fontWeight: 'bold' }}>{savings.toLocaleString('vi-VN')} vnđ</span>
            </div>
          )}

          {selectedCombo && (
            <div style={{ color: '#059669', fontSize: '0.95rem', fontWeight: '600', backgroundColor: '#d1fae5', padding: '4px 12px', borderRadius: '6px', border: '1px dashed #34d399', marginTop: '4px' }}>
              🎁 Tùy chọn mua kèm: {selectedCombo.name} - Giá: {selectedCombo.price.toLocaleString('vi-VN')} VNĐ
            </div>
          )}
        </div>

        {/* Features Bullet Points */}
        {parsedFeatures.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px', fontSize: '1.1rem', color: '#374151', marginBottom: '20px' }}>
            {parsedFeatures.map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#d1d5db', fontSize: '1.2rem' }}>●</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* Countdown Timer / Urgency End Time */}
        {urgencyDate && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
              ⏳ Khuyến mãi kết thúc vào: {urgencyDate.toLocaleString('vi-VN')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
