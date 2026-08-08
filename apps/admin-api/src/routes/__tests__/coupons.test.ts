import { describe, it, expect, vi } from 'vitest';

vi.mock('@ecommerce/core-services', () => ({
  localSchema: {
    promotions: {}
  }
}));

vi.mock('@ecommerce/database', () => ({
  createDb: vi.fn()
}));

import { mapPromotionToCoupon } from '../coupons';

describe('Admin API: Coupons mapPromotionToCoupon', () => {
  it('maps legacy promotion properties to canonical fields and removes legacy aliases', () => {
    const rawPromo = {
      id: 'coupon_1',
      code: 'SUMMER2026',
      type: 'percentage',
      value: 20,
      min_order_amount: 100,
      is_active: 1,
      expires_at: 1780000000,
      max_uses: 50,
      uses: 5,
    };

    const coupon = mapPromotionToCoupon(rawPromo);

    // Canonical fields present
    expect(coupon.id).toBe('coupon_1');
    expect(coupon.code).toBe('SUMMER2026');
    expect(coupon.type).toBe('percent');
    expect(coupon.status).toBe('active');
    expect(coupon.ends_at).toBe(1780000000);
    expect(coupon.usage_limit).toBe(50);
    expect(coupon.times_used).toBe(5);

    // Legacy aliases omitted
    expect(coupon).not.toHaveProperty('is_active');
    expect(coupon).not.toHaveProperty('expires_at');
    expect(coupon).not.toHaveProperty('max_uses');
    expect(coupon).not.toHaveProperty('uses');
  });

  it('preserves existing canonical fields when no legacy aliases exist', () => {
    const rawPromo = {
      id: 'coupon_2',
      code: 'FLASH50',
      type: 'fixed',
      value: 50,
      status: 'disabled',
      ends_at: 1790000000,
      usage_limit: 10,
      times_used: 2,
    };

    const coupon = mapPromotionToCoupon(rawPromo);

    expect(coupon.type).toBe('fixed');
    expect(coupon.status).toBe('disabled');
    expect(coupon.ends_at).toBe(1790000000);
    expect(coupon.usage_limit).toBe(10);
    expect(coupon.times_used).toBe(2);
    expect(coupon).not.toHaveProperty('is_active');
    expect(coupon).not.toHaveProperty('expires_at');
    expect(coupon).not.toHaveProperty('max_uses');
    expect(coupon).not.toHaveProperty('uses');
  });
});
