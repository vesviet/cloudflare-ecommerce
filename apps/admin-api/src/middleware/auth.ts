import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import type { Bindings } from '../types';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

export type Env = {
  Bindings: Bindings;
  Variables: {
    adminUser: AdminUser;
  };
};

// Middleware to extract email from CF JWT and fetch user from DB
export const adminAuth = createMiddleware<Env>(async (c, next) => {
  const path = c.req.path;
  // Bỏ qua kiểm tra Zero Trust cho các API của Storefront và Media
  if (path.startsWith('/store') || path.startsWith('/auth') || path.startsWith('/customer') || path.startsWith('/media')) {
    return next();
  }

  const isLocalDev = c.env.ENVIRONMENT === 'development';
  let email = '';

  if (isLocalDev) {
    // In local dev, use custom header or default to admin@local.dev
    email = c.req.header('X-Local-Admin-Email') || 'admin@local.dev';
  } else {
    // In production, parse Cloudflare Zero Trust JWT
    const cfAccessJwt = c.req.header('CF-Access-JWT-Assertion');
    if (!cfAccessJwt) {
      return c.json({ success: false, error: 'Access Denied: Cloudflare Zero Trust Authentication Required' }, 403);
    }
    
    try {
      // Decode JWT payload (part 2)
      const payloadBase64 = cfAccessJwt.split('.')[1];
      const payloadString = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadString);
      email = payload.email;
    } catch (e) {
      return c.json({ success: false, error: 'Access Denied: Invalid JWT Token' }, 403);
    }
  }

  if (!email) {
    return c.json({ success: false, error: 'Access Denied: No email found in token' }, 403);
  }

  // Look up user in database
  const db = createDb(c.env.DB);
  const user = await db.select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .get();

  if (!user || user.status !== 'active') {
    return c.json({ success: false, error: 'Access Denied: Unregistered or inactive admin user' }, 403);
  }

  // Inject user into context
  c.set('adminUser', user);
  await next();
});

// Middleware to require specific roles
export const requireRole = (allowedRoles: string[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get('adminUser');
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // superadmin can access everything
    if (user.role === 'superadmin') {
      return next();
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden: Insufficient permissions' }, 403);
    }

    await next();
  });
};
