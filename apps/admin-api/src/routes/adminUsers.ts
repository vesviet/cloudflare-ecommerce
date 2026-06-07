import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { requireRole, type Env } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
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
