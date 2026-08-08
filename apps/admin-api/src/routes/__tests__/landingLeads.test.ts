import { describe, it, expect, vi } from 'vitest';

// Mock core-services before importing landingLeads
vi.mock('@ecommerce/core-services', () => ({
  localSchema: {
    landingPageLeads: {
      id: 'id',
      landing_page_id: 'landing_page_id',
      order_id: 'order_id',
      customer_name: 'customer_name',
      customer_phone: 'customer_phone',
      customer_address: 'customer_address',
      customer_note: 'customer_note',
      selected_combo_id: 'selected_combo_id',
      selected_variants_json: 'selected_variants_json',
      total_amount: 'total_amount',
      utm_source: 'utm_source',
      utm_campaign: 'utm_campaign',
      utm_content: 'utm_content',
      sync_status: 'sync_status',
      created_at: 'created_at',
    },
    landingPages: { id: 'id', title: 'title' },
    orders: { id: 'id', status: 'status' },
  }
}));

// Mock Auth Middleware
vi.mock('../../middleware/auth', () => ({
  requireRole: () => async (c: any, next: any) => await next()
}));

// Mock Database
vi.mock('@ecommerce/database', () => ({
  schema: {
    landingPageLeads: { id: 'id' },
    landingPages: { id: 'id' },
    orders: { id: 'id' }
  },
  createDb: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue([
      {
        id: 'lead_1',
        customer_name: 'John Doe',
        customer_phone: '0901234567',
        total_amount: 500000,
        sync_status: 'pending'
      }
    ]),
    get: vi.fn().mockResolvedValue({ total: 1 })
  }))
}));

// Mock Drizzle
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

import landingLeads from '../landingLeads';

describe('Admin API: landingLeads Controller', () => {
  const mockEnv = {
    DB: {} as any
  };

  it('GET /landing-leads returns leads list with pagination', async () => {
    const res = await landingLeads.request('/landing-leads', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].customer_name).toBe('John Doe');
    expect(data.pagination).toEqual({ total: 1, limit: 100, offset: 0 });
  });
});
