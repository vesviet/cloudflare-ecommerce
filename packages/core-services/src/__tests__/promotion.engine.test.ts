import { describe, it, expect, vi } from 'vitest';
import { PromotionEngine } from '../promotion.engine';
import { PromotionContext } from '../promotion.types';

function makePaymentDb(...responses: (object | null)[]) {
  let getCallIndex = 0;
  const mockDb: any = {
    select: vi.fn(() => mockDb),
    from:   vi.fn(() => mockDb),
    where:  vi.fn(() => mockDb),
    get: vi.fn(() => {
      const resp = responses[getCallIndex] ?? null;
      getCallIndex++;
      return Promise.resolve(resp);
    }),
  };
  return mockDb;
}

describe('PromotionEngine.evaluate', () => {

  it('TC-PROMO-01: Invalid coupon code -> COUPON_NOT_FOUND', async () => {
    const db = makePaymentDb(null);
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'INVALID' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_NOT_FOUND');
    expect(res.discount_amount).toBe(0);
  });

  it('TC-PROMO-02: Inactive coupon -> COUPON_INACTIVE', async () => {
    const db = makePaymentDb({ status: 'inactive' });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'INACTIVE' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_INACTIVE');
  });

  it('TC-PROMO-03: Future starts_at -> COUPON_NOT_STARTED', async () => {
    const futureUnix = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
    const db = makePaymentDb({ status: 'active', starts_at: futureUnix });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'FUTURE' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_NOT_STARTED');
  });

  it('TC-PROMO-04: Past ends_at -> COUPON_EXPIRED', async () => {
    const pastUnix = Math.floor(Date.now() / 1000) - 86400; // Yesterday
    const db = makePaymentDb({ status: 'active', ends_at: pastUnix });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'EXPIRED' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_EXPIRED');
  });

  it('TC-PROMO-05: Subtotal < min_order_amount -> COUPON_MIN_ORDER', async () => {
    const db = makePaymentDb({ status: 'active', min_order_amount: 3000 });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'MIN30' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_MIN_ORDER');
  });

  it('TC-PROMO-06: Coupon usage_limit reached -> COUPON_EXHAUSTED', async () => {
    const db = makePaymentDb({ status: 'active', usage_limit: 100, times_used: 100 });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'MAXREACHED' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBe('COUPON_EXHAUSTED');
  });



  it('TC-PROMO-08: Valid percent coupon -> returns correct discount, no error', async () => {
    const db = makePaymentDb({ id: 'c1', status: 'active', type: 'percentage', value: 20, code: 'SAVE20' });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'SAVE20' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.coupon_error).toBeUndefined();
    expect(res.discount_amount).toBe(400); // 20%
    expect(res.tax_amount_cents).toBe(160); // (2000 - 400) * 10%
    expect(res.total_amount_cents).toBe(2759); // 1600 + 160 + 999
    expect(res.applied_coupon_id).toBe('c1');
    expect(res.discount_breakdown).toContainEqual({ type: 'Promotion', amount: 400, description: 'SAVE20 Applied' });
  });

  it('TC-PROMO-09: Valid coupon vs VIP -> max discount applied', async () => {
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) }, // Customer
      { id: 'c1', status: 'active', type: 'percentage', value: 5, code: 'SAVE5_ALONE' } // Coupon
    );
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, customer_id: 'cust1', coupon_code: 'SAVE5_ALONE' };
    const res = await PromotionEngine.evaluate(ctx);

    // VIP (10% = 200) > Coupon (5% = 100)
    expect(res.discount_amount).toBe(200);
    expect(res.applied_coupon_id).toBeNull();
  });

  it('TC-PROMO-10: Valid freeship coupon vs VIP -> stacks successfully', async () => {
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) }, // Customer
      { id: 'c1', status: 'active', type: 'free_shipping', code: 'FREESHIP' } // Coupon
    );
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, customer_id: 'cust1', coupon_code: 'FREESHIP' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.shipping_fee_cents).toBe(0);
    expect(res.discount_amount).toBe(200); // VIP applies on subtotal
    expect(res.applied_coupon_id).toBe('c1');
  });

  it('TC-PROMO-11: Percent vs VIP (VIP wins) -> returns VIP, applied_coupon_id is null', async () => {
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) }, // Customer
      { id: 'c1', status: 'active', type: 'percentage', value: 5, code: 'SAVE5' } // Coupon
    );
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, customer_id: 'cust1', coupon_code: 'SAVE5' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.discount_amount).toBe(200); // VIP 10%
    expect(res.applied_coupon_id).toBeNull(); // Did not use coupon
    expect(res.coupon_error).toBeUndefined(); // But it was valid
  });

  it('TC-PROMO-12: Valid fixed coupon -> applies correct amount', async () => {
    const db = makePaymentDb({ id: 'c1', status: 'active', type: 'fixed', value: 500, code: 'FIXED5' });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'FIXED5' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.discount_amount).toBe(500);
    expect(res.applied_coupon_id).toBe('c1');
  });

  it('TC-PROMO-13: Handles upper casing the coupon code automatically', async () => {
    const db = makePaymentDb({ id: 'c1', status: 'active', type: 'fixed', value: 100, code: 'LOWER' });
    const ctx: PromotionContext = { db, subTotalCents: 2000, base_shipping_cents: 999, coupon_code: 'lower' };
    const res = await PromotionEngine.evaluate(ctx);

    expect(res.discount_amount).toBe(100);
  });

});
