import { describe, it, expect, vi, beforeEach } from 'vitest';
import landingPages from '../landing-pages';
import fs from 'fs';
import path from 'path';

// Define reusable mockDb object
const mockDbBuilder: any = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
};

// Set up method chaining behavior on mockDbBuilder
mockDbBuilder.select.mockReturnValue(mockDbBuilder);
mockDbBuilder.from.mockReturnValue(mockDbBuilder);
mockDbBuilder.where.mockReturnValue(mockDbBuilder);
mockDbBuilder.get.mockResolvedValue({ id: 'lp_1', product_id: 'prod_1', slug: 'test-lp' });
mockDbBuilder.all.mockResolvedValue([{ id: 'var_1', sku: 'SKU1', stock: 10 }]);
mockDbBuilder.insert.mockReturnValue(mockDbBuilder);
mockDbBuilder.values.mockResolvedValue({ success: true });
mockDbBuilder.update.mockReturnValue(mockDbBuilder);
mockDbBuilder.set.mockReturnValue(mockDbBuilder);

// Mock Database Module
vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      landingPages: { id: 'landingPages', slug: 'slug', product_id: 'product_id' },
      products: { id: 'products', status: 'status' },
      productVariants: { id: 'productVariants', product_id: 'product_id', stock: 'stock' },
      orders: { id: 'orders' },
      orderItems: { id: 'orderItems' },
      landingPageLeads: { id: 'landingPageLeads' },
    },
    createDb: vi.fn(() => mockDbBuilder),
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  sql: Object.assign(vi.fn(), { join: vi.fn() }),
}));

describe('Landing Pages Route & Secret Sanitization Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-assign chainable returns after restoreAllMocks
    mockDbBuilder.select.mockReturnValue(mockDbBuilder);
    mockDbBuilder.from.mockReturnValue(mockDbBuilder);
    mockDbBuilder.where.mockReturnValue(mockDbBuilder);
    mockDbBuilder.get.mockResolvedValue({ id: 'lp_1', product_id: 'prod_1', slug: 'test-lp' });
    mockDbBuilder.all.mockResolvedValue([{ id: 'var_1', sku: 'SKU1', stock: 10 }]);
    mockDbBuilder.insert.mockReturnValue(mockDbBuilder);
    mockDbBuilder.values.mockResolvedValue({ success: true });
    mockDbBuilder.update.mockReturnValue(mockDbBuilder);
    mockDbBuilder.set.mockReturnValue(mockDbBuilder);
  });

  describe('1. Wrangler secret sanitization audit', () => {
    it('verifies zero hardcoded secrets in all wrangler.toml files', () => {
      const projectRoot = path.resolve(__dirname, '../../../../..');
      const wranglerFiles = [
        path.join(projectRoot, 'apps/admin-api/wrangler.toml'),
        path.join(projectRoot, 'apps/public-api/wrangler.toml'),
        path.join(projectRoot, 'apps/storefront-ui/wrangler.toml'),
      ];

      const forbiddenSecretKeys = [
        'CF_TURNSTILE_SECRET_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'RESEND_API_KEY',
        'JWT_SECRET',
      ];

      for (const filePath of wranglerFiles) {
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check each forbidden key: if present under [vars], ensure it is NOT assigned a plain-text secret value
        for (const secretKey of forbiddenSecretKeys) {
          const assignmentRegex = new RegExp(`^\\s*${secretKey}\\s*=`, 'm');
          expect(content).not.toMatch(assignmentRegex);
        }
      }
    });
  });

  describe('2. POST /api/landing-pages/leads & Turnstile binding logic', () => {
    const mockExecutionCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    };

    it('P0: Accepts dev dummy token without calling Turnstile siteverify API', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        TURNSTILE_SECRET_KEY: '0x4AAAAAAAx_mock_secret_key',
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'John Doe',
          customer_phone: '0901234567',
          customer_address: '123 Main St',
          turnstile_token: '1x0000000000000000000000000000000AA',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.order_id).toBeDefined();

      // siteverify API must NOT be called for dummy token
      expect(fetchSpy).not.toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.anything()
      );
    });

    it('P0: Rejects request with missing turnstile_token when TURNSTILE_SECRET_KEY is configured', async () => {
      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        TURNSTILE_SECRET_KEY: '0x4AAAAAAAx_mock_secret_key',
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'John Doe',
          customer_phone: '0901234567',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(403);

      const data = (await res.json()) as any;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing turnstile token');
    });

    it('P0: Rejects request when Turnstile siteverify returns success: false', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('siteverify')) {
          return new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      });

      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        TURNSTILE_SECRET_KEY: '0x4AAAAAAAx_mock_secret_key',
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'John Doe',
          customer_phone: '0901234567',
          turnstile_token: 'invalid_token_xyz',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(403);

      const data = (await res.json()) as any;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Turnstile verification failed');
    });

    it('P0: Accepts request when Turnstile siteverify returns success: true', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('siteverify')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      });

      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        TURNSTILE_SECRET_KEY: '0x4AAAAAAAx_mock_secret_key',
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Jane Doe',
          customer_phone: '0909876543',
          turnstile_token: 'valid_token_abc',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });

    it('P0: Skips Turnstile check when TURNSTILE_SECRET_KEY is unconfigured/undefined', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        TURNSTILE_SECRET_KEY: undefined as any,
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'No Turnstile Env',
          customer_phone: '0900000000',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('P0: Key Name Binding Alignment — proves TURNSTILE_SECRET_KEY binding is expected in c.env', async () => {
      const mockEnvWithLegacyKey = {
        DB: {} as any,
        CACHE_KV: {} as any,
        CF_TURNSTILE_SECRET_KEY: 'legacy_key_val', // mismatched name
        TURNSTILE_SECRET_KEY: undefined,
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Legacy Mismatch',
          customer_phone: '0901111222',
        }),
      });

      const res = await landingPages.fetch(req, mockEnvWithLegacyKey as any, mockExecutionCtx as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });

    it('P1: Triggers CRM webhook via waitUntil when WEBHOOK_CRM_URL is configured', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const mockEnv = {
        DB: {} as any,
        CACHE_KV: {} as any,
        WEBHOOK_CRM_URL: 'https://crm.example.com/hooks/lead',
      };

      const req = new Request('http://localhost/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'CRM Webhook Test',
          customer_phone: '0905554443',
        }),
      });

      const res = await landingPages.fetch(req, mockEnv, mockExecutionCtx as any);
      expect(res.status).toBe(200);
      expect(mockExecutionCtx.waitUntil).toHaveBeenCalled();
    });
  });
});
