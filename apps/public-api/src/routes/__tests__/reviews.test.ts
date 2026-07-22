import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
}));

import reviews from '../reviews';

const mockAll = vi.fn();
const mockRun = vi.fn();

vi.mock('@ecommerce/database', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createDb: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          run: mockRun,
        }),
      }),
    })),
  };
});

describe('Public API: Reviews Route', () => {
  const mockEnv = {
    DB: {} as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /:product_id', () => {
    it('TC-REV-API-01: GET /:product_id - Success (Returns mapped & filtered reviews)', async () => {
      mockAll.mockResolvedValue([
        {
          id: 'rev_1',
          placement: 'prod_100',
          metadata_json: JSON.stringify({
            customer_id: 'c1',
            rating: 5,
            comment: 'Excellent',
            status: 'approved',
            verified_purchase: 1,
          }),
          created_at: '2026-01-01',
        },
        {
          id: 'rev_2',
          placement: 'prod_100',
          metadata_json: JSON.stringify({
            customer_id: 'c2',
            rating: 1,
            comment: 'Spam',
            status: 'rejected',
            verified_purchase: 0,
          }),
          created_at: '2026-01-02',
        },
      ]);

      const req = new Request('http://localhost/prod_100');
      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toEqual({
        id: 'rev_1',
        product_id: 'prod_100',
        customer_id: 'c1',
        rating: 5,
        comment: 'Excellent',
        status: 'approved',
        verified_purchase: 1,
        created_at: '2026-01-01',
      });
    });

    it('TC-REV-API-02: GET /:product_id - Handles Corrupted/Empty Metadata Gracefully', async () => {
      mockAll.mockResolvedValue([
        {
          id: 'rev_corrupt',
          placement: 'prod_100',
          metadata_json: 'invalid json string',
          created_at: '2026-01-03',
        },
      ]);

      const req = new Request('http://localhost/prod_100');
      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toEqual({
        id: 'rev_corrupt',
        product_id: 'prod_100',
        customer_id: null,
        rating: 5,
        comment: '',
        status: 'approved',
        verified_purchase: 1,
        created_at: '2026-01-03',
      });
    });

    it('TC-REV-API-03: GET /:product_id - Error 500 on DB Failure', async () => {
      mockAll.mockRejectedValue(new Error('D1 Connection Failed'));

      const req = new Request('http://localhost/prod_100');
      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(500);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        success: false,
        error: 'D1 Connection Failed',
      });
    });
  });

  describe('POST /', () => {
    it('TC-REV-API-04: POST / - Success (Creates new review)', async () => {
      mockRun.mockResolvedValue({ success: true });

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'prod_100',
          rating: 4,
          comment: 'Great quality',
          customer_id: 'cust_10',
        }),
      });

      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        id: expect.stringMatching(/^rev_/),
        product_id: 'prod_100',
        customer_id: 'cust_10',
        rating: 4,
        comment: 'Great quality',
        status: 'approved',
        verified_purchase: 1,
        created_at: expect.any(String),
      });
      expect(mockRun).toHaveBeenCalled();
    });

    it('TC-REV-API-05: POST / - Error 400 for Zod Validation Rejection (Rating < 1 or > 5)', async () => {
      const reqOver = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'prod_100',
          rating: 6,
        }),
      });

      const resOver = await reviews.fetch(reqOver, mockEnv);
      expect(resOver.status).toBe(400);

      const reqUnder = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'prod_100',
          rating: 0,
        }),
      });

      const resUnder = await reviews.fetch(reqUnder, mockEnv);
      expect(resUnder.status).toBe(400);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('TC-REV-API-06: POST / - Handles Optional Fields (Missing comment or customer_id)', async () => {
      mockRun.mockResolvedValue({ success: true });

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'prod_100',
          rating: 5,
        }),
      });

      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.comment).toBe('');
      expect(body.data.customer_id).toBeNull();
    });
  });
});
