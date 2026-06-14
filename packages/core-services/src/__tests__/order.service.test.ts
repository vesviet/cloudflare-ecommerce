import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';
import { OrderRepository } from '../order.repository';
import { InventoryRepository } from '../inventory.repository';

vi.mock('../order.repository', () => ({
  OrderRepository: {
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    getOrderItems: vi.fn(),
  }
}));

vi.mock('../inventory.repository', () => ({
  InventoryRepository: {
    deductStock: vi.fn(),
    restock: vi.fn(),
  }
}));

describe('OrderService', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {}; // Mock db object
    vi.clearAllMocks();
  });

  describe('processCheckout (Two-Phase Commit)', () => {
    it('creates order, deducts stock, and returns success', async () => {
      (InventoryRepository.deductStock as any).mockResolvedValueOnce(true);

      const orderData = { orderId: 'ord-1', validItems: [{ variation_id: 'prod-1', quantity: 1, price: 100 }], totalAmount: 100, shippingFeeCents: 0, discountAmount: 0 };
      const result = await OrderService.processCheckout(mockDb, mockDb, orderData);

      expect(OrderRepository.createOrder).toHaveBeenCalledWith(mockDb, orderData);
      expect(InventoryRepository.deductStock).toHaveBeenCalledWith(mockDb, [{ productId: 'prod-1', quantity: 1 }]);
      expect(result.success).toBe(true);
      expect(OrderRepository.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('rolls back order to failed if stock deduction fails', async () => {
      (InventoryRepository.deductStock as any).mockResolvedValueOnce(false); // Out of stock

      const orderData = { orderId: 'ord-2', validItems: [{ variation_id: 'prod-2', quantity: 5, price: 100 }], totalAmount: 500, shippingFeeCents: 0, discountAmount: 0 };
      
      await expect(OrderService.processCheckout(mockDb, mockDb, orderData)).rejects.toThrow('Out of stock or inventory lock failed');

      expect(OrderRepository.createOrder).toHaveBeenCalledWith(mockDb, orderData);
      expect(InventoryRepository.deductStock).toHaveBeenCalled();
      expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(mockDb, 'ord-2', 'pending_payment', 'failed');
    });
  });

  describe('cancelOrderAndRestock', () => {
    it('updates status and restocks if optimistic lock succeeds', async () => {
      (OrderRepository.updateOrderStatus as any).mockResolvedValueOnce(true);
      (OrderRepository.getOrderItems as any).mockResolvedValueOnce([{ product_id: 'prod-1', quantity: 2 }]);

      const success = await OrderService.cancelOrderAndRestock(mockDb, mockDb, 'ord-1');

      expect(success).toBe(true);
      expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(mockDb, 'ord-1', 'pending_payment', 'cancelled');
      expect(InventoryRepository.restock).toHaveBeenCalledWith(mockDb, [{ productId: 'prod-1', quantity: 2 }]);
    });

    it('does nothing if optimistic lock fails (already processing)', async () => {
      (OrderRepository.updateOrderStatus as any).mockResolvedValueOnce(false); // Race condition

      const success = await OrderService.cancelOrderAndRestock(mockDb, mockDb, 'ord-1');

      expect(success).toBe(false);
      expect(InventoryRepository.restock).not.toHaveBeenCalled();
    });
  });
});
