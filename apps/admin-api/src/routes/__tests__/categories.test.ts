import { describe, it, expect, vi } from 'vitest';
import categories from '../categories';

// Mock Auth Middleware
vi.mock('../../middleware/auth', () => ({
  requireRole: () => async (c: any, next: any) => await next()
}));

// Mock core-services
let mockHasCycle = false;
vi.mock('@ecommerce/core-services', async () => {
  return {
    CategoryService: {
      hasCycle: vi.fn().mockImplementation(() => mockHasCycle),
      getSafeDeletionQueries: vi.fn().mockReturnValue([])
    }
  };
});

// Mock Database
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      categories: { id: 'categories' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ id: 'cat_1', name: 'Cat 1' }),
        all: vi.fn().mockResolvedValue([{ id: 'cat_1', name: 'Cat 1' }]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue({ success: true }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
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

describe('Admin API: Categories Controller', () => {
  const mockEnv = {
    DB: {} as any,
    CACHE_KV: {
      delete: vi.fn().mockResolvedValue(true)
    } as any
  };

  it('GET /categories: returns categories', async () => {
    const res = await categories.request('/', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data[0].id).toBe('cat_1');
  });

  it('PUT /categories/:id: rejects if cycle detected', async () => {
    mockHasCycle = true;
    const res = await categories.request('/cat_1', { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: 'cat_2' })
    }, mockEnv);
    
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toMatch(/Cycle detected/);
    mockHasCycle = false; // reset
  });

  it('PUT /categories/:id: updates and invalidates cache', async () => {
    const res = await categories.request('/cat_1', { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' })
    }, mockEnv);
    
    expect(res.status).toBe(200);
    expect(mockEnv.CACHE_KV.delete).toHaveBeenCalledWith('storefront:categories:tree');
  });

  it('DELETE /categories/:id: deletes safely and invalidates cache', async () => {
    const res = await categories.request('/cat_1', { method: 'DELETE' }, mockEnv);
    
    expect(res.status).toBe(200);
    expect(mockEnv.CACHE_KV.delete).toHaveBeenCalledWith('storefront:categories:tree');
  });
});
