import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { eq, desc, sql } from 'drizzle-orm';
import { auditMiddleware } from '../middleware/audit';
import { requireRole } from '../middleware/auth';

// Phase 5 (REV-06): review moderation over the dedicated product_reviews table.

const router = new Hono<{ Bindings: Bindings, Variables: any }>();
router.use('*', auditMiddleware);

router.get('/', requireRole(['superadmin', 'manager', 'support']), async (c) => {
  const db = createDb(c.env.DB);
  const status = c.req.query('status') || 'pending';
  const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));

  const rows = await db.select({
    id: localSchema.productReviews.id,
    product_id: localSchema.productReviews.product_id,
    customer_id: localSchema.productReviews.customer_id,
    rating: localSchema.productReviews.rating,
    comment: localSchema.productReviews.comment,
    status: localSchema.productReviews.status,
    verified_purchase: localSchema.productReviews.verified_purchase,
    created_at: localSchema.productReviews.created_at,
    product_title: localSchema.products.title,
    reviewer_email: localSchema.customers.email,
  })
    .from(localSchema.productReviews)
    .leftJoin(localSchema.products, eq(localSchema.productReviews.product_id, localSchema.products.id))
    .leftJoin(localSchema.customers, eq(localSchema.productReviews.customer_id, localSchema.customers.id))
    .where(status === 'all' ? sql`1=1` : eq(localSchema.productReviews.status, status))
    .orderBy(desc(localSchema.productReviews.created_at))
    .limit(limit)
    .all();

  return c.json({ success: true, data: rows });
});

router.put('/:id/approve', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const adminUser = c.get('adminUser');
  const result = await db.update(localSchema.productReviews)
    .set({ status: 'approved', moderated_by: adminUser?.email ?? null, moderated_at: Math.floor(Date.now() / 1000) })
    .where(eq(localSchema.productReviews.id, c.req.param('id')))
    .run();
  const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
  if (changes === 0) return c.json({ success: false, error: 'Review not found' }, 404);
  return c.json({ success: true });
});

router.put('/:id/reject', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const adminUser = c.get('adminUser');
  const result = await db.update(localSchema.productReviews)
    .set({ status: 'rejected', moderated_by: adminUser?.email ?? null, moderated_at: Math.floor(Date.now() / 1000) })
    .where(eq(localSchema.productReviews.id, c.req.param('id')))
    .run();
  const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
  if (changes === 0) return c.json({ success: false, error: 'Review not found' }, 404);
  return c.json({ success: true });
});

router.delete('/:id', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  await db.delete(localSchema.productReviews).where(eq(localSchema.productReviews.id, c.req.param('id')));
  return c.json({ success: true });
});

export default router;
