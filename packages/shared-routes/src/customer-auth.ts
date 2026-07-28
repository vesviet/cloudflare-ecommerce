import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '@ecommerce/database';

export type CustomerAuthEnv = {
  Bindings: {
    JWT_SECRET?: string;
  };
  Variables: {
    customerId: string;
  };
};

/**
 * Resolves the customer from the session cookie and exposes it as `customerId`.
 * Routes must never take a customer id from the request body.
 */
export const requireCustomer = (options: { message?: string } = {}) => {
  const { message = 'Unauthorized: Sign in to continue' } = options;

  return createMiddleware<CustomerAuthEnv>(async (c, next) => {
    const token = getCookie(c, 'aura_token');
    if (!token) {
      return c.json({ success: false, error: message }, 401);
    }

    if (!c.env.JWT_SECRET) {
      return c.json({ success: false, error: 'Internal Server Error: Missing JWT_SECRET' }, 500);
    }

    try {
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      if (!payload?.customer_id) {
        return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
      }
      c.set('customerId', payload.customer_id as string);
    } catch {
      return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
    }

    await next();
  });
};
