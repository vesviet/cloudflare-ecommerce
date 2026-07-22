import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
}));

import { Hono } from 'hono';
import { auditMiddleware } from '../audit';

const mockExecute = vi.fn();
const mockValues = vi.fn().mockReturnValue({ execute: mockExecute });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@ecommerce/database', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createDb: vi.fn().mockImplementation(() => ({
      insert: mockInsert,
    })),
  };
});

describe('Admin API Audit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ success: true });
  });

  const createTestApp = (
    handler: (c: any) => Response | Promise<Response>
  ) => {
    const app = new Hono<{ Bindings: any; Variables: any }>();
    app.use('*', auditMiddleware);
    app.all('*', handler);
    return app;
  };

  it('TC-AUDIT-01: Writes Audit Log on 2xx Response when auditLogData is present', async () => {
    const app = createTestApp((c) => {
      c.set('auditLogData', {
        coupon_id: 'c_1',
        action: 'created',
        diff_json: { code: 'SAVE20' },
      });
      c.set('adminUser', { id: 'admin_1', email: 'admin@test.com', role: 'admin' });
      return c.json({ success: true }, 201);
    });

    const req = new Request('http://localhost/coupons', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    });

    const res = await app.fetch(req, { DB: {} });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin_1',
        action: 'created',
        entity_type: 'promotion',
        entity_id: 'c_1',
        payload_json: JSON.stringify({
          diff_json: { code: 'SAVE20' },
          ip_address: '1.2.3.4',
        }),
      })
    );
  });

  it('TC-AUDIT-02: Fallback IP Address Detection (x-forwarded-for and unknown)', async () => {
    // Case A: x-forwarded-for fallback
    const app1 = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_2', action: 'updated' });
      return c.json({ success: true }, 200);
    });

    const req1 = new Request('http://localhost/coupons', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });
    await app1.fetch(req1, { DB: {} });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payload_json: JSON.stringify({
          diff_json: null,
          ip_address: '5.6.7.8',
        }),
      })
    );

    mockValues.mockClear();

    // Case B: Default to 'unknown' when no IP headers are set
    const app2 = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_3', action: 'deleted' });
      return c.json({ success: true }, 200);
    });

    const req2 = new Request('http://localhost/coupons');
    await app2.fetch(req2, { DB: {} });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payload_json: JSON.stringify({
          diff_json: null,
          ip_address: 'unknown',
        }),
      })
    );
  });

  it('TC-AUDIT-03: Null Admin User Handling', async () => {
    const app = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_4', action: 'disabled' });
      // adminUser is not set in context
      return c.json({ success: true }, 200);
    });

    const req = new Request('http://localhost/coupons');
    await app.fetch(req, { DB: {} });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: null,
        entity_id: 'c_4',
      })
    );
  });

  it('TC-AUDIT-04: Skipped on Error Statuses (4xx/5xx)', async () => {
    const app400 = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_5', action: 'created' });
      return c.json({ success: false, error: 'Bad Request' }, 400);
    });

    const res400 = await app400.fetch(new Request('http://localhost/coupons'), { DB: {} });
    expect(res400.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();

    const app500 = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_6', action: 'created' });
      return c.json({ success: false, error: 'Internal Error' }, 500);
    });

    const res500 = await app500.fetch(new Request('http://localhost/coupons'), { DB: {} });
    expect(res500.status).toBe(500);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('TC-AUDIT-05: Skipped when auditLogData is missing', async () => {
    const app = createTestApp((c) => {
      // auditLogData is not set
      return c.json({ success: true }, 200);
    });

    const res = await app.fetch(new Request('http://localhost/coupons'), { DB: {} });
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('TC-AUDIT-06: Catches DB Exceptions Gracefully', async () => {
    mockExecute.mockRejectedValueOnce(new Error('D1 Write Error'));

    const app = createTestApp((c) => {
      c.set('auditLogData', { coupon_id: 'c_err', action: 'created' });
      return c.json({ success: true }, 200);
    });

    const res = await app.fetch(new Request('http://localhost/coupons'), { DB: {} });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });
});
