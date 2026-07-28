import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
}));

const { mockAll, mockGet, mockRun, mockVerifyJWT } = vi.hoisted(() => ({
  mockAll: vi.fn(),
  mockGet: vi.fn(),
  mockRun: vi.fn(),
  mockVerifyJWT: vi.fn(),
}));

vi.mock('@ecommerce/database', async (importOriginal) => {
  const actual = await importOriginal<any>();
  const makeChain = () => {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.innerJoin = vi.fn(() => chain);
    chain.leftJoin = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.all = mockAll;
    chain.get = mockGet;
    return chain;
  };
  return {
    ...actual,
    verifyJWT: mockVerifyJWT,
    createDb: vi.fn().mockImplementation(() => ({
      select: vi.fn(() => makeChain()),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          run: mockRun,
        }),
      }),
    })),
  };
});

import reviews from '../reviews';

describe('Public API: Reviews Route', () => {
  const mockEnv = {
    DB: {} as any,
    JWT_SECRET: 'test_secret',
  };

  const authedPost = (body: any) =>
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'aura_token=valid_token',
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyJWT.mockResolvedValue({ customer_id: 'cust_10' });
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

    it('TC-REV-API-02: GET /:product_id - Skips Corrupted/Untrusted Metadata', async () => {
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
      expect(body.data).toHaveLength(0);
    });

    it('TC-REV-API-02b: GET /:product_id - Excludes Pending Reviews', async () => {
      mockAll.mockResolvedValue([
        {
          id: 'rev_pending',
          placement: 'prod_100',
          metadata_json: JSON.stringify({
            customer_id: 'c3',
            rating: 5,
            comment: 'Not moderated yet',
            status: 'pending',
            verified_purchase: 0,
          }),
          created_at: '2026-01-04',
        },
      ]);

      const req = new Request('http://localhost/prod_100');
      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data).toHaveLength(0);
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
    it('TC-REV-API-04: POST / - Verified Buyer Is Auto-Approved', async () => {
      mockGet.mockResolvedValue({ id: 'order_item_1' });
      mockRun.mockResolvedValue({ success: true });

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 4, comment: 'Great quality' }),
        mockEnv
      );

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

    it('TC-REV-API-04b: POST / - Non-Purchaser Is Pending & Not Verified', async () => {
      mockGet.mockResolvedValue(undefined);
      mockRun.mockResolvedValue({ success: true });

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 5, comment: 'Never bought it' }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.status).toBe('pending');
      expect(body.data.verified_purchase).toBe(0);
    });

    it('TC-REV-API-04c: POST / - Rejects Unauthenticated Request', async () => {
      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 'prod_100', rating: 5, customer_id: 'spoofed' }),
      });

      const res = await reviews.fetch(req, mockEnv);

      expect(res.status).toBe(401);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('TC-REV-API-04d: POST / - Ignores customer_id Supplied In Body', async () => {
      mockGet.mockResolvedValue({ id: 'order_item_1' });
      mockRun.mockResolvedValue({ success: true });

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 5, customer_id: 'victim_customer' }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.customer_id).toBe('cust_10');
    });

    it('TC-REV-API-04e: POST / - Returns 429 When Rate Limit Is Exceeded', async () => {
      const limitedEnv = {
        ...mockEnv,
        REVIEW_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) },
      };

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 5, comment: 'Spam attempt' }),
        limitedEnv
      );

      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
      expect(limitedEnv.REVIEW_RATE_LIMITER.limit).toHaveBeenCalledWith({
        key: 'review-post:cust_10',
      });
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('TC-REV-API-04f: POST / - Proceeds When Rate Limit Allows', async () => {
      mockGet.mockResolvedValue({ id: 'order_item_1' });
      mockRun.mockResolvedValue({ success: true });

      const allowedEnv = {
        ...mockEnv,
        REVIEW_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
      };

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 5 }),
        allowedEnv
      );

      expect(res.status).toBe(200);
      expect(mockRun).toHaveBeenCalled();
    });

    it('TC-REV-API-05: POST / - Error 400 for Zod Validation Rejection (Rating < 1 or > 5)', async () => {
      const resOver = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 6 }),
        mockEnv
      );
      expect(resOver.status).toBe(400);

      const resUnder = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 0 }),
        mockEnv
      );
      expect(resUnder.status).toBe(400);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('TC-REV-API-06: POST / - Handles Optional Comment', async () => {
      mockGet.mockResolvedValue({ id: 'order_item_1' });
      mockRun.mockResolvedValue({ success: true });

      const res = await reviews.fetch(
        authedPost({ product_id: 'prod_100', rating: 5 }),
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.comment).toBe('');
      expect(body.data.customer_id).toBe('cust_10');
    });
  });
});
