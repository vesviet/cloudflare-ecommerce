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
    DB: {} as any
  };

  it('GET /catalog: returns enriched products', async () => {
    const res = await catalog.request('/', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data[0].images).toEqual([{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }]);
    expect(data.data[0].prices.regular_price).toBe('100');
  });

  it('GET /catalog/:slug: returns single product', async () => {
    const res = await catalog.request('/test-product', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.images).toEqual([{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }]);
    expect(data.data.prices.regular_price).toBe('100');
  });
});
