import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { desc, eq, and, like } from 'drizzle-orm';
import { requireRole } from '../middleware/auth';

// Phase 5 (ADM-20): audit log viewer with entity-type filtering.

const router = new Hono<{ Bindings: Bindings }>();

router.get('/', requireRole(['superadmin']), async (c) => {
  const db = createDb(c.env.DB);
  const entityType = c.req.query('entity_type');
  const action = c.req.query('action');
  const limit = Math.min(500, parseInt(c.req.query('limit') || '100', 10));

  const conditions = [];
  if (entityType) conditions.push(eq((localSchema.auditLogs as any).entity_type, entityType));
  if (action) conditions.push(like((localSchema.auditLogs as any).action, `%${action}%`));

  const rows = await db.select()
    .from(localSchema.auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc((localSchema.auditLogs as any).created_at))
    .limit(limit)
    .all();

  return c.json({ success: true, data: rows });
});

export default router;
