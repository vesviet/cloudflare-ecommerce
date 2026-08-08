import { describe, it, expect, vi } from 'vitest';
import products from '../products';

// Mock Auth Middleware
vi.mock('../../middleware/auth', () => ({
  requireRole: () => async (c: any, next: any) => await next()
}));

// Mock R2 stream
class MockStream {}

// Mock global Request/File for vitest node environment if needed
if (typeof File === 'undefined') {
  (global as any).File = class File {
    size: number;
    type: string;
    name: string;
    constructor(parts: any[], name: string, options: any) {
      this.name = name;
      this.size = parts.join('').length;
      this.type = options.type || '';
    }
    stream() {
      return new MockStream();
    }
  } as any;
}

// Mock core-services
vi.mock('@ecommerce/core-services', async () => {
  return {
    ProductService: {
      prepareUpsertProduct: vi.fn().mockResolvedValue([{ success: true }])
    },
    CacheService: {
      invalidateCatalogCache: vi.fn().mockResolvedValue(true),
      invalidateProductCache: vi.fn().mockResolvedValue(true)
    },
    InventoryRepository: {
      invalidateCache: vi.fn().mockResolvedValue(true)
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
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ success: true }),
        run: vi.fn().mockResolvedValue({ success: true }),
        get: vi.fn().mockResolvedValue({ id: 'prod_1', slug: 'prod-1' }),
        all: vi.fn().mockResolvedValue([
          { 
            id: 'prod_1', 
            images_json: '[{"url":"/media/products/img1.jpg","alt_text":"Product Image"}]',
            secondary_categories: '["cat_1"]',
            variations: '[{"id": "var_1"}]'
          }
        ]),
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

describe('Admin API: Products Controller', () => {
  const mockEnv = {
    DB: {} as any,
    PRODUCTS_R2: {
      put: vi.fn().mockResolvedValue(true)
    } as any
  };

  const mockCtx = {
    waitUntil: vi.fn()
  };

  it('GET /products: formats JSON fields correctly', async () => {
    const res = await products.request('/products', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data[0].images).toEqual([{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }]);
    expect(data.data[0].secondary_categories).toEqual(['cat_1']);
    expect(data.data[0].variations).toEqual([{ id: 'var_1' }]);
  });

  it('POST /products: rejects empty name', async () => {
    const formData = new FormData();
    const res = await products.request('/products', { 
      method: 'POST',
      body: formData 
    }, mockEnv, mockCtx as any);
    
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
  });

  it('POST /products: calls ProductService and R2 successfully', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Product');
    formData.append('sku', 'TEST-01');
    formData.append('type', 'simple');
    formData.append('images', new File(['mock'], 'test.png', { type: 'image/png' }));
    formData.append('variations', '[{"sku":"V1"}]');

    const res = await products.request('/products', { 
      method: 'POST',
      body: formData 
    }, mockEnv, mockCtx as any);
    
    const data = await res.json() as any;
    if (!data.success) console.log('POST ERR:', JSON.stringify(data));
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockEnv.PRODUCTS_R2.put).toHaveBeenCalled();
  });

  it('PUT /products/:id: calls ProductService for updates', async () => {
    const formData = new FormData();
    formData.append('name', 'Updated Product');
    formData.append('sku', 'TEST-01');
    formData.append('existing_images', '["/media/old.jpg"]');

    const res = await products.request('/products/prod_1', { 
      method: 'PUT',
      body: formData 
    }, mockEnv, mockCtx as any);
    
    const data = await res.json() as any;
    if (!data.success) console.log('PUT ERR:', JSON.stringify(data));
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('DELETE /products/:id: soft-deletes an existing product', async () => {
    const res = await products.request('/products/prod_1', {
      method: 'DELETE'
    }, mockEnv, mockCtx as any);

    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('soft-deleted');
  });

  it('GET /products/:id: fetches single product detail', async () => {
    const res = await products.request('/products/prod_1', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('prod_1');
    expect(data.data.images).toEqual([{ url: '/media/products/img1.jpg', alt_text: 'Product Image' }]);
  });
});
