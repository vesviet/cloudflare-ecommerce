import React from 'react';
import { useCartStore } from '../../store/cartStore';
import { X } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box',
};

interface OrderSummaryProps {
  items: any[];
  isB2B: boolean;
  subtotal: number; // Subtotal before discount
  flatShippingFee: number;
  isCalculating?: boolean;
  loyaltyBalance?: number;
  redeemPoints?: number;
  onRedeemPointsChange?: (points: number) => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items, isB2B, subtotal, flatShippingFee, isCalculating = false,
  loyaltyBalance = 0, redeemPoints = 0, onRedeemPointsChange
}) => {
  const [couponError, setCouponError] = React.useState('');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);

  const { coupon, applyCoupon, removeCoupon, getDiscountAmount } = useCartStore();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem('coupon') as HTMLInputElement;
    if (input.value.trim()) {
      const res = await applyCoupon(input.value.trim());
      if (!res.success) setCouponError(res.error || 'Invalid coupon');
      else input.value = '';
    }
  };

  const discountAmount = getDiscountAmount();
  const isFreeShip = coupon?.type === 'freeship';
  const effectiveShippingFee = isFreeShip ? 0 : flatShippingFee;
  // Loyalty redemption assumes 1 point = 1 VND (using cents). Wait, Subtotal is in cents.
  // 1 point = 1 cent in our API.
  const loyaltyDiscount = redeemPoints; 
  
  const partialTotal = Math.max(0, subtotal - discountAmount - loyaltyDiscount) + effectiveShippingFee * 100;
  const taxAmount = Math.round(partialTotal * 0.1); // 10% VAT
  const finalTotal = partialTotal + taxAmount;

  // Max points they can redeem is their balance OR the remaining subtotal after coupon discount
  const maxRedeemable = Math.min(loyaltyBalance, Math.max(0, subtotal - discountAmount));

  return (
    <div className="glass glass-card" style={{ padding: '28px', position: 'sticky', top: '24px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Order Summary</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '46px', height: '46px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--accent-color)', color: '#fff', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>{item.quantity}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.attributes ? Object.values(item.attributes).join(', ') : ''}</div>
              </div>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ marginBottom: '8px' }}>
          {coupon ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>{coupon.code}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Applied</span>
              </div>
              <button aria-label="Remove discount code" onClick={() => removeCoupon()} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
            </div>
          ) : (
            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label htmlFor="coupon-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Discount code</label>
                <input
                  id="coupon-input"
                  type="text"
                  name="coupon"
                  placeholder="Discount code"
                  aria-invalid={!!couponError}
                  aria-describedby={couponError ? "coupon-error" : undefined}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '0.9rem' }}
                />
                <button type="submit" className="btn" aria-label="Apply discount code" style={{ padding: '0 16px' }}>Apply</button>
              </div>
              {couponError && <span id="coupon-error" role="alert" style={{ color: '#f87171', fontSize: '0.85rem' }}>{couponError}</span>}
            </form>
          )}
        </div>

        {loyaltyBalance > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>Loyalty Points</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatCurrency(loyaltyBalance)} available</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="range" 
                min={0} 
                max={maxRedeemable} 
                value={redeemPoints} 
                onChange={(e) => onRedeemPointsChange?.(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#38bdf8' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                -{formatCurrency(redeemPoints)}
              </span>
            </div>
            
            {redeemPoints > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                 <button type="button" onClick={() => onRedeemPointsChange?.(0)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Clear points</button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: '0.9rem' }}>
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        {redeemPoints > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontSize: '0.9rem' }}>
            <span>Loyalty Redemption</span>
            <span>-{formatCurrency(redeemPoints)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <span>Shipping</span>
          {isCalculating ? (
             <span className="skeleton-loader" style={{ width: '40px', height: '16px', borderRadius: '4px', display: 'inline-block', background: 'rgba(255,255,255,0.1)', animation: 'pulse 1.5s infinite' }}></span>
          ) : isFreeShip ? (
             <span style={{ color: '#4ade80' }}>Free</span>
          ) : (
             <span>{formatCurrency(effectiveShippingFee * 100)}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <span>Tax (10% VAT)</span>
          {isCalculating ? (
             <span className="skeleton-loader" style={{ width: '40px', height: '16px', borderRadius: '4px', display: 'inline-block', background: 'rgba(255,255,255,0.1)', animation: 'pulse 1.5s infinite' }}></span>
          ) : (
             <span>{formatCurrency(taxAmount)}</span>
          )}
        </div>
        {isB2B && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>VAT (B2B)</span>
            <span>Invoiced separately</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span>Total</span>
          {isCalculating ? (
             <span className="skeleton-loader" style={{ width: '80px', height: '24px', borderRadius: '4px', display: 'inline-block', background: 'rgba(255,255,255,0.1)', animation: 'pulse 1.5s infinite' }}></span>
          ) : (
             <span style={{ color: 'var(--accent-color)' }}>{formatCurrency(finalTotal)}</span>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '16px', textAlign: 'center', lineHeight: 1.5 }}>
        🔒 Payments are encrypted and secured via Stripe.
      </p>
    </div>
  );
};
