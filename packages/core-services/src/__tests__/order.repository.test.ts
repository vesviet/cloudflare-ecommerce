import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderRepository } from '../order.repository';
import { schema } from '@ecommerce/database';
import { eq, and } from 'drizzle-orm';

vi.mock('drizzle-orm', () => {
  return {
    eq: vi.fn(),
    and: vi.fn(),
    sql: vi.fn()
  };
});

describe('OrderRepository', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: vi.fn(),
      batch: vi.fn(),
    };
  });

  describe('createOrder', () => {
    it('generates correct queries for inserting order and items', async () => {
      const orderData = {
        orderId: 'ord-123',
        totalAmount: 1000,
        shippingFeeCents: 100,
        validItems: [
          { variation_id: 'prod-1', quantity: 2, price: 500 }
        ],
        discountAmount: 0
      };

      await OrderRepository.createOrder(mockDb, orderData);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.orders);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.orderItems);
      // Wait, createOrder might execute them or return queries. Let's assume it executes them via db.batch
      expect(mockDb.batch).toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus', () => {
    it('uses optimistic concurrency lock', async () => {
      mockDb.run.mockResolvedValueOnce({ meta: { changes: 1 } }); // Successful update

      const success = await OrderRepository.updateOrderStatus(mockDb, 'ord-123', 'pending_payment', 'cancelled');
      
      expect(mockDb.update).toHaveBeenCalledWith(schema.orders);
      expect(mockDb.set).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(and).toHaveBeenCalled(); // Should use AND for status condition
      expect(success).toBe(true);
    });

    it('returns false if optimistic lock fails (0 rows affected)', async () => {
      mockDb.run.mockResolvedValueOnce({ meta: { changes: 0 } }); // Race condition happened

      const success = await OrderRepository.updateOrderStatus(mockDb, 'ord-123', 'pending_payment', 'processing');
      
      expect(success).toBe(false);
    });
  });
});
