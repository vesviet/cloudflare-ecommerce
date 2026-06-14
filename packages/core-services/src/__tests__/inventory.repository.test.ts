import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryRepository } from '../inventory.repository';

describe('InventoryRepository', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(),
    };
  });

  describe('deductStock', () => {
    it('returns true if all items successfully deducted', async () => {
      // Mock returning ID to signify success
      mockDb.all.mockResolvedValue({ results: [{ id: '123' }] });

      const items = [{ productId: 'prod-1', quantity: 2 }];
      const success = await InventoryRepository.deductStock(mockDb, items);

      expect(success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inventory_levels SET stock_quantity = stock_quantity - ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(2, 'prod-1', 2);
    });

    it('returns false if out of stock (0 rows returned)', async () => {
      // Mock returning empty array to signify failure (Out of Stock)
      mockDb.all.mockResolvedValue({ results: [] });

      const items = [{ productId: 'prod-1', quantity: 100 }];
      const success = await InventoryRepository.deductStock(mockDb, items);

      expect(success).toBe(false);
    });
  });

  describe('restock', () => {
    it('restores stock quantities atomically', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: '123' }] });

      const items = [{ productId: 'prod-1', quantity: 2 }];
      await InventoryRepository.restock(mockDb, items);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inventory_levels SET stock_quantity = stock_quantity + ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(2, 'prod-1');
    });
  });
});
