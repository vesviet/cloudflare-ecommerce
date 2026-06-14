import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from '../catalog.service';

// Mock ProductService since CatalogService depends on it
vi.mock('../product.service', () => ({
  ProductService: {
    buildPrices: vi.fn(() => ({ regular_price: '100', sale_price: null, price_range: null }))
  }
}));

describe('CatalogService', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      all: vi.fn(),
      get: vi.fn(),
    };
  });

  describe('getCatalogList', () => {
    it('returns empty array if no products found', async () => {
      mockDb.all.mockResolvedValueOnce([]); // Mock product query
      mockDb.all.mockResolvedValueOnce([]); // Mock variations query

      const result = await CatalogService.getCatalogList(mockDb);
      expect(result).toEqual([]);
      expect(mockDb.all).toHaveBeenCalledTimes(1);
    });

    it('fetches products and maps variations and images correctly', async () => {
      // Mock main products query
      mockDb.all.mockResolvedValueOnce([
        { id: 'p1', title: 'Product 1', assets: '[{"url":"/img1.jpg","alt_text":""}]' },
        { id: 'p2', title: 'Product 2', assets: 'invalid_json' }
      ]);
      
      // Mock variations query
      mockDb.all.mockResolvedValueOnce([
        { id: 'v1', parent_id: 'p1', stock_quantity: 10, attributes_json: '{"color":"red"}' }
      ]);

      const result = await CatalogService.getCatalogList(mockDb);

      expect(result).toHaveLength(2);
      
      // Verify product 1 (has valid images and variations)
      expect(result[0].id).toBe('p1');
      expect(result[0].name).toBe('Product 1');
      expect(result[0].images).toEqual([{ url: '/img1.jpg', alt_text: '' }]);
      expect(result[0].variations).toHaveLength(1);
      expect(result[0].variations[0].attributes).toEqual({ color: 'red' });
      expect(result[0].variations[0].stock).toBe(10);
      expect(result[0].prices).toBeDefined();

      // Verify product 2 (handles invalid image JSON gracefully)
      expect(result[1].id).toBe('p2');
      expect(result[1].name).toBe('Product 2');
      expect(result[1].images).toEqual([]);
      expect(result[1].variations).toHaveLength(0);
    });
  });

  describe('getCatalogItem', () => {
    it('returns null if product not found', async () => {
      mockDb.get.mockResolvedValueOnce(null);
      
      const result = await CatalogService.getCatalogItem(mockDb, 'unknown-slug');
      
      expect(result).toBeNull();
      expect(mockDb.get).toHaveBeenCalledTimes(1);
    });

    it('returns product with its variations', async () => {
      // Mock main product query
      mockDb.get.mockResolvedValueOnce({
        id: 'p1',
        title: 'Single Product',
        slug: 'single-product',
        assets: '[{"url":"/hero.png","alt_text":"Hero"}]'
      });
      
      // Mock variations query
      mockDb.all.mockResolvedValueOnce([
        { id: 'v1', parent_id: 'p1', stock_quantity: 5 }
      ]);

      const result = await CatalogService.getCatalogItem(mockDb, 'single-product');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('p1');
      expect(result?.name).toBe('Single Product');
      expect(result?.images).toEqual([{ url: '/hero.png', alt_text: 'Hero' }]);
      expect(result?.variations).toHaveLength(1);
      expect(result?.variations[0].stock).toBe(5);
    });
  });

  describe('searchCatalog', () => {
    it('returns empty array if query is empty', async () => {
      const result = await CatalogService.searchCatalog(mockDb, '');
      expect(result).toEqual([]);
      expect(mockDb.all).not.toHaveBeenCalled();
    });

    it('calls db.all with search query', async () => {
      mockDb.all.mockResolvedValueOnce([{ id: 'p1', title: 'Test Product' }]);
      
      const result = await CatalogService.searchCatalog(mockDb, 'test');
      
      expect(result).toHaveLength(1);
      expect(mockDb.all).toHaveBeenCalledTimes(1);
    });
  });
});
