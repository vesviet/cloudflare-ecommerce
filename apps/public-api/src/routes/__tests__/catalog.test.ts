import { describe, it, expect, vi } from 'vitest';
import catalog from '../catalog';

// Mock core-services
vi.mock('@ecommerce/core-services', async () => {
  return {
    ProductService: {
      buildPrices: vi.fn().mockReturnValue({
        regular_price: '100',
        sale_price: '80',
        price_range: null
      })
    },
    CacheService: {
      getGeneration: vi.fn().mockResolvedValue(1),
      getCachedList: vi.fn().mockResolvedValue(null),
      setCachedList: vi.fn().mockResolvedValue(null),
      getCachedItem: vi.fn().mockResolvedValue(null),
      setCachedItem: vi.fn().mockResolvedValue(null)
    },
    CatalogService: {
      getCatalogList: vi.fn().mockResolvedValue([{
        id: 'prod_1',
        title: 'Test Product',
        images: [{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }],
        prices: { regular_price: '100' }
      }]),
      getCatalogItem: vi.fn().mockResolvedValue({
        id: 'prod_1',
        title: 'Test Product',
        images: [{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }],
        prices: { regular_price: '100' }
      })
    }
  };
});

// Mock Database
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      products: { id: 'products' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        all: vi.fn().mockResolvedValue([
          { 
            id: 'prod_1', 
            title: 'Test Product',
            assets: '[{"url":"/media/products/img1.jpg","alt_text":"Product Image"}]',
            regular_price: 100,
            stock_quantity: 10
          }
        ]),
        get: vi.fn().mockResolvedValue(
          { 
            id: 'prod_1', 
            title: 'Test Product',
            assets: '[{"url":"/media/products/img1.jpg","alt_text":"Product Image"}]',
            regular_price: 100,
            stock_quantity: 10
          }
        ),
      }
    })
  }
});

// Mock Drizzle
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

describe('Public API: Catalog Controller', () => {
  const mockEnv = {
    DB: {} as any,
    CACHE_KV: {} as any
  };

  const mockCtx = {
    waitUntil: vi.fn()
  };

  it('GET /catalog: returns enriched products', async () => {
    // We need to inject mockCtx for executionCtx
    const req = new Request('http://localhost/');
    const res = await catalog.fetch(req, mockEnv, mockCtx as any);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data[0].id).toBe('prod_1');
  });

  it('GET /catalog/:slug: returns single product', async () => {
    const req = new Request('http://localhost/test-product');
    const res = await catalog.fetch(req, mockEnv, mockCtx as any);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('prod_1');
  });
});
