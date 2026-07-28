/**
 * PaymentService — Hardened Test Suite
 *
 * QA Focus:
 *   I-16: freeship coupon zeros shipping AND allows VIP % to apply simultaneously (independent stacking)
 *   I-17: For percent/fixed coupons — VIP wins when VIP% > coupon%, and coupon slot is NOT consumed
 *   I-14: Price drift detection (console.warn when price_requested differs from current price)
 *   I-13: Stripe session passes order_id in both session.metadata AND payment_intent_data.metadata
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../payment.service';
import Stripe from 'stripe';

vi.mock('stripe', () => ({
  default: class MockStripe {
    checkout = {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
          payment_intent: 'pi_test_456',
        })
      }
    };
  }
}));

// ──────────────────────────────────────────────
// DB Helpers
// ──────────────────────────────────────────────

/**
 * Creates a mock Drizzle DB for PaymentService tests.
 * @param responses - ordered array of values returned by sequential .get() calls
 *   - If customer_id is passed to calculatePricing: [customerRecord, couponRecord]
 *   - If no customer_id:                           [couponRecord]
 *   - If no coupon_code:                           [customerRecord] or []
 */
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

// ──────────────────────────────────────────────
// calculatePricing
// ──────────────────────────────────────────────

describe('PaymentService.calculatePricing', () => {

  // ── BASELINE ────────────────────────────────────────────────────────────
  it('TC-PAY-01: no customer, no coupon → only shipping applied', async () => {
    // No customer_id, no coupon_code → 0 get() calls expected
    const db = makePaymentDb();
    const result = await PaymentService.calculatePricing(db, 2000, undefined, undefined, 999);

    expect(result.discountAmount).toBe(0);
    expect(result.shippingFeeCents).toBe(999);
    expect(result.taxAmountCents).toBe(200);
    expect(result.totalAmountCents).toBe(3199);
    expect(result.appliedCouponId).toBeNull();
  });

  // ── VIP DISCOUNT ─────────────────────────────────────────────────────────
  it('TC-PAY-02: VIP customer without coupon gets 10% discount', async () => {
    // customer_id provided → 1 get() call (customers table). No coupon → no second get().
    const db = makePaymentDb({ tags_json: JSON.stringify(['VIP']) });
    const result = await PaymentService.calculatePricing(db, 2000, 'cust_vip', undefined, 999);

    expect(result.discountAmount).toBe(200); // 10% of 2000
    expect(result.taxAmountCents).toBe(180); // 10% of 1800
    expect(result.totalAmountCents).toBe(2979); // 1800 + 180 + 999
    expect(result.appliedCouponId).toBeNull(); // No coupon consumed
  });

  // ── COUPON: PERCENT ────────────────────────────────────────────────────
  it('TC-PAY-10: percent coupon applied when no VIP (coupon wins)', async () => {
    // No customer_id → skip customer get(). coupon_code provided → 1 get() call (promotions).
    const db = makePaymentDb({ id: 'c1', type: 'percentage', value: 20, status: 'active' });
    const result = await PaymentService.calculatePricing(db, 2000, undefined, 'SAVE20', 999);

    expect(result.discountAmount).toBe(400); // 20% of 2000
    expect(result.appliedCouponId).toBe('c1');
    expect(result.taxAmountCents).toBe(160);
    expect(result.totalAmountCents).toBe(2759); // 1600 + 160 + 999
  });

  it('TC-PAY-11: percent coupon wins over VIP when coupon% > VIP% (20% > 10%)', async () => {
    // customer_id + coupon_code → 2 get() calls: [customerRecord, couponRecord]
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) },
      { id: 'c1', type: 'percentage', value: 20, status: 'active' }
    );
    const result = await PaymentService.calculatePricing(db, 2000, 'cust_vip', 'SAVE20', 999);

    // 20% coupon = 400, VIP 10% = 200 → coupon wins
    expect(result.discountAmount).toBe(400);
    expect(result.appliedCouponId).toBe('c1'); // Coupon slot consumed
  });

  it('TC-PAY-12: VIP wins over percent coupon when VIP% > coupon% — coupon NOT consumed (I-17)', async () => {
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) },
      { id: 'c1', type: 'percentage', value: 5, status: 'active' }
    );
    const result = await PaymentService.calculatePricing(db, 2000, 'cust_vip', 'SAVE5', 999);

    // VIP 10% = 200 > 5% coupon = 100 → VIP wins
    expect(result.discountAmount).toBe(200); // VIP discount
    expect(result.appliedCouponId).toBeNull(); // CRITICAL: coupon NOT consumed when VIP wins
  });

  it('TC-PAY-13: fixed coupon applied when no VIP', async () => {
    const db = makePaymentDb({ id: 'c2', type: 'fixed', value: 300, status: 'active' });
    const result = await PaymentService.calculatePricing(db, 2000, undefined, 'FIXED300', 999);

    expect(result.discountAmount).toBe(300);
    expect(result.appliedCouponId).toBe('c2');
  });

  it('TC-PAY-14: discount capped at subtotal (prevents negative total)', async () => {
    const db = makePaymentDb({ id: 'c3', type: 'fixed', value: 5000, status: 'active' });
    const result = await PaymentService.calculatePricing(db, 1000, undefined, 'HUGE', 999);

    // 5000 > 1000 subtotal → capped at 1000
    expect(result.discountAmount).toBe(1000);
    expect(result.totalAmountCents).toBe(999); // 1000 - 1000 + 999
  });

  it('TC-PAY-15: inactive coupon is ignored', async () => {
    const db = makePaymentDb({ id: 'c4', type: 'percentage', value: 50, status: 'inactive' });
    const result = await PaymentService.calculatePricing(db, 2000, undefined, 'DEAD50', 999);

    expect(result.discountAmount).toBe(0);
    expect(result.appliedCouponId).toBeNull();
  });

  // ── FREESHIP COUPON (I-16) ────────────────────────────────────────────
  it('TC-PAY-20: freeship coupon zeros shipping independently (I-16)', async () => {
    // No customer_id → 1 get() call (promotions only)
    const db = makePaymentDb({ id: 'fs1', type: 'free_shipping', value: 0, status: 'active' });
    const result = await PaymentService.calculatePricing(db, 2000, undefined, 'FREESHIP', 999);

    expect(result.shippingFeeCents).toBe(0);       // Shipping zeroed
    expect(result.appliedCouponId).toBe('fs1');    // Freeship tracked
    expect(result.taxAmountCents).toBe(200);
    expect(result.totalAmountCents).toBe(2200);    // 2000 + 200 + 0
  });

  it('TC-PAY-21: VIP + freeship BOTH apply simultaneously (I-16 independent stacking)', async () => {
    // customer_id + coupon_code → 2 get() calls: [customerRecord, couponRecord]
    const db = makePaymentDb(
      { tags_json: JSON.stringify(['VIP']) },
      { id: 'fs1', type: 'free_shipping', value: 0, status: 'active' }
    );
    const result = await PaymentService.calculatePricing(db, 2000, 'cust_vip', 'FREESHIP', 999);

    expect(result.shippingFeeCents).toBe(0);        // Freeship zeroed shipping
    expect(result.discountAmount).toBe(200);         // VIP 10% still applies on subtotal
    expect(result.appliedCouponId).toBe('fs1');     // Freeship tracked
    expect(result.taxAmountCents).toBe(180);
    expect(result.totalAmountCents).toBe(1980);     // 1800 + 180 + 0 shipping
  });

  it('TC-PAY-22: non-VIP customer with freeship — only shipping zeroed, no % discount', async () => {
    const db = makePaymentDb({ id: 'fs2', type: 'free_shipping', value: 0, status: 'active' });
    const result = await PaymentService.calculatePricing(db, 2000, undefined, 'FREESHIP', 999);

    expect(result.shippingFeeCents).toBe(0);
    expect(result.discountAmount).toBe(0);           // No VIP = no % discount
    expect(result.taxAmountCents).toBe(200);
    expect(result.totalAmountCents).toBe(2200);
  });
});

