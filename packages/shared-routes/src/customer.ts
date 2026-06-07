import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { hashPassword, verifyPassword, signJWT, verifyJWT } from '@ecommerce/database';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE_KV: KVNamespace;
  ENVIRONMENT?: string;
};

type Variables = {
  jwtPayload: any;
};

const customerApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Authentication Routes
customerApp.post('/auth/register', async (c) => {
  try {
    const { 
      email, password, firstName, lastName, phone, 
      dob, gender, companyName, vatTaxId, acceptsMarketing,
      signupUtmSource, signupUtmMedium, signupUtmCampaign, signupAffiliateId
    } = await c.req.json();
    
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

    // Auto-login: Create JWT and set cookie
    const token = await signJWT({ customer_id: customerId, email }, c.env.JWT_SECRET || 'dev_secret_key');
    
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

customerApp.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const db = createDb(c.env.DB);

    const customer = await db.select({
      id: schema.customers.id,
      password_hash: schema.customers.password_hash,
      status: schema.customers.status,
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

    const token = await signJWT({ customer_id: customer.id, email }, c.env.JWT_SECRET || 'dev_secret_key');
    
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

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev_secret_key');
    c.set('jwtPayload', payload);
    
    // Check status in DB to block suspended users
    const customerId = payload.customer_id;
    const db = createDb(c.env.DB);
    const customer = await db.select({ status: schema.customers.status })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();

    if (customer && customer.status === 'suspended') {
      deleteCookie(c, 'aura_token', { path: '/' });
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa.' }, 403);
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

customerApp.post('/customer/addresses', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const data = await c.req.json();
    
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

customerApp.put('/customer/me', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const data = await c.req.json();
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

customerApp.put('/customer/addresses/:id', async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const customerId = payload.customer_id;
    const addressId = c.req.param('id');
    const data = await c.req.json();
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

export default customerApp;
