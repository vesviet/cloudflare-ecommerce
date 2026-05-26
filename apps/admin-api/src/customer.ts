import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, signJWT, verifyJWT } from './auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const customerApp = new Hono<{ Bindings: Bindings }>();

// Authentication Routes
customerApp.post('/auth/register', async (c) => {
  try {
    const { email, password, firstName, lastName, phone } = await c.req.json();
    
    if (!email || !password || password.length < 8) {
      return c.json({ success: false, error: 'Invalid email or password must be at least 8 characters' }, 400);
    }

    // Check if user exists
    const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ success: false, error: 'Email is already registered' }, 400);
    }

    const customerId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await c.env.DB.prepare(
      'INSERT INTO customers (id, email, password_hash, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(customerId, email, hashedPassword, firstName || null, lastName || null, phone || null).run();

    // Auto-login: Create JWT and set cookie
    const token = await signJWT({ customer_id: customerId, email }, c.env.JWT_SECRET || 'dev_secret_key');
    
    setCookie(c, 'aura_token', token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'Lax',
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

    const customer = await c.env.DB.prepare('SELECT id, password_hash FROM customers WHERE email = ?').bind(email).first<{ id: string, password_hash: string }>();
    if (!customer || !customer.password_hash) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const token = await signJWT({ customer_id: customer.id, email }, c.env.JWT_SECRET || 'dev_secret_key');
    
    setCookie(c, 'aura_token', token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'Lax',
    });

    return c.json({ success: true, message: 'Logged in successfully', customer: { id: customer.id, email } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customerApp.post('/auth/logout', async (c) => {
  deleteCookie(c, 'aura_token', { path: '/' });
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
    
    const { results } = await c.env.DB.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').bind(customerId).all();
    
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
    
    const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').bind(orderId, customerId).first();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
    
    const { results: items } = await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all();
    
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
    
    const { results } = await c.env.DB.prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC').bind(customerId).all();
    return c.json({ success: true, data: results });
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
    
    await c.env.DB.prepare(`
      INSERT INTO customer_addresses (id, customer_id, alias, first_name, last_name, address_1, address_2, city, state, postcode, country, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      addressId, customerId, data.alias || 'Home', data.first_name, data.last_name, 
      data.address_1, data.address_2 || null, data.city, data.state || null, data.postcode, data.country || 'VN', data.phone || null
    ).run();

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
    
    // Atomic update to clear old default and set new
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE customer_addresses SET is_default_shipping = 0 WHERE customer_id = ?').bind(customerId),
      c.env.DB.prepare('UPDATE customer_addresses SET is_default_shipping = 1 WHERE id = ? AND customer_id = ?').bind(addressId, customerId)
    ]);

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
    
    const customer = await c.env.DB.prepare('SELECT id, email, first_name, last_name, phone, created_at FROM customers WHERE id = ?').bind(customerId).first();
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
    
    await c.env.DB.prepare('UPDATE customers SET first_name = ?, last_name = ?, phone = ? WHERE id = ?')
      .bind(data.first_name, data.last_name, data.phone, customerId).run();
      
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
    
    await c.env.DB.prepare(`
      UPDATE customer_addresses SET alias = ?, first_name = ?, last_name = ?, address_1 = ?, address_2 = ?, city = ?, state = ?, postcode = ?, country = ?, phone = ?
      WHERE id = ? AND customer_id = ?
    `).bind(
      data.alias || 'Home', data.first_name, data.last_name, 
      data.address_1, data.address_2 || null, data.city, data.state || null, data.postcode, data.country || 'VN', data.phone || null,
      addressId, customerId
    ).run();

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
    
    await c.env.DB.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').bind(addressId, customerId).run();
    
    return c.json({ success: true, message: 'Address deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default customerApp;
