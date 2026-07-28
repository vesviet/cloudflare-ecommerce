import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { adminAuth, requireRole } from '../auth';

const mockJwtVerify = vi.fn();
const mockCreateRemoteJWKSet = vi.fn().mockReturnValue({});

vi.mock('jose', () => ({
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
  createRemoteJWKSet: (...args: any[]) => mockCreateRemoteJWKSet(...args),
}));

const mockGetUser = vi.fn();

vi.mock('@ecommerce/database', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createDb: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGetUser,
          }),
        }),
      }),
    })),
  };
});

describe('Admin API Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminAuth', () => {
    // Mirrors the real worker, which mounts every route under the /api base path.
    const createTestApp = () => {
      const app = new Hono<{ Bindings: any; Variables: any }>().basePath('/api');
      app.use('*', adminAuth);
      app.get('/media/image.png', (c) => c.json({ success: true, public: true }));
      app.get('/customers/:id', (c) => c.json({ success: true, user: c.get('adminUser') }));
      app.get('/store/orders', (c) => c.json({ success: true, user: c.get('adminUser') }));
      app.get('/admin/dashboard', (c) =>
        c.json({ success: true, user: c.get('adminUser') })
      );
      return app;
    };

    it('TC-AUTH-MDL-01: adminAuth Bypasses Public Media Paths', async () => {
      const app = createTestApp();
      const req = new Request('http://localhost/api/media/image.png');
      const res = await app.fetch(req, {});

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toEqual({ success: true, public: true });
    });

    it('TC-AUTH-MDL-01b: adminAuth Protects Routes Adjacent To Public Prefixes', async () => {
      const app = createTestApp();

      // /api/customers must not be treated as public just because /customer was
      // once listed as a bypass prefix. Same for the storefront order endpoint.
      for (const path of ['/api/customers/cust_1', '/api/store/orders']) {
        const req = new Request(`http://localhost${path}`);
        const res = await app.fetch(req, {});
        expect(res.status).toBe(403);
      }
    });

    it('TC-AUTH-MDL-02: Spoofing Protection for X-Local-Admin-Email in Non-Local Envs', async () => {
      const app = createTestApp();
      const req = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'X-Local-Admin-Email': 'hacker@test.com' },
      });

      const env = { ENVIRONMENT: 'production' };
      const res = await app.fetch(req, env);

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        success: false,
        error:
          'Access Denied: Local Development Headers Not Allowed in Non-Local Environments',
      });
    });

    it('TC-AUTH-MDL-03: adminAuth Local Dev Mode Success', async () => {
      const app = createTestApp();
      const mockUser = {
        id: 'usr_dev',
        email: 'dev@local.test',
        name: 'Dev Admin',
        role: 'admin',
        status: 'active',
      };
      mockGetUser.mockResolvedValue(mockUser);

      const req = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'X-Local-Admin-Email': 'dev@local.test' },
      });
      const env = { LOCAL_DEV: 'true', ENVIRONMENT: 'local' };

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.user).toEqual(mockUser);
    });

    it('TC-AUTH-MDL-04: Production Zero Trust - Missing CF Assertion Header', async () => {
      const app = createTestApp();
      const req = new Request('http://localhost/api/admin/dashboard');
      const env = { ENVIRONMENT: 'production' };

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        success: false,
        error: 'Access Denied: Cloudflare Zero Trust Authentication Required',
      });
    });

    it('TC-AUTH-MDL-05: Production Zero Trust - Valid JWT Assertion', async () => {
      const app = createTestApp();
      const mockUser = {
        id: 'usr_corp',
        email: 'admin@corp.com',
        name: 'Corp Admin',
        role: 'admin',
        status: 'active',
      };

      mockJwtVerify.mockResolvedValue({
        payload: { email: 'admin@corp.com' },
      });
      mockGetUser.mockResolvedValue(mockUser);

      const req = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'CF-Access-JWT-Assertion': 'valid_jwt_token' },
      });
      const env = {
        ENVIRONMENT: 'production',
        TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
        AUDIENCE_TAG: 'aud_123',
      };

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.user).toEqual(mockUser);
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid_jwt_token',
        expect.anything(),
        { audience: 'aud_123' }
      );
    });

    it('TC-AUTH-MDL-06: Production Zero Trust - Invalid / Expired JWT Assertion', async () => {
      const app = createTestApp();
      mockJwtVerify.mockRejectedValue(new Error('jwt expired'));

      const req = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'CF-Access-JWT-Assertion': 'invalid_token' },
      });
      const env = {
        ENVIRONMENT: 'production',
        TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
        AUDIENCE_TAG: 'aud_123',
      };

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        success: false,
        error: 'Access Denied: Invalid JWT Token',
      });
    });

    it('TC-AUTH-MDL-07: adminAuth - Unregistered or Inactive Admin User', async () => {
      const app = createTestApp();

      // Test case A: User not found in DB
      mockGetUser.mockResolvedValue(null);
      const reqNotFound = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'X-Local-Admin-Email': 'missing@local.dev' },
      });
      const envLocal = { LOCAL_DEV: 'true', ENVIRONMENT: 'local' };

      const resNotFound = await app.fetch(reqNotFound, envLocal);
      expect(resNotFound.status).toBe(403);
      expect(await resNotFound.json()).toEqual({
        success: false,
        error: 'Access Denied: Unregistered or inactive admin user',
      });

      // Test case B: User is disabled/inactive
      mockGetUser.mockResolvedValue({
        id: 'usr_disabled',
        email: 'disabled@local.dev',
        status: 'disabled',
      });
      const reqDisabled = new Request('http://localhost/api/admin/dashboard', {
        headers: { 'X-Local-Admin-Email': 'disabled@local.dev' },
      });

      const resDisabled = await app.fetch(reqDisabled, envLocal);
      expect(resDisabled.status).toBe(403);
      expect(await resDisabled.json()).toEqual({
        success: false,
        error: 'Access Denied: Unregistered or inactive admin user',
      });
    });
  });

  describe('requireRole', () => {
    const createRoleApp = (allowedRoles: string[], mockUser?: any) => {
      const app = new Hono<{ Bindings: any; Variables: any }>();
      app.use('*', async (c, next) => {
        if (mockUser) {
          c.set('adminUser', mockUser);
        }
        await next();
      });
      app.get('/restricted', requireRole(allowedRoles), (c) =>
        c.json({ success: true })
      );
      return app;
    };

    it('TC-AUTH-MDL-08: requireRole - User Has Allowed Role', async () => {
      const mockUser = { id: 'u1', role: 'editor' };
      const app = createRoleApp(['editor', 'admin'], mockUser);

      const req = new Request('http://localhost/restricted');
      const res = await app.fetch(req, {});
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('TC-AUTH-MDL-09: requireRole - superadmin Bypass', async () => {
      const mockUser = { id: 'u_super', role: 'superadmin' };
      const app = createRoleApp(['inventory_manager'], mockUser);

      const req = new Request('http://localhost/restricted');
      const res = await app.fetch(req, {});
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('TC-AUTH-MDL-10: requireRole - Missing Admin User (401)', async () => {
      const app = createRoleApp(['admin'], undefined);

      const req = new Request('http://localhost/restricted');
      const res = await app.fetch(req, {});
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('TC-AUTH-MDL-11: requireRole - Insufficient Role Permissions (403)', async () => {
      const mockUser = { id: 'u_support', role: 'support' };
      const app = createRoleApp(['admin'], mockUser);

      const req = new Request('http://localhost/restricted');
      const res = await app.fetch(req, {});
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    });
  });
});
