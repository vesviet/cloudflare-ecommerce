import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { inputStyle } from '../../lib/styles';

/**
 * Shared coupon entry / applied-chip. Replaces the three near-identical blocks
 * previously inlined in OrderSummary, cart page and CartDrawer.
 */
export const CouponForm: React.FC = () => {
  const { coupon, applyCoupon, removeCoupon } = useCartStore();
  const [couponError, setCouponError] = useState('');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem('coupon') as HTMLInputElement;
    if (!input.value.trim()) return;
    const res = await applyCoupon(input.value.trim());
    if (!res.success) setCouponError(res.error || 'Invalid coupon');
    else input.value = '';
  };

  if (coupon) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>{coupon.code}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Applied</span>
        </div>
        <button type="button" aria-label="Remove discount code" onClick={() => removeCoupon()} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <label htmlFor="coupon-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Discount code</label>
        <input
          id="coupon-input"
          type="text"
          name="coupon"
          placeholder="Discount code"
          aria-invalid={!!couponError}
          aria-describedby={couponError ? 'coupon-error' : undefined}
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.9rem', flex: 1 }}
        />
        <button type="submit" className="btn" aria-label="Apply discount code" style={{ padding: '0 16px' }}>Apply</button>
      </div>
      {couponError && <span id="coupon-error" role="alert" style={{ color: '#f87171', fontSize: '0.85rem' }}>{couponError}</span>}
    </form>
  );
};
