import { describe, it, expect, vi } from 'vitest';

// cart.ts imports PromotionEngine from core-services, whose barrel also loads a
// Durable Object module ('cloudflare:workers') unavailable under Vitest. Stub the
// package surface this route actually uses.
vi.mock('@ecommerce/core-services', () => ({
  PromotionEngine: { evaluate: vi.fn() },
  CartService: { syncCart: vi.fn() },
  localSchema: { promotions: {} },
}));

const { default: cart } = await import('../cart');

const SECRET = 'test-secret-for-cart-recovery-tests-0123456789';

// Minimal D1 stand-in: cart routes under test fail at the DB boundary,
// so a stub that throws on use is enough for auth/validation paths.
const fakeDb: any = {
  prepare: () => {
    throw new Error('DB should not be reached in these tests');
  },
};

const env = { DB: fakeDb, JWT_SECRET: SECRET };

const createApp = () => cart;

const postRecover = (body: unknown, envOverride: any = env) =>
  createApp().fetch(
    new Request('http://localhost/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    envOverride
  );

describe('POST /cart/recover', () => {
  it('rejects missing token with 400', async () => {
    const res = await postRecover({});
    expect(res.status).toBe(400);
  });

  it('rejects an empty token with 400', async () => {
    const res = await postRecover({ token: '' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a garbage token', async () => {
    const res = await postRecover({ token: 'not-a-jwt' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });

  it('returns 404 when the token is signed with a different secret', async () => {
    const { signJWT } = await import('@ecommerce/database');
    const badToken = await signJWT(
      { cart_id: 'cart_1', scope: 'cart-recovery' },
      'wrong-secret-wrong-secret-wrong-secret-123'
    );
    const res = await postRecover({ token: badToken });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the token has the wrong scope', async () => {
    const { signJWT } = await import('@ecommerce/database');
    const token = await signJWT({ cart_id: 'cart_1', scope: 'customer' }, SECRET);
    const res = await postRecover({ token });
    expect(res.status).toBe(404);
  });

  it('returns 500 instead of leaking when JWT_SECRET is missing', async () => {
    const res = await postRecover({ token: 'anything' }, { DB: fakeDb });
    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });
});
