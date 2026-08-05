import React from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { inputStyle, labelStyle } from '../../lib/styles';

interface B2bGdprSectionProps {
  isB2B: boolean;
  b2bCompany: string;
  b2bVatId: string;
  acceptsMarketing: boolean;
  onChangeIsB2B: (value: boolean) => void;
  onChangeB2bCompany: (value: string) => void;
  onChangeB2bVatId: (value: string) => void;
  onChangeAcceptsMarketing: (value: boolean) => void;
}

export const B2bGdprSection: React.FC<B2bGdprSectionProps> = ({
  isB2B, b2bCompany, b2bVatId, acceptsMarketing,
  onChangeIsB2B, onChangeB2bCompany, onChangeB2bVatId, onChangeAcceptsMarketing
}) => {
  return (
    <>
      {/* Section: B2B */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: isB2B ? '14px' : 0 }}>
          <input
            type="checkbox" checked={isB2B}
            onChange={e => onChangeIsB2B(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
          />
          <Building2 size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.9rem' }}>This is a <strong>B2B / Business purchase</strong> (I need a VAT invoice)</span>
        </label>
        {isB2B && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input style={inputStyle} required={isB2B} value={b2bCompany} onChange={e => onChangeB2bCompany(e.target.value)} placeholder="Your Company Ltd." />
            </div>
            <div>
              <label style={labelStyle}>VAT / Tax ID</label>
              <input style={inputStyle} value={b2bVatId} onChange={e => onChangeB2bVatId(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        )}
      </div>

      {/* Section: GDPR Consent */}
      <div style={{ marginBottom: '28px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <input
          id="checkout-marketing"
          type="checkbox"
          checked={acceptsMarketing}
          onChange={e => onChangeAcceptsMarketing(e.target.checked)}
          style={{ marginTop: '3px', cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0, accentColor: 'var(--accent-color)' }}
        />
        <label htmlFor="checkout-marketing" style={{ cursor: 'pointer', lineHeight: 1.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <ShieldCheck size={14} color="var(--accent-color)" />
            <strong style={{ fontSize: '0.88rem' }}>Marketing Consent (GDPR)</strong>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            I agree to receive personalized promotions and newsletters from Aura. You can unsubscribe at any time.
          </span>
        </label>
      </div>
    </>
  );
};
