import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '../order.service';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
  and: vi.fn(),
}));

describe('Core-Services: OrderService', () => {
  it('prepareFulfillment: handles full fulfillment', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([
        { id: 'item_1', order_id: 'order_1', quantity: 2 }
      ])
    };

    const result = await OrderService.prepareFulfillment(mockDb as any, 'order_1', 'TRACK123', 'UPS');
    
    expect(result.isFullyFulfilled).toBe(true);
    expect(result.queries.length).toBeGreaterThan(0);
  });

  it('prepareFulfillment: handles partial fulfillment', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValueOnce([
        { id: 'item_1', order_id: 'order_1', quantity: 2 },
        { id: 'item_2', order_id: 'order_1', quantity: 1 }
      ]).mockResolvedValueOnce([ // For allFulfillments check
        { order_item_id: 'item_1', quantity: 1 }
      ])
    };

    // Only fulfilling 1 out of 3 total items
    const itemsToFulfill = [{ order_item_id: 'item_1', quantity: 1 }];
    
    const result = await OrderService.prepareFulfillment(mockDb as any, 'order_1', 'TRACK123', 'UPS', itemsToFulfill);
    
    expect(result.isFullyFulfilled).toBe(false);
  });

});
