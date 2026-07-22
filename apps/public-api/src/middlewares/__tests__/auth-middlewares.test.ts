import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { jwtAuth } from '../jwtAuth';
import { apiKeyAuth } from '../apiKeyAuth';

describe('Public API Auth Middlewares', () => {
  describe('jwtAuth', () => {
    it('TC-PUB-JWT-01: Missing JWT_SECRET Returns 500', async () => {
      const app = new Hono<{ Bindings: any }>();
      app.use('/protected', jwtAuth);
      app.get('/protected', (c) => c.json({ success: true }));

      const req = new Request('http://localhost/protected');
      // JWT_SECRET is not set in env
      const res = await app.fetch(req, {});

      expect(res.status).toBe(500);
      const body = (await res.json()) as any;
      expect(body).toEqual({
        success: false,
        error: 'Internal Server Error: Missing JWT_SECRET',
      });
    });

    it('TC-PUB-JWT-02: Delegates to Hono JWT Middleware when secret is present', async () => {
      const app = new Hono<{ Bindings: any }>();
      app.use('/protected', jwtAuth);
      app.get('/protected', (c) => c.json({ success: true, user: c.get('jwtPayload') }));

      const secret = 'test-secret-123';
      const token = await sign({ sub: 'user_1' }, secret);

      // Case A: Valid JWT Token
      const reqValid = new Request('http://localhost/protected', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resValid = await app.fetch(reqValid, { JWT_SECRET: secret });

      expect(resValid.status).toBe(200);
      const bodyValid = (await resValid.json()) as any;
      expect(bodyValid.success).toBe(true);
      expect(bodyValid.user.sub).toBe('user_1');

      // Case B: Invalid / Missing JWT Token
      const reqInvalid = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer invalid_token_string' },
      });
      const resInvalid = await app.fetch(reqInvalid, { JWT_SECRET: secret });

      expect(resInvalid.status).toBe(401);
    });
  });

  describe('apiKeyAuth', () => {
    it('TC-PUB-APIKEY-01: Valid API Key Grants Access', async () => {
      const app = new Hono<{ Bindings: any }>();
      app.use('/partner/*', apiKeyAuth);
      app.get('/partner/data', (c) => c.json({ success: true }));

      const env = { PARTNER_API_KEYS: 'key123,key456' };

      // Key 1
      const req1 = new Request('http://localhost/partner/data', {
        headers: { 'x-api-key': 'key123' },
      });
      const res1 = await app.fetch(req1, env);
      expect(res1.status).toBe(200);
      expect(await res1.json()).toEqual({ success: true });

      // Key 2
      const req2 = new Request('http://localhost/partner/data', {
        headers: { 'x-api-key': 'key456' },
      });
      const res2 = await app.fetch(req2, env);
      expect(res2.status).toBe(200);
      expect(await res2.json()).toEqual({ success: true });
    });

    it('TC-PUB-APIKEY-02: Missing / Invalid API Key Returns 401', async () => {
      const app = new Hono<{ Bindings: any }>();
      app.use('/partner/*', apiKeyAuth);
      app.get('/partner/data', (c) => c.json({ success: true }));

      const env = { PARTNER_API_KEYS: 'key123,key456' };

      // Case A: Missing header
      const reqMissing = new Request('http://localhost/partner/data');
      const resMissing = await app.fetch(reqMissing, env);
      expect(resMissing.status).toBe(401);
      expect(await resMissing.json()).toEqual({
        success: false,
        error: 'Unauthorized: Invalid API Key',
      });

      // Case B: Unlisted / Invalid key
      const reqInvalid = new Request('http://localhost/partner/data', {
        headers: { 'x-api-key': 'wrong_key' },
      });
      const resInvalid = await app.fetch(reqInvalid, env);
      expect(resInvalid.status).toBe(401);
      expect(await resInvalid.json()).toEqual({
        success: false,
        error: 'Unauthorized: Invalid API Key',
      });
    });
  });
});
