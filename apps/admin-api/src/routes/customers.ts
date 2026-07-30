import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema, hashPassword } from '@ecommerce/database';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { customerSchema, resetPasswordSchema } from '@ecommerce/contract';

const customers = new Hono<{ Bindings: Bindings }>();

// 4.5 API Quản lý Khách hàng (CRM)
customers.get('/customers', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
    // NOTE: Drizzle does not support groupBy + aggregate in a single typed select for D1 easily;
    // using sql helper for the complex LEFT JOIN + GROUP BY aggregate query.
    const results = await db.all(sql`
      SELECT 
        c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(o.id) as total_orders
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'refunded'
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return c.json({ success: true, data: results });
  } catch (err: any) {
    console.error('Admin list customers error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

customers.get('/customers/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
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
      status: schema.customers.status,
      accepts_marketing: schema.customers.accepts_marketing,
      tags_json: schema.customers.tags_json,
      note: schema.customers.note,
      created_at: schema.customers.created_at,
    })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();
    
    if (!customer) return c.json({ success: false, error: 'Customer not found' }, 404);
    
    const orders = await db.select({
      id: schema.orders.id,
      status: schema.orders.status,
      total_amount: schema.orders.total_amount,
      created_at: schema.orders.created_at,
    })
      .from(schema.orders)
      .where(eq(schema.orders.customer_id, customerId))
      .orderBy(sql`${schema.orders.created_at} DESC`)
      .all();

    const addresses = await db.select()
      .from(schema.customerAddresses)
      .where(eq(schema.customerAddresses.customer_id, customerId))
      .all();
    
    return c.json({ success: true, data: { customer, orders, addresses } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customers.put('/customers/:id', requireRole(['superadmin', 'manager']), zValidator('json', customerSchema), async (c) => {
  try {
    const customerId = c.req.param('id');
    const db = createDb(c.env.DB);
    const { 
      first_name, last_name, phone, status, dob, gender, 
      company_name, vat_tax_id, accepts_marketing, tags_json, note 
    } = c.req.valid('json');
    
    const finalStatus = status || 'active';
    if (!['active', 'suspended', 'verification_pending', 'invited'].includes(finalStatus)) {
      return c.json({ success: false, error: 'Invalid status value' }, 400);
    }
    
    await db.update(schema.customers)
      .set({
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        status: finalStatus,
        dob: dob || null,
        gender: gender || 'unspecified',
        company_name: company_name || null,
        vat_tax_id: vat_tax_id || null,
        accepts_marketing: accepts_marketing ? 1 : 0,
        tags_json: tags_json || '[]',
        note: note || null,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(schema.customers.id, customerId));
      
    return c.json({ success: true, message: 'Customer updated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

customers.post('/customers', requireRole(['superadmin', 'manager']), zValidator('json', customerSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { 
      email, password, first_name, last_name, phone, status, dob, gender, 
      company_name, vat_tax_id, accepts_marketing, tags_json, note 
    } = c.req.valid('json');

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    const existing = await db.select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .get();
    if (existing) {
      return c.json({ success: false, error: 'Email is already registered' }, 400);
    }

    const customerId = crypto.randomUUID();
    let hashedPassword: string | null = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    const acceptsMarketingInt = accepts_marketing ? 1 : 0;
    const acceptsMarketingUpdatedAt = accepts_marketing ? new Date().toISOString() : null;

    await db.insert(schema.customers).values({
      id: customerId,
      email,
      password_hash: hashedPassword,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      status: status || 'active',
      dob: dob || null,
      gender: gender || 'unspecified',
      company_name: company_name || null,
      vat_tax_id: vat_tax_id || null,
      accepts_marketing: acceptsMarketingInt,
      accepts_marketing_updated_at: acceptsMarketingUpdatedAt,
      tags_json: tags_json || '[]',
      note: note || null,
    });

    return c.json({
      success: true,
      message: 'Customer created successfully',
      data: { id: customerId, email, first_name, last_name, phone },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Reset Password for a Customer (Admin Action)
customers.post('/customers/:id/reset-password', requireRole(['superadmin', 'manager']), zValidator('json', resetPasswordSchema), async (c) => {
  const customerId = c.req.param('id');
  try {
    const body = c.req.valid('json');

    const db = createDb(c.env.DB);

    const customer = await db.select({ id: schema.customers.id, email: schema.customers.email })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }

    const hashedPassword = await hashPassword(body.new_password);
    await db.update(schema.customers)
      .set({ password_hash: hashedPassword, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(schema.customers.id, customerId));

    return c.json({
      success: true,
      message: `Password reset successfully for ${customer.email}`,
      data: {
        customer_id: customerId,
        email: customer.email,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default customers;