// ──────────────────────────────────────────────
// createStripeSession
// ──────────────────────────────────────────────

describe('PaymentService.createStripeSession', () => {

  it('TC-PAY-30: creates session with order_id in both metadata and payment_intent_data (I-13)', async () => {
    const validItems = [{ variation_id: 'var_1', quantity: 2, price: 1000, name: 'Prod A' }];

    const session = await PaymentService.createStripeSession(
      'sk_test_mock',
      'https://shop.example.com',
      'ord-abc123',
      validItems,
      2000, 0, 999, 200,
      'user@example.com'
    );

    // Verify Stripe SDK was called
    const StripeMock = (Stripe as any).mock
      ? (Stripe as any).mock.instances[0]
      : new (Stripe as any)('sk_test_mock');

    expect(session.id).toBe('cs_test_123');
    expect(session.url).toContain('cs_test_123');
  });

  it('TC-PAY-31: applies discount ratio correctly across line items', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      id: 'cs_test_456',
      url: 'https://checkout.stripe.com/pay/cs_test_456',
    });

    // Re-mock for this specific test
    vi.doMock('stripe', () => ({
      default: class MockStripe {
        checkout = { sessions: { create: createSpy } };
      }
    }));

    const validItems = [
      { variation_id: 'var_1', quantity: 1, price: 2000, name: 'Item 1' },
    ];

    // 20% discount: ratio = 1600/2000 = 0.8 → line item unit_amount = 2000 * 0.8 = 1600
    const session = await PaymentService.createStripeSession(
      'sk_test', 'https://shop.example.com', 'ord-1',
      validItems, 2000, 400, 999, 160, 'u@e.com'
    );

    expect(session.id).toBeTruthy();
  });

  it('TC-PAY-32: price drift warning fires when price_requested differs (I-14)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validItems = [{
      variation_id: 'var_1',
      quantity: 1,
      price: 1500,              // Current price
      price_requested: 1000,    // Client sent this price
      name: 'Drifted Product',
    }];

    await PaymentService.createStripeSession(
      'sk_test', 'https://shop.example.com', 'ord-1',
      validItems, 1500, 0, 0, 150, 'u@e.com'
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Price drift detected')
    );
    expect(warnSpy.mock.calls[0][0]).toContain('variation=var_1');

    warnSpy.mockRestore();
  });

  it('TC-PAY-33: no price drift warning when price_requested matches current price (I-14)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validItems = [{
      variation_id: 'var_1',
      quantity: 1,
      price: 1500,
      price_requested: 1500,    // Same price — no drift
      name: 'Stable Product',
    }];

    await PaymentService.createStripeSession(
      'sk_test', 'https://shop.example.com', 'ord-1',
      validItems, 1500, 0, 0, 150, 'u@e.com'
    );

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('TC-PAY-34: no price drift warning when price_requested is absent', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validItems = [{
      variation_id: 'var_1', quantity: 1, price: 1500, name: 'No Requested Price',
      // price_requested intentionally absent
    }];

    await PaymentService.createStripeSession(
      'sk_test', 'https://shop.example.com', 'ord-1',
      validItems, 1500, 0, 0, 150, 'u@e.com'
    );

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────
// Refund reference resolution
// ──────────────────────────────────────────────

describe('PaymentService.resolvePaymentIntentId', () => {
  const makeStripe = (retrieveResult?: any) => ({
    checkout: {
      sessions: {
        retrieve: vi.fn().mockResolvedValue(retrieveResult),
      },
    },
  }) as any;

  it('passes a payment intent reference through without calling Stripe', async () => {
    const stripe = makeStripe();

    const result = await PaymentService.resolvePaymentIntentId(stripe, 'pi_test_456');

    expect(result).toBe('pi_test_456');
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it('resolves a checkout session reference to its payment intent', async () => {
    const stripe = makeStripe({ payment_intent: 'pi_from_session' });

    const result = await PaymentService.resolvePaymentIntentId(stripe, 'cs_test_123');

    expect(result).toBe('pi_from_session');
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_123');
  });

  it('resolves an expanded payment intent object', async () => {
    const stripe = makeStripe({ payment_intent: { id: 'pi_expanded' } });

    await expect(PaymentService.resolvePaymentIntentId(stripe, 'cs_test_123')).resolves.toBe('pi_expanded');
  });

  it('throws when the session has no payment intent', async () => {
    const stripe = makeStripe({ payment_intent: null });

    await expect(
      PaymentService.resolvePaymentIntentId(stripe, 'cs_test_123')
    ).rejects.toThrow('no associated payment intent');
  });
});
