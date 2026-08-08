import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import orders from '../orders';
import products from '../products';
import landingLeads from '../landingLeads';

// Mock core-services
vi.mock('@ecommerce/core-services', async () => {
  return {
    localSchema: {
      landingPageLeads: { id: 'id' },
      landingPages: { id: 'id' },
      orders: { id: 'id' },
      orderItems: { id: 'id' },
      products: { id: 'id' },
    },
    ProductService: { prepareUpsertProduct: vi.fn() },
    CacheService: { invalidateProductCache: vi.fn().mockResolvedValue(true) },
    InventoryRepository: { invalidateCache: vi.fn().mockResolvedValue(true) },
  };
});

// Mock Database
vi.mock('@ecommerce/database', () => ({
  schema: {
    products: { id: 'products' },
    orders: { id: 'orders' },
  },
  createDb: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ id: 'prod_123', slug: 'test-prod' }),
    all: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    batch: vi.fn().mockResolvedValue([{ success: true }]),
    execute: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock Drizzle
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

describe('Empirical Verification: Admin API RBAC & Soft-Delete', () => {
  const createTestApp = (role: string) => {
    const app = new Hono<{ Variables: any }>();
    app.use('*', async (c, next) => {
      c.set('adminUser', { id: 'usr_test', role });
      await next();
    });
    app.route('/', orders);
    app.route('/', products);
    app.route('/', landingLeads);
    return app;
  };

  it('GET /orders: ALLOWED (200) for role "editor"', async () => {
    const app = createTestApp('editor');
    const res = await app.request('/orders', { method: 'GET' }, { DB: {} });
    expect(res.status).toBe(200);
  });

  it('GET /orders/:id: ALLOWED (200) for role "editor"', async () => {
    const app = createTestApp('editor');
    const res = await app.request('/orders/ord_123', { method: 'GET' }, { DB: {} });
    expect(res.status).toBe(200);
  });

  it('GET /orders: ALLOWED (200) for role "support"', async () => {
    const app = createTestApp('support');
    const res = await app.request('/orders', { method: 'GET' }, { DB: {} });
    expect(res.status).toBe(200);
  });

  it('DELETE /products/:id: DENIED (403) for role "editor"', async () => {
    const app = createTestApp('editor');
    const res = await app.request('/products/prod_123', { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('DELETE /products/:id: ALLOWED (200) for role "manager"', async () => {
    const app = createTestApp('manager');
    const res = await app.request('/products/prod_123', { method: 'DELETE' }, { DB: {} }, { waitUntil: vi.fn() } as any);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('soft-deleted');
  });

  it('GET /landing-leads: ALLOWED (200) for role "editor"', async () => {
    const app = createTestApp('editor');
    const res = await app.request('/landing-leads', { method: 'GET' }, { DB: {} });
    expect(res.status).toBe(200);
  });
});
