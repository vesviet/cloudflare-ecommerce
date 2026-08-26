import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { requireRole, type Env } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { adminUserSchema, adminUserStatusSchema as statusSchema } from '@ecommerce/contract';

const adminUsers = new Hono<Env>();

// Only superadmin can manage admin users
adminUsers.use('*', requireRole(['superadmin']));

adminUsers.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const users = await db.select()
      .from(schema.adminUsers)
      .all();
    return c.json({ success: true, data: users });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

adminUsers.post('/', zValidator('json', adminUserSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { email, name, role } = c.req.valid('json');

    const id = crypto.randomUUID();
    await db.insert(schema.adminUsers).values({
      id,
      email,
      name,
      role,
      status: 'active'
    });
    
    return c.json({ success: true, message: 'Admin user created successfully' });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
       return c.json({ success: false, error: 'Email already exists' }, 400);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

adminUsers.put('/:id/status', zValidator('json', statusSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    const { status } = c.req.valid('json');

    await db.update(schema.adminUsers)
      .set({ status })
      .where(eq(schema.adminUsers.id, id));

    return c.json({ success: true, message: 'Admin user status updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Phase 5 (ADM-19): role editing — UI was missing even though status API existed.
const roleUpdateSchema = z.object({
  role: z.enum(['superadmin', 'manager', 'support', 'editor']),
});

adminUsers.put('/:id/role', zValidator('json', roleUpdateSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    const { role } = c.req.valid('json');

    // Guard: never demote the last active superadmin.
    if (role !== 'superadmin') {
      const target = await db.select({ role: schema.adminUsers.role, status: schema.adminUsers.status })
        .from(schema.adminUsers).where(eq(schema.adminUsers.id, id)).get();
      if (target?.role === 'superadmin') {
        const supers = await db.select({ id: schema.adminUsers.id })
          .from(schema.adminUsers)
          .where(and(eq(schema.adminUsers.role, 'superadmin'), eq(schema.adminUsers.status, 'active')))
          .all();
        if (supers.length <= 1) {
          return c.json({ success: false, error: 'Cannot demote the last active superadmin' }, 409);
        }
      }
    }

    await db.update(schema.adminUsers)
      .set({ role })
      .where(eq(schema.adminUsers.id, id));

    return c.json({ success: true, message: 'Admin user role updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

adminUsers.delete('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    
    // Prevent deleting oneself
    const currentUser = c.get('adminUser');
    if (currentUser.id === id) {
      return c.json({ success: false, error: 'Cannot delete yourself' }, 400);
    }

    await db.delete(schema.adminUsers)
      .where(eq(schema.adminUsers.id, id));
      
    return c.json({ success: true, message: 'Admin user deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default adminUsers;
