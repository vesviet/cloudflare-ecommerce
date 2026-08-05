import React from 'react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../lib/format';
import { CouponForm } from './CouponForm';

interface OrderSummaryProps {
  items: any[];
  isB2B: boolean;
  subtotal: number; // Subtotal in cents, before discount
  /**
   * S2 FIX: shippingFeeCents (in cents) — must come from server via /api/checkout/shipping-estimate.
   * The old flatShippingFee (in dollars) prop has been removed to eliminate the client-side
   * unit confusion and the incorrect * 100 multiplication.
   */
  shippingFeeCents: number;
  isCalculating?: boolean;
  loyaltyBalance?: number;
  redeemPoints?: number;
  onRedeemPointsChange?: (points: number) => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items, isB2B, subtotal, shippingFeeCents, isCalculating = false,
  loyaltyBalance = 0, redeemPoints = 0, onRedeemPointsChange
}) => {
  const { coupon, getDiscountAmount } = useCartStore();

  const discountAmount = getDiscountAmount();
  const isFreeShip = coupon?.type === 'freeship';
  // S2 FIX: shippingFeeCents is already in cents — no * 100 needed.
  const effectiveShippingCents = isFreeShip ? 0 : shippingFeeCents;

  // Loyalty: 1 point = 1 cent
  const loyaltyDiscount = redeemPoints;

  // S2 FIX: All values are now consistently in cents throughout this component.
  // VAT is intentionally removed from client-side calculation:
  //   - VAT is applied server-side by Stripe / PaymentService.calculatePricing
  //   - Displaying a client-calculated VAT that differs from Stripe's total confuses users
  //   - We show "Included in total" for transparency without the risk of mismatch
  const afterDiscountCents = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
  const finalTotal = afterDiscountCents + effectiveShippingCents;

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
          <CouponForm />
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
                aria-label="Loyalty points to redeem"
                aria-valuetext={redeemPoints > 0 ? `${formatCurrency(redeemPoints)} off` : 'No points redeemed'}
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
             <span>{formatCurrency(effectiveShippingCents)}</span>
          )}
        </div>
        {/* S2 FIX: VAT is no longer calculated client-side to prevent mismatch with Stripe total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>Tax (VAT)</span>
          <span style={{ fontStyle: 'italic' }}>Calculated at checkout</span>
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
