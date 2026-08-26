import { Hono } from 'hono';
import { requireRole, Env } from '../middleware/auth';
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

  // C12 fix: upsert semantics — update existing keys, insert missing ones so
  // the admin can introduce new settings (e.g. customer_2fa_enabled).
  const queries = items.map(item =>
    db.insert(schema.settings).values({ key: item.key, value: item.value }).onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: item.value, updated_at: new Date().toISOString() },
    })
  );

  try {
    await db.batch(queries as any);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default settingsRoutes;
