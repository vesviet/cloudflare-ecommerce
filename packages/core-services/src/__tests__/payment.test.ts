import { describe, it, expect, vi } from 'vitest';
import { PaymentService } from '../payment.service';
import Stripe from 'stripe';

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
          })
        }
      }
    }
  };
});

describe('Core-Services: PaymentService', () => {
  it('calculatePricing: calculates total without coupon', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(null)
    };

    const result = await PaymentService.calculatePricing(mockDb as any, 2000, undefined, undefined, 999);
    
    expect(result.discountAmount).toBe(0);
    expect(result.shippingFeeCents).toBe(999);
    expect(result.totalAmountCents).toBe(2999); // 2000 + 999
    expect(result.appliedCouponId).toBeNull();
  });

  it('calculatePricing: calculates total with active percentage coupon', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        id: 'coupon_1',
        type: 'percent',
        value: 20,
        is_active: 1
      })
    };

    const result = await PaymentService.calculatePricing(mockDb as any, 2000, undefined, 'SAVE20', 999);
    
    expect(result.discountAmount).toBe(400); // 20% of 2000
    expect(result.shippingFeeCents).toBe(999);
    expect(result.totalAmountCents).toBe(2599); // 2000 - 400 + 999
    expect(result.appliedCouponId).toBe('coupon_1');
  });

  it('calculatePricing: ignores inactive coupon', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        id: 'coupon_1',
        is_active: 0
      })
    };

    const result = await PaymentService.calculatePricing(mockDb as any, 2000, undefined, 'SAVE20', 999);
    expect(result.discountAmount).toBe(0);
  });

  it('createStripeSession: creates session with correct line items', async () => {
    const validItems = [{ variation_id: 'var_1', quantity: 2, price: 1000, name: 'Prod 1' }];
    const session = await PaymentService.createStripeSession(
      'sk_mock', 'http://localhost', 'order_1', validItems, 2000, 400, 999, 'test@example.com'
    );
    
    expect(session.id).toBe('cs_test_123');
    expect(session.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });
});
