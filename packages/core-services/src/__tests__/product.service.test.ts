import { describe, it, expect, vi } from 'vitest';
import { ProductService } from '../product.service';

describe('ProductService', () => {
  describe('buildPrices', () => {
    it('returns regular and sale prices for simple product', () => {
      const product = { type: 'simple', regular_price: 100, sale_price: 80 };
      const prices = ProductService.buildPrices(product, []);
      expect(prices).toEqual({
        regular_price: '100',
        sale_price: '80',
        price_range: null,
      });
    });

    it('returns price range for configurable product with variations', () => {
      const product = { type: 'configurable', regular_price: null, sale_price: null };
      const variations = [
        { id: 'v1', is_purchasable: 1, regular_price: 50, sale_price: 40 },
        { id: 'v2', is_purchasable: 1, regular_price: 70, sale_price: 60 },
      ];
      const prices = ProductService.buildPrices(product, variations);
      expect(prices).toEqual({
        regular_price: null,
        sale_price: null,
        price_range: {
          min_amount: '40',
          max_amount: '60',
        },
      });
    });

    it('returns price range for variable product type as well', () => {
      const product = { type: 'variable', regular_price: null, sale_price: null };
      const variations = [
        { id: 'v1', is_purchasable: 1, regular_price: 25 },
        { id: 'v2', is_purchasable: 1, regular_price: 50 },
      ];
      const prices = ProductService.buildPrices(product, variations);
      expect(prices).toEqual({
        regular_price: null,
        sale_price: null,
        price_range: {
          min_amount: '25',
          max_amount: '50',
        },
      });
    });

    it('guards against empty variation prices array (avoids Infinity)', () => {
      const product = { type: 'configurable', regular_price: 100, sale_price: null };
      const variations = [
        { id: 'v1', is_purchasable: 1, regular_price: null, sale_price: null },
      ];
      const prices = ProductService.buildPrices(product, variations);
      // Falls back to product regular/sale price without min_amount: "Infinity"
      expect(prices).toEqual({
        regular_price: '100',
        sale_price: null,
        price_range: null,
      });
    });
  });

  describe('prepareUpsertProduct with empty imageUrls', () => {
    it('does not execute inArray query when imageUrls is an empty array', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };

      const queries = await ProductService.prepareUpsertProduct(mockDb, {
        isUpdate: true,
        productId: 'prod_1',
        name: 'Test Product',
        imageUrls: [],
      });

      expect(queries.length).toBeGreaterThan(0);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});
