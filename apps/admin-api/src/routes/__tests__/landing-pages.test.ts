import { describe, it, expect, vi, beforeEach } from 'vitest';
import landingPages from '../landing-pages';

// Mock Auth Middleware
vi.mock('../../middleware/auth', () => ({
  requireRole: () => async (c: any, next: any) => await next(),
}));

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

// Mock Database
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      landingPages: { id: 'landingPages', slug: 'slug', created_at: 'created_at' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        get: mockGet,
        all: mockAll,
        insert: mockInsert.mockReturnThis(),
        values: vi.fn().mockResolvedValue({ success: true }),
        update: mockUpdate.mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: mockDelete.mockReturnThis(),
      };
    }),
  };
});

// Mock Drizzle
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  ne: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

describe('Admin API: Landing Pages Controller', () => {
  const mockEnv = {
    DB: {} as any,
    PRODUCTS_R2: {
      put: vi.fn().mockResolvedValue(true),
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /landing-pages - Slug Uniqueness Validation (Requirement R4)', () => {
    it('returns 409 Conflict when a landing page with the same slug already exists', async () => {
      // Simulate database finding an existing record for the slug
      mockGet.mockResolvedValueOnce({ id: 'existing_lp_id' });

      const res = await landingPages.request('/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Duplicate Slug LP',
          slug: 'duplicate-slug',
        }),
      }, mockEnv);

      expect(res.status).toBe(409);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toBe('A landing page with this slug already exists');
    });

    it('returns 200/201 when creating a landing page with a unique slug', async () => {
      // Simulate database finding no existing record for the slug
      mockGet.mockResolvedValueOnce(null);

      const res = await landingPages.request('/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unique Slug LP',
          slug: 'unique-slug-123',
        }),
      }, mockEnv);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.message).toBe('Landing page created');
    });
  });

  describe('PUT /landing-pages/:id - Slug Uniqueness Validation (Requirement R4)', () => {
    it('returns 409 Conflict when updating a landing page to a slug used by another LP', async () => {
      // Simulate database finding another LP (id != currentId) with the same slug
      mockGet.mockResolvedValueOnce({ id: 'other_lp_id' });

      const res = await landingPages.request('/landing-pages/current_lp_id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated LP Title',
          slug: 'taken-slug',
        }),
      }, mockEnv);

      expect(res.status).toBe(409);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toBe('A landing page with this slug already exists');
    });

    it('returns 200 when updating a landing page with a unique or unchanged slug', async () => {
      // Simulate database finding no other LP with the same slug
      mockGet.mockResolvedValueOnce(null);

      const res = await landingPages.request('/landing-pages/current_lp_id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated LP Title',
          slug: 'my-own-slug',
        }),
      }, mockEnv);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.message).toBe('Landing page updated');
    });

    it('succeeds with 200 when PUT updating an existing LP with the same slug (id == currentId check ignores self)', async () => {
      // Pre-check for duplicate slug returns null because ne(landingPages.id, current_lp_123) filters out self
      mockGet.mockResolvedValueOnce(null);

      const res = await landingPages.request('/landing-pages/current_lp_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Renamed LP Title Only',
          slug: 'existing-same-slug',
        }),
      }, mockEnv);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.message).toBe('Landing page updated');
    });

    it('skips R2 upload and returns 409 when POST includes a logo file but slug is duplicate', async () => {
      mockGet.mockResolvedValueOnce({ id: 'existing_lp' });
      const logoFile = new File(['fake-image-content'], 'logo.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('title', 'Duplicate LP with Logo');
      formData.append('slug', 'duplicate-slug');
      formData.append('header_logo_file', logoFile);

      const res = await landingPages.request('/landing-pages', {
        method: 'POST',
        body: formData,
      }, mockEnv);

      expect(res.status).toBe(409);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toBe('A landing page with this slug already exists');
      expect(mockEnv.PRODUCTS_R2.put).not.toHaveBeenCalled();
    });

    it('returns 400 Bad Request when title or slug is missing', async () => {
      const res = await landingPages.request('/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          slug: 'valid-slug',
        }),
      }, mockEnv);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
    });
  });
});

