import { describe, it, expect, vi } from 'vitest';
import checkout from '../checkout';

// Mock Stripe
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

// Mock Database Module
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      products: { id: 'products' },
      productVariations: { id: 'productVariations' },
      inventoryReservations: { id: 'inventoryReservations', order_id: 'order_id' },
      orders: { id: 'orders' },
      orderItems: { id: 'orderItems' },
      customers: { id: 'customers' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          { id: '550e8400-e29b-41d4-a716-446655440000', product_id: 'prod_1', stock: 5, is_purchasable: 1, regular_price: 1000 }
        ]),
        get: vi.fn().mockResolvedValue({ id: 'cust_1' }),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue({ success: true }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
    })
  }
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
  inArray: vi.fn(),
  and: vi.fn(),
}));

describe('Checkout API Unit Tests', () => {
  const mockEnv = {
    DB: {} as any,
    CACHE_KV: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(null)
    } as any,
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STOREFRONT_URL: 'http://localhost:3000'
  };

  it('P0: Happy path returns 200 and checkout URL', async () => {
    const res = await checkout.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        items: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }]
      })
    }, mockEnv);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.order_id).toBeDefined();
    expect(data.checkout_url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });

  it('P0: Rejects empty cart', async () => {
    const res = await checkout.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', items: [] })
    }, mockEnv);
    expect(res.status).toBe(400);
  });

  it('P0: Rejects guest checkout without email', async () => {
    const res = await checkout.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }] })
    }, mockEnv);
    expect(res.status).toBe(400);
  });
});
