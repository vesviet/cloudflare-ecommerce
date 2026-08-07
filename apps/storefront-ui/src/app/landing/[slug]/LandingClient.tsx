'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LandingPixels from './LandingPixels';
import LandingHero from './LandingHero';
import LandingOrderForm from './LandingOrderForm';
import type { LandingPageData, ComboRule, LandingFormData, SuccessData } from './types';

interface LandingClientProps {
  lp?: LandingPageData | null;
  comboRules?: ComboRule[];
  initialSlug?: string;
  apiUrl: string;
}

export default function LandingClient({ lp: initialLp, comboRules: initialComboRules, initialSlug, apiUrl }: LandingClientProps) {
  const params = useParams();
  const [lp, setLp] = useState<LandingPageData | null>(initialLp || null);
  const [loading, setLoading] = useState(!initialLp);
  const [error, setError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const slug = initialSlug || (params?.slug as string) || (typeof window !== 'undefined' ? window.location.pathname.split('/landing/')[1] : '');

  useEffect(() => {
    if (lp || !slug) return;
    fetch(`${apiUrl}/api/landing-pages/${slug}`, { headers: { Accept: 'application/json' } })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) setLp(data.data);
        else setError(true);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch landing page in client', err);
        setError(true);
        setLoading(false);
      });
  }, [slug, apiUrl]);

  const comboRules: ComboRule[] = (initialComboRules && initialComboRules.length > 0) ? initialComboRules : (lp?.combo_rules_json ? (typeof lp.combo_rules_json === 'string' ? (() => { try { return JSON.parse(lp.combo_rules_json); } catch { return []; } })() : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : [])) : []);

  const parsedFeatures: string[] = lp?.features_json ? (typeof lp.features_json === 'string' ? (() => { try { return JSON.parse(lp.features_json); } catch { return []; } })() : (Array.isArray(lp.features_json) ? lp.features_json : [])) : [];

  const [formData, setFormData] = useState<LandingFormData>({ name: '', phone: '', address: '', note: '', comboId: '', selectedVariantId: '' });

  useEffect(() => {
    if (comboRules.length > 0 && !formData.comboId) {
      setFormData(prev => ({ ...prev, comboId: comboRules[0].id }));
    }
  }, [comboRules]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCombo = comboRules.find((c) => c.id === formData.comboId) || comboRules[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lp) return;
    setErrorMsg('');
    
    const tToken = (new FormData(e.currentTarget)).get('cf-turnstile-response') as string;
    if (!tToken) return setErrorMsg('Vui lòng xác thực bạn không phải là robot.');

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
          payment_method: 'cod',
          turnstile_token: tToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData({
          order_reference: data.data?.order_reference || '',
          payment_method: data.data?.payment_method || 'cod',
          order_status: data.data?.order_status || 'confirmed',
          estimated_delivery: data.data?.estimated_delivery || '2-3 ngày làm việc',
        });
        setFormData({ name: '', phone: '', address: '', note: '', comboId: formData.comboId, selectedVariantId: '' });
        
        if (typeof window !== 'undefined') {
          const w = window as any;
          if (w.fbq && lp.facebook_pixel_id) w.fbq('track', 'Purchase', { value: selectedCombo?.price, currency: 'VND' });
          if (w.ttq && lp.tiktok_pixel_id) w.ttq.track('CompletePayment', { value: selectedCombo?.price, currency: 'VND' });
        }
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
      if (typeof window !== 'undefined' && (window as any).turnstile) (window as any).turnstile.reset();
    }
  };

  if (loading) return (<div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}><p style={{ fontSize: '1.2rem' }}>Đang tải landing page...</p></div>);

  if (error || !lp) {
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
      <LandingPixels facebookPixelId={lp.facebook_pixel_id} tiktokPixelId={lp.tiktok_pixel_id} />
      <LandingHero lp={lp} activeImageIndex={activeImageIndex} setActiveImageIndex={setActiveImageIndex} selectedCombo={selectedCombo} parsedFeatures={parsedFeatures} />
      <LandingOrderForm lp={lp} comboRules={comboRules} formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} successData={successData} errorMsg={errorMsg} handleSubmit={handleSubmit} />
    </div>
  );
}
