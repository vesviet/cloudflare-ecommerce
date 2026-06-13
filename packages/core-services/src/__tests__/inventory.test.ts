import { describe, it, expect, vi } from 'vitest';
import { InventoryService } from '../inventory.service';

describe('Core-Services: InventoryService', () => {
  it('validateAndReserveInventory: passes when stock is sufficient', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([
        { id: 'var_1', parent_id: 'prod_1', stock_quantity: 10, is_purchasable: 1, regular_price: 1000 }
      ])
    };

    const items = [{ variation_id: 'var_1', quantity: 2 }];
    const result = await InventoryService.validateAndReserveInventory(mockDb as any, items);
    
    expect(result.validItems).toHaveLength(1);
    expect(result.subTotal).toBe(2000); // 1000 * 2
  });

  it('validateAndReserveInventory: throws when stock is insufficient', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([
        { id: 'var_1', parent_id: 'prod_1', stock_quantity: 1, is_purchasable: 1, regular_price: 1000 }
      ])
    };

    const items = [{ variation_id: 'var_1', quantity: 2 }]; // Requesting 2, but stock is 1
    
    await expect(InventoryService.validateAndReserveInventory(mockDb as any, items))
      .rejects.toThrow(/is out of stock/);
  });

  it('validateAndReserveInventory: throws when product not found', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]) // Product not found
    };

    const items = [{ variation_id: 'var_1', quantity: 2 }];
    
    await expect(InventoryService.validateAndReserveInventory(mockDb as any, items))
      .rejects.toThrow(/is invalid or unavailable/);
  });
});
