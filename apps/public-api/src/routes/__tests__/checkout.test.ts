import { describe, it, expect, vi } from 'vitest';

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      "checkout" = {
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

// Mock core-services PaymentService
vi.mock('@ecommerce/core-services', () => {
  return {
    InventoryService: {
      validateAndReserveInventory: vi.fn().mockResolvedValue({ validItems: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2, price: 1000 }], subTotal: 2000 }),
      getSoftLockQueries: vi.fn().mockReturnValue([]),
      getReleaseSoftLockQueries: vi.fn().mockReturnValue([]),
    },
    PaymentService: {
      calculatePricing: vi.fn().mockResolvedValue({ discountAmount: 0, appliedCouponId: null, shippingFeeCents: 999, totalAmountCents: 2999 }),
      createStripeSession: vi.fn().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      })
    },
    OrderService: {
      getCreateOrderQueries: vi.fn().mockReturnValue([]),
      getUpdateCustomerAttributionQueries: vi.fn().mockReturnValue([]),
      processCheckout: vi.fn().mockResolvedValue({ success: true }),
    }
  };
});

// Mock Database Module
const idemStore = new Map<string, any>()
const settingsStore = new Map<string, any>([['checkout-v2', { value: 'true', type: 'boolean' }]])

vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      products: { id: 'products' },
      inventoryReservations: { id: 'inventoryReservations', order_id: 'order_id' },
      orders: { id: 'orders' },
      orderItems: { id: 'orderItems' },
      customers: { id: 'customers' },
      settings: { id: 'settings', key: 'key', value: 'value', type: 'type' },
      checkoutIdempotency: { key: 'key', status: 'status', response_json: 'response_json', expires_at: 'expires_at', order_id: 'order_id' },
      idempotencyKeys: { id: 'id', status: 'status' },
    },
    createDb: vi.fn().mockImplementation(() => {
      let currentTableKey: string | null = null
      return {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation((_tbl: any) => {
            currentTableKey = _tbl?.id || _tbl?.key || null
            return {
              where: vi.fn().mockImplementation((_cond: any) => {
                if (currentTableKey === 'key') {
                  return {
                    get: vi.fn().mockImplementation(async () => idemStore.get('idem_record') || null),
                    all: vi.fn().mockResolvedValue([]),
                    limit: vi.fn().mockImplementation(() => Promise.resolve(idemStore.get('idem_record') ? [idemStore.get('idem_record')] : [])),
                  }
                }

                if (currentTableKey === 'settings') {
                  return {
                    get: vi.fn().mockImplementation(async () => {
                      const raw = settingsStore.get((_cond?.$value || _cond))
                      return raw ? { value: raw.value, type: raw.type } : undefined
                    }),
                    all: vi.fn().mockResolvedValue([]),
                    limit: vi.fn().mockImplementation((_n: number) => {
                      const raw = settingsStore.get((_cond?.$value || _cond))
                      return Promise.resolve(raw ? [{ value: raw.value, type: raw.type }] : [])
                    }),
                  }
                }

                return {
                  get: vi.fn().mockResolvedValue({ id: 'cust_1' }),
                  all: vi.fn().mockResolvedValue([
                    { id: '550e8400-e29b-41d4-a716-446655440000', parent_id: 'prod_1', stock_quantity: 5, is_purchasable: 1, regular_price: 1000 }
                  ]),
                  limit: vi.fn().mockImplementation((_n: number) =>
                    Promise.resolve([
                      { id: '550e8400-e29b-41d4-a716-446655440000', parent_id: 'prod_1', stock_quantity: 5, is_purchasable: 1, regular_price: 1000 }
                    ])
                  ),
                }
              }),
              get: vi.fn().mockResolvedValue({ id: 'cust_1' }),
              all: vi.fn().mockResolvedValue([]),
            }
          })
        })),
        insert: vi.fn().mockImplementation((_tbl: any) => {
          currentTableKey = _tbl?.key || _tbl?.id || null
          return {
            values: vi.fn().mockImplementation((vals: any) => {
              if (currentTableKey === 'key') {
                const existing = idemStore.get('idem_record')
                if (existing) {
                  return {
                    onConflictDoNothing: vi.fn().mockResolvedValue({ changes: 0, meta: { changes: 0 } })
                  }
                }
                idemStore.set('idem_record', { ...vals, status: 'processing' })
                return {
                  onConflictDoNothing: vi.fn().mockResolvedValue({ changes: 1, meta: { changes: 1 } })
                }
              }
              return Promise.resolve({ success: true })
            })
          }
        }),
        update: vi.fn().mockImplementation(() => ({
          set: vi.fn().mockImplementation((setVals: any) => ({
            where: vi.fn().mockImplementation(async () => {
              if (currentTableKey === 'key') {
                const existing = idemStore.get('idem_record') || {}
                idemStore.set('idem_record', { ...existing, ...setVals })
                return { changes: 1, meta: { changes: 1 } }
              }
              return { success: true }
            })
          }))
        })),
        delete: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(async () => {
            if (currentTableKey === 'key') {
              idemStore.delete('idem_record')
            }
            return { success: true }
          })
        })),
        batch: vi.fn().mockResolvedValue([{ success: true }]),
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
  or: vi.fn(),
  lt: vi.fn(),
}));

import checkout from '../checkout';

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

  it('P0: Returns cached response when repeating checkout with identical Idempotency-Key', async () => {
    const idempotencyKey = 'idem_key_unit_test_001';

    const firstRes = await checkout.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        items: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }]
      })
    }, mockEnv);

    expect(firstRes.status).toBe(200);
    const firstData = await firstRes.json() as any;
    expect(firstData.success).toBe(true);
    expect(firstData.order_id).toBeDefined();

    const secondRes = await checkout.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        items: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }]
      })
    }, mockEnv);

    expect(secondRes.status).toBe(200);
    const secondData = await secondRes.json() as any;
    expect(secondData.success).toBe(true);
    expect(secondData.order_id).toBe(firstData.order_id);
    expect(secondData.checkout_url).toBe(firstData.checkout_url);
  });

  it('P1: Fallback to Flat Rate when Carrier API and Tax API timeout', async () => {
    // Mock fetch to simulate timeout
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100); // Fast fail for test, but simulates catch block
      });
    });

    const res = await checkout.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        items: [{ variation_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
        address: { zipcode: '90210' }
      })
    }, mockEnv);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);

    fetchSpy.mockRestore();
  });
});
