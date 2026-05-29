import { describe, it, expect, vi } from 'vitest';
import webhook from '../webhook';

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEventAsync: vi.fn().mockImplementation(async (rawBody, signature) => {
          if (signature === 'invalid') throw new Error('Invalid signature');
          return JSON.parse(rawBody);
        })
      }
    }
  };
});

// Mock Database Module
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      idempotencyKeys: { id: 'idempotencyKeys' },
      products: { id: 'products' },
      productVariations: { id: 'productVariations' },
      inventoryReservations: { id: 'inventoryReservations', order_id: 'order_id' },
      orders: { id: 'orders', payment_intent_id: 'payment_intent_id' },
      orderItems: { id: 'orderItems', order_id: 'order_id' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          { id: 'item_1', variation_id: 'var_1', quantity: 2 }
        ]),
        get: vi.fn().mockResolvedValue({ id: 'order_1', status: 'pending_payment' }),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        batch: vi.fn().mockResolvedValue([{ success: true }]),
      }
    })
  }
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
  and: vi.fn(),
}));

describe('Webhook API Unit Tests', () => {
  const mockEnv = {
    DB: {} as any,
    EVENT_QUEUE: {
      send: vi.fn().mockResolvedValue(null)
    } as any,
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock'
  };

  it('P0: Webhook rejects missing signature', async () => {
    const res = await webhook.request('/stripe', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' })
    }, mockEnv);

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('Missing Stripe-Signature header');
  });

  it('P0: Webhook rejects invalid signature', async () => {
    const res = await webhook.request('/stripe', {
      method: 'POST',
      headers: { 'Stripe-Signature': 'invalid' },
      body: JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' })
    }, mockEnv);

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('Invalid Stripe signature');
  });

  it('P0: Happy path processes payment success correctly', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: { id: 'pi_test_123' }
      }
    };

    const res = await webhook.request('/stripe', {
      method: 'POST',
      headers: { 'Stripe-Signature': 'valid_sig' },
      body: JSON.stringify(mockEvent)
    }, mockEnv);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.received).toBe(true);
  });
});
