import { Hono } from 'hono';
import { requireRole, Env } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { z } from 'zod';

const settingsRoutes = new Hono<Env>();

// GET /api/settings
settingsRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const data = await db.select().from(schema.settings);
  return c.json({ success: true, data });
});

// PUT /api/settings/batch
settingsRoutes.put('/batch', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  // eslint-disable-next-line no-restricted-syntax
  const body = await c.req.json();
  
  const payloadSchema = z.object({
    settings: z.array(z.object({
      key: z.string(),
      value: z.string()
    }))
  });

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid payload' }, 400);
  }

  const items = parsed.data.settings;
  if (items.length === 0) return c.json({ success: true });

  const queries = items.map(item => 
    db.update(schema.settings).set({ value: item.value, updated_at: new Date().toISOString() }).where(eq(schema.settings.key, item.key))
  );

  try {
    await db.batch(queries as any);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default settingsRoutes;
