import { describe, it, expect, vi } from 'vitest';
import orders from '../orders';

// Mock core-services
vi.mock('@ecommerce/core-services', async () => {
  return {
    PaymentService: {
      processRefund: vi.fn().mockResolvedValue(true)
    },
    InventoryService: {
      getRestockQueries: vi.fn().mockReturnValue([])
    },
    OrderService: {
      getAdvanceOrderStatusQueries: vi.fn().mockReturnValue([]),
      prepareFulfillment: vi.fn().mockResolvedValue({ queries: [], isFullyFulfilled: true })
    }
  };
});

// Mock Auth Middleware
vi.mock('../../middleware/auth', () => ({
  requireRole: () => async (c: any, next: any) => await next()
}));

// Mock Database
const mockOrder = { id: 'order_1', status: 'processing', payment_intent_id: 'pi_123' };
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      orders: { id: 'orders', status: 'status', payment_intent_id: 'pi' },
      orderItems: { id: 'orderItems', order_id: 'order_id' },
      products: { id: 'products' }
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockOrder),
        all: vi.fn().mockResolvedValue([]),
        batch: vi.fn().mockResolvedValue([{ success: true }])
      }
    })
  }
});

// Mock Drizzle
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

describe('Admin API: Orders Controller', () => {
  const mockEnv = {
    DB: {} as any,
    STRIPE_SECRET_KEY: 'sk_test_mock',
    EVENT_QUEUE: {
      send: vi.fn().mockResolvedValue(true)
    } as any
  };

  it('POST /orders/:id/refund: refunds and restocks', async () => {
    const res = await orders.request('/orders/order_1/refund', { method: 'POST' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
  });

  it('POST /orders/:id/refund: rejects invalid status', async () => {
    mockOrder.status = 'shipped'; // Temporarily change mock
    const res = await orders.request('/orders/order_1/refund', { method: 'POST' }, mockEnv);
    expect(res.status).toBe(400);
    mockOrder.status = 'processing'; // Restore
  });

  it('POST /orders/:id/fulfill: processes fulfillment', async () => {
    const res = await orders.request('/orders/order_1/fulfill', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: '12345', carrier_name: 'UPS' })
    }, mockEnv);
    
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(mockEnv.EVENT_QUEUE.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ORDER_SHIPPED'
    }));
  });
});
