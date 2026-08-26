import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, sql } from 'drizzle-orm';
import { createDb } from '@ecommerce/database';
import { localSchema as schema } from '@ecommerce/core-services';
import { hashPassword, verifyPassword, signJWT, verifyJWT } from '@ecommerce/database';
import { WishlistService, OrderService } from '@ecommerce/core-services';
import { rateLimit, clientIp, type RateLimiter } from './rate-limit';
import { zValidator } from '@hono/zod-validator';
import { CustomerRegisterSchema, CustomerLoginSchema, CustomerAddressSchema, CustomerProfileUpdateSchema, ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema, WishlistAddSchema, WishlistMergeSchema, CUSTOMER_CANCELLABLE_STATUSES } from '@ecommerce/contract';
type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE_KV: KVNamespace;
  ENVIRONMENT?: string;
  AUTH_RATE_LIMITER?: RateLimiter;
  RESEND_API_KEY?: string;
  STOREFRONT_URL?: string;
  FROM_EMAIL?: string;
};

type Variables = {
  jwtPayload: any;
};

const MISSING_JWT_SECRET_ERROR = 'Internal Server Error: Missing JWT_SECRET';
const AUTH_RATE_LIMIT_MESSAGE = 'Too many attempts. Please wait a minute and try again.';

const emailFromBody = async (c: any): Promise<string | null> => {
  try {
    const body = await c.req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return email || null;
  } catch {
    return null;
  }
};

const limitByIp = (scope: string) =>
  rateLimit({
    binding: 'AUTH_RATE_LIMITER',
    scope,
    key: clientIp,
    message: AUTH_RATE_LIMIT_MESSAGE,
  });

const limitByEmail = (scope: string) =>
  rateLimit({
    binding: 'AUTH_RATE_LIMITER',
    scope,
    key: emailFromBody,
    message: AUTH_RATE_LIMIT_MESSAGE,
  });

const customerApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Authentication Routes
customerApp.post('/auth/register', limitByIp('auth-register-ip'), zValidator('json', CustomerRegisterSchema), async (c) => {
  try {
    const { 
      email, password, firstName, lastName, phone, 
      dob, gender, companyName, vatTaxId, acceptsMarketing,
      signupUtmSource, signupUtmMedium, signupUtmCampaign, signupAffiliateId
    } = c.req.valid('json');
    
    if (!email || !password || password.length < 8) {
      return c.json({ success: false, error: 'Invalid email or password must be at least 8 characters' }, 400);
    }

    const db = createDb(c.env.DB);

    // Check if user exists
    const existing = await db.select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .get();
    if (existing) {
      return c.json({ success: false, error: 'Email is already registered' }, 400);
    }

    if (!c.env.JWT_SECRET) {
      return c.json({ success: false, error: MISSING_JWT_SECRET_ERROR }, 500);
    }

    const customerId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);
    const acceptsMarketingInt = acceptsMarketing ? 1 : 0;
    const acceptsMarketingUpdatedAt = acceptsMarketing ? new Date().toISOString() : null;

    await db.insert(schema.customers).values({
      id: customerId,
      email,
      password_hash: hashedPassword,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      status: 'active',
      dob: dob || null,
      gender: gender || null,
      company_name: companyName || null,
      vat_tax_id: vatTaxId || null,
      accepts_marketing: acceptsMarketingInt,
      accepts_marketing_updated_at: acceptsMarketingUpdatedAt,
      signup_utm_source: signupUtmSource || null,
      signup_utm_medium: signupUtmMedium || null,
      signup_utm_campaign: signupUtmCampaign || null,
      signup_affiliate_id: signupAffiliateId || null,
    });

    // Auto-login: Create JWT and set cookie (tv = token_version for revocation)
    const token = await signJWT({ customer_id: customerId, email, tv: 0 }, c.env.JWT_SECRET);
    
    const isProd = c.env.ENVIRONMENT === 'production' || !c.req.url.includes('localhost');
    setCookie(c, 'aura_token', token, {
      path: '/',
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: isProd ? 'None' : 'Lax',
    });

    return c.json({ success: true, message: 'Registered successfully', customer: { id: customerId, email } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/auth/login', limitByEmail('auth-login-email'), limitByIp('auth-login-ip'), zValidator('json', CustomerLoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    if (!c.env.JWT_SECRET) {
      return c.json({ success: false, error: MISSING_JWT_SECRET_ERROR }, 500);
    }

    const db = createDb(c.env.DB);

    const customer = await db.select({
      id: schema.customers.id,
      password_hash: schema.customers.password_hash,
      status: schema.customers.status,
      token_version: schema.customers.token_version,
    })
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .get();

    if (!customer || !customer.password_hash) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    if (customer.status === 'suspended') {
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.' }, 403);
    }

    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const token = await signJWT({ customer_id: customer.id, email, tv: customer.token_version ?? 0 }, c.env.JWT_SECRET);
    
    const isProd = c.env.ENVIRONMENT === 'production' || !c.req.url.includes('localhost');
    setCookie(c, 'aura_token', token, {
      path: '/',
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: isProd ? 'None' : 'Lax',
    });

    return c.json({ success: true, message: 'Logged in successfully', customer: { id: customer.id, email } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// T3.1 (AUTH-02): forgot password — issues a 1h signed reset token and emails
// it via Resend. Response is always generic to prevent account enumeration.
async function sendPasswordResetEmail(env: Bindings, email: string, resetUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Auth] RESEND_API_KEY not set — password-reset email skipped');
    return;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL || 'onboarding@resend.dev',
        to: [email],
        subject: 'Đặt lại mật khẩu của bạn',
        html: `<p>Chào bạn,</p>
               <p>Bấm vào liên kết bên dưới để đặt lại mật khẩu (liên kết hết hạn sau <strong>1 giờ</strong>):</p>
               <p><a href="${resetUrl}">Đặt lại mật khẩu</a></p>
               <p style="color:#888;font-size:12px">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
      }),
    });
  } catch (err) {
    console.error('[Auth] Failed to send password-reset email:', err);
  }
}

customerApp.post('/auth/forgot-password', limitByIp('auth-forgot-ip'), limitByEmail('auth-forgot-email'), zValidator('json', ForgotPasswordSchema), async (c) => {
  try {
    const { email } = c.req.valid('json');
    const normalized = email.trim().toLowerCase();
    const db = createDb(c.env.DB);

    const customer = await db.select({ id: schema.customers.id })
      .from(schema.customers)
      .where(and(
        sql`lower(${schema.customers.email}) = ${normalized}`,
        sql`${schema.customers.deleted_at} IS NULL`
      ))
      .get();

    if (customer && c.env.JWT_SECRET) {
      const token = await signJWT({ scope: 'password-reset', customer_id: customer.id }, c.env.JWT_SECRET, '1h');
      const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
      await sendPasswordResetEmail(c.env, email, `${base}/reset-password?token=${encodeURIComponent(token)}`);
    }

    // Identical response whether or not the account exists.
    return c.json({ success: true, message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' });
  } catch {
    return c.json({ success: true, message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' });
  }
});

customerApp.post('/auth/reset-password', limitByIp('auth-reset-ip'), zValidator('json', ResetPasswordSchema), async (c) => {
  try {
    if (!c.env.JWT_SECRET) {
      return c.json({ success: false, error: 'Internal Server Error: Missing JWT_SECRET' }, 500);
    }
    const { token, new_password } = c.req.valid('json');

    let payload: any;
    try {
      payload = await verifyJWT(token, c.env.JWT_SECRET);
    } catch {
      return c.json({ success: false, error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' }, 400);
    }
    if (payload?.scope !== 'password-reset' || typeof payload?.customer_id !== 'string') {
      return c.json({ success: false, error: 'Liên kết đặt lại mật khẩu không hợp lệ.' }, 400);
    }

    const hashedPassword = await hashPassword(new_password);
    const db = createDb(c.env.DB);
    const result = await db
      .update(schema.customers)
      .set({
        password_hash: hashedPassword,
        token_version: sql`${schema.customers.token_version} + 1`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(schema.customers.id, payload.customer_id))
      .run();

    const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
    if (changes === 0) {
      return c.json({ success: false, error: 'Tài khoản không tồn tại.' }, 404);
    }

    // token_version bump revokes every existing session immediately.
    return c.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/auth/logout', async (c) => {
  const isProd = c.env.ENVIRONMENT === 'production' || !c.req.url.includes('localhost');
  deleteCookie(c, 'aura_token', { 
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
  });
  return c.json({ success: true, message: 'Logged out successfully' });
});

// Middleware for Protected Customer Routes
customerApp.use('/customer/*', async (c, next) => {
  const token = getCookie(c, 'aura_token');
  
  if (!token) {
    return c.json({ success: false, error: 'Unauthorized: No token provided' }, 401);
  }

  if (!c.env.JWT_SECRET) {
    return c.json({ success: false, error: MISSING_JWT_SECRET_ERROR }, 500);
  }

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('jwtPayload', payload);
    
    // Check status in DB to block suspended users and enforce token_version
    // (bumped on password change so older JWTs are revoked).
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);
    const customer = await db.select({
      status: schema.customers.status,
      token_version: schema.customers.token_version,
    })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();

    if (customer && customer.status === 'suspended') {
      deleteCookie(c, 'aura_token', { path: '/' });
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa.' }, 403);
    }

    if (customer && (payload.tv ?? 0) !== (customer.token_version ?? 0)) {
      deleteCookie(c, 'aura_token', { path: '/' });
      return c.json({ success: false, error: 'Unauthorized: Session expired, please sign in again' }, 401);
    }

    await next();
  } catch (err) {
    return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
  }
});

// Customer Orders Route
customerApp.get('/customer/orders', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);

    const results = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.customer_id, customerId))
      .orderBy(sql`${schema.orders.created_at} DESC`)
      .all();
    
    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.get('/customer/orders/:id', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const orderId = c.req.param('id');
    const db = createDb(c.env.DB);
    
    const order = await db.select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customer_id, customerId)))
      .get();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
    
    const items = await db.select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();
    
    return c.json({ success: true, data: { ...order, items } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// T1.3: Self-service cancellation — Laravel CancelOrderAction baseline:
// allowed while the order is still pending_payment/pending/confirmed.
customerApp.post('/customer/orders/:id/cancel', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const orderId = c.req.param('id');
    const db = createDb(c.env.DB);

    const order = await db.select({ status: schema.orders.status })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customer_id, customerId)))
      .get();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status as any)) {
      return c.json({ success: false, error: `Order can no longer be cancelled (status: ${order.status})` }, 400);
    }

    // Optimistic-lock cancel inside the service: restocks inventory, refunds
    // loyalty redemption and reverts coupon usage.
    const cancelled = await OrderService.cancelOrderAndRestock(db, c.env.DB, orderId);
    if (!cancelled) {
      return c.json({ success: false, error: 'Order status changed concurrently, please refresh.' }, 409);
    }

    return c.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// T1.3: One-click reorder — returns the currently purchasable subset of a
// past order (live prices/stock); the client merges them into the cart.
customerApp.post('/customer/orders/:id/reorder', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const orderId = c.req.param('id');
    const db = createDb(c.env.DB);

    const order = await db.select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customer_id, customerId)))
      .get();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);

    const items = await db.select({
      product_id: schema.orderItems.product_id,
      quantity: schema.orderItems.quantity,
    })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();
    if (items.length === 0) {
      return c.json({ success: true, data: { items: [], skipped: [] } });
    }

    const ids = [...new Set(items.map((i: any) => i.product_id))];
    const idChunks = ids.map((id: string) => sql`${id}`);
    const catalogRows = await db.all(sql`
      SELECT p.id, p.title, p.sku,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
        (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = p.id) as stock
      FROM products p
      WHERE p.id IN (${sql.join(idChunks, sql`, `)})
        AND p.deleted_at IS NULL
        AND p.status = 'published'
        AND p.is_purchasable = 1
    `) as any[];

    const byId = new Map(catalogRows.map((r: any) => [r.id, r]));
    const purchasable: any[] = [];
    const skipped: any[] = [];
    for (const item of items) {
      const row = byId.get(item.product_id);
      if (!row) {
        skipped.push({ product_id: item.product_id, reason: 'unavailable' });
        continue;
      }
      const price = Number(row.sale_price ?? row.regular_price ?? 0);
      if (!(price > 0)) {
        skipped.push({ product_id: item.product_id, reason: 'unpriced' });
        continue;
      }
      const stock = Number(row.stock || 0);
      if (stock <= 0) {
        skipped.push({ product_id: item.product_id, reason: 'out_of_stock' });
        continue;
      }
      purchasable.push({
        product_id: item.product_id,
        title: row.title,
        sku: row.sku,
        price,
        quantity: Math.min(item.quantity, stock),
      });
    }

    return c.json({ success: true, data: { items: purchasable, skipped } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Customer Loyalty Route
customerApp.get('/customer/loyalty', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);
    
    // Fetch balance
    const customer = await db.select({ loyalty_points_balance: schema.customers.loyalty_points_balance })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();
      
    if (!customer) return c.json({ success: false, error: 'Customer not found' }, 404);
    
    // Fetch history
    const history = await db.select()
      .from(schema.loyaltyLedgers)
      .where(eq(schema.loyaltyLedgers.customer_id, customerId))
      .orderBy(sql`${schema.loyaltyLedgers.created_at} DESC`)
      .limit(50)
      .all();
      
    return c.json({ 
      success: true, 
      data: {
        balance: customer.loyalty_points_balance || 0,
        history
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});


// Customer Addresses CRUD
customerApp.get('/customer/addresses', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const cacheKey = `user_addresses_${customerId}`;
    
    const cached = await c.env.CACHE_KV.get(cacheKey);
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached), source: 'cache' });
    }

    const db = createDb(c.env.DB);
    const results = await db.select()
      .from(schema.customerAddresses)
      .where(eq(schema.customerAddresses.customer_id, customerId))
      .orderBy(sql`${schema.customerAddresses.created_at} DESC`)
      .all();
    
    // Cache the result for 1 hour
    await c.env.CACHE_KV.put(cacheKey, JSON.stringify(results), { expirationTtl: 3600 });
    
    return c.json({ success: true, data: results, source: 'db' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/customer/addresses', zValidator('json', CustomerAddressSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const data = c.req.valid('json');
    
    const addressId = crypto.randomUUID();
    const db = createDb(c.env.DB);

    await db.insert(schema.customerAddresses).values({
      id: addressId,
      customer_id: customerId,
      alias: data.alias || 'Home',
      first_name: data.first_name,
      last_name: data.last_name,
      company: data.company || null,
      address_1: data.address_1,
      address_2: data.address_2 || null,
      city: data.city,
      state: data.state || null,
      postcode: data.postcode,
      country: data.country || 'VN',
      phone: data.phone || null,
      vat_id: data.vat_id || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      delivery_instructions: data.delivery_instructions || null,
    });

    // Evict KV cache
    await c.env.CACHE_KV.delete(`user_addresses_${customerId}`);

    return c.json({ success: true, message: 'Address created', id: addressId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.patch('/customer/addresses/:id/set-default', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const addressId = c.req.param('id');
    const db = createDb(c.env.DB);
    
    // Atomic batch: clear old default then set new
    await db.batch([
      db.update(schema.customerAddresses)
        .set({ is_default_shipping: 0 })
        .where(eq(schema.customerAddresses.customer_id, customerId)),
      db.update(schema.customerAddresses)
        .set({ is_default_shipping: 1 })
        .where(and(
          eq(schema.customerAddresses.id, addressId),
          eq(schema.customerAddresses.customer_id, customerId)
        )),
    ]);

    // Evict KV cache
    await c.env.CACHE_KV.delete(`user_addresses_${customerId}`);

    return c.json({ success: true, message: 'Default address updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Profile Routes
customerApp.get('/customer/me', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);
    
    const customer = await db.select({
      id: schema.customers.id,
      email: schema.customers.email,
      first_name: schema.customers.first_name,
      last_name: schema.customers.last_name,
      phone: schema.customers.phone,
      dob: schema.customers.dob,
      gender: schema.customers.gender,
      company_name: schema.customers.company_name,
      vat_tax_id: schema.customers.vat_tax_id,
      avatar_url: schema.customers.avatar_url,
      status: schema.customers.status,
      email_verified: schema.customers.email_verified,
      accepts_marketing: schema.customers.accepts_marketing,
      created_at: schema.customers.created_at,
    })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();

    if (!customer) return c.json({ success: false, error: 'Customer not found' }, 404);
    
    return c.json({ success: true, data: customer });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.put('/customer/me', zValidator('json', CustomerProfileUpdateSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const data = c.req.valid('json');
    const db = createDb(c.env.DB);
    
    await db.update(schema.customers)
      .set({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        dob: data.dob || null,
        gender: data.gender || null,
        company_name: data.company_name || null,
        vat_tax_id: data.vat_tax_id || null,
        accepts_marketing: data.accepts_marketing ? 1 : 0,
        accepts_marketing_updated_at: data.accepts_marketing ? new Date().toISOString() : null,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(schema.customers.id, customerId));
      
    return c.json({ success: true, message: 'Profile updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Self-service password change. Verifies the current password, then bumps
// token_version so every previously issued JWT is revoked immediately.
customerApp.put('/customer/me/change-password', zValidator('json', ChangePasswordSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const { current_password, new_password } = c.req.valid('json');
    const db = createDb(c.env.DB);

    if (current_password === new_password) {
      return c.json({ success: false, error: 'New password must be different from the current password' }, 400);
    }

    const customer = await db.select({
      password_hash: schema.customers.password_hash,
      token_version: schema.customers.token_version,
    })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();

    if (!customer || !customer.password_hash) {
      return c.json({ success: false, error: 'Customer not found or has no password set' }, 404);
    }

    const isValid = await verifyPassword(current_password, customer.password_hash);
    if (!isValid) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 400);
    }

    const hashedPassword = await hashPassword(new_password);
    await db.update(schema.customers)
      .set({
        password_hash: hashedPassword,
        token_version: sql`${schema.customers.token_version} + 1`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(schema.customers.id, customerId));

    // The current JWT is now stale (tv mismatch); clear the cookie client-side too.
    deleteCookie(c, 'aura_token', { path: '/' });

    return c.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.put('/customer/addresses/:id', zValidator('json', CustomerAddressSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const addressId = c.req.param('id');
    const data = c.req.valid('json');
    const db = createDb(c.env.DB);
    
    await db.update(schema.customerAddresses)
      .set({
        alias: data.alias || 'Home',
        first_name: data.first_name,
        last_name: data.last_name,
        company: data.company || null,
        address_1: data.address_1,
        address_2: data.address_2 || null,
        city: data.city,
        state: data.state || null,
        postcode: data.postcode,
        country: data.country || 'VN',
        phone: data.phone || null,
        vat_id: data.vat_id || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        delivery_instructions: data.delivery_instructions || null,
      })
      .where(and(
        eq(schema.customerAddresses.id, addressId),
        eq(schema.customerAddresses.customer_id, customerId)
      ));

    // Evict KV cache
    await c.env.CACHE_KV.delete(`user_addresses_${customerId}`);

    return c.json({ success: true, message: 'Address updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.delete('/customer/addresses/:id', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const addressId = c.req.param('id');
    const db = createDb(c.env.DB);
    
    await db.delete(schema.customerAddresses)
      .where(and(
        eq(schema.customerAddresses.id, addressId),
        eq(schema.customerAddresses.customer_id, customerId)
      ));
    
    // Evict KV cache
    await c.env.CACHE_KV.delete(`user_addresses_${customerId}`);

    return c.json({ success: true, message: 'Address deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Customer Wishlist Routes
customerApp.get('/customer/wishlist', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);
    
    const items = await WishlistService.getWishlist(db, customerId);
    
    // Set cache control for edge so it isn't cached aggressively, but browser can cache briefly
    c.header('Cache-Control', 'private, max-age=60');
    return c.json({ success: true, data: items });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/customer/wishlist', zValidator('json', WishlistAddSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const { productId } = c.req.valid('json');

    const db = createDb(c.env.DB);
    const item = await WishlistService.addItem(db, customerId, productId);
    
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.delete('/customer/wishlist/:productId', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const productId = c.req.param('productId');
    
    const db = createDb(c.env.DB);
    await WishlistService.removeItem(db, customerId, productId);
    
    return c.json({ success: true, message: 'Item removed from wishlist' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/customer/wishlist/merge', zValidator('json', WishlistMergeSchema), async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const { productIds } = c.req.valid('json');

    const db = createDb(c.env.DB);
    const items = await WishlistService.mergeWishlist(db, customerId, productIds);
    
    return c.json({ success: true, data: items });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default customerApp;
