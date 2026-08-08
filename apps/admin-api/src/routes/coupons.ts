import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { eq, sql, desc, and } from 'drizzle-orm';
import { auditMiddleware } from '../middleware/audit';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { couponSchema, updateCouponSchema } from '@ecommerce/contract';

const router = new Hono<{ Bindings: Bindings, Variables: any }>();

router.use('*', auditMiddleware);

export interface CouponDTO {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount?: number | null;
  starts_at?: string | number | null;
  ends_at?: string | number | null;
  usage_limit?: number | null;
  times_used?: number | null;
  status: string;
  created_at?: string | number | null;
  updated_at?: string | number | null;
  [key: string]: any;
}

export function mapPromotionToCoupon(promo: any): CouponDTO {
  if (!promo) return promo;
  const { is_active, expires_at, max_uses, uses, ...rest } = promo;
  const status = promo.status || (is_active === 0 ? 'disabled' : 'active');
  const ends_at = promo.ends_at !== undefined ? promo.ends_at : (expires_at !== undefined ? expires_at : null);
  const usage_limit = promo.usage_limit !== undefined ? promo.usage_limit : (max_uses !== undefined ? max_uses : null);
  const times_used = promo.times_used !== undefined ? promo.times_used : (uses !== undefined ? uses : 0);
  const type = promo.type === 'percentage' ? 'percent' : (promo.type === 'free_shipping' ? 'freeship' : promo.type);

  return {
    ...rest,
    type,
    status,
    ends_at,
    usage_limit,
    times_used,
  };
}

router.post('/', requireRole(['superadmin', 'manager']), zValidator('json', couponSchema), async (c) => {
  const db = createDb(c.env.DB);
  const body = c.req.valid('json') as any;
  
  if (!body.code || body.code.length < 4 || !/^[A-Z0-9_-]+$/i.test(body.code)) {
    return c.json({ success: false, error: 'Invalid coupon code format' }, 400);
  }
  const code = body.code.toUpperCase();
  
  // Check duplicates
  const existing = await db.select().from(localSchema.promotions).where(eq(localSchema.promotions.code, code)).get();
  if (existing) {
    return c.json({ success: false, error: 'COUPON_CODE_EXISTS' }, 409);
  }

  const id = crypto.randomUUID();
  const typeMap: Record<string, string> = { percent: 'percent', fixed: 'fixed', freeship: 'freeship', percentage: 'percent', free_shipping: 'freeship' };
  const mappedType = typeMap[body.type] || body.type;
  
  const isActive = (body.is_active === 0 || body.status === 'disabled') ? 0 : 1;
  
  const newCoupon = {
    id,
    code,
    type: mappedType,
    value: body.value || 0,
    min_order_amount: body.min_order_amount || 0,
    starts_at: body.starts_at || null,
    ends_at: body.expires_at || body.ends_at || null,
    usage_limit: body.max_uses || body.usage_limit || null,
    times_used: body.uses || body.times_used || 0,
    status: isActive ? 'active' : 'disabled'
  };

  await db.insert(localSchema.promotions).values(newCoupon).execute();

  c.set('auditLogData', {
    coupon_id: id,
    action: 'created',
    diff_json: { after: newCoupon }
  });

  return c.json({ success: true, data: mapPromotionToCoupon(newCoupon) });
});

router.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const status = c.req.query('status'); // 'active', 'expired', 'disabled'
  const type = c.req.query('type');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  
  const conditions: any[] = [];
  if (type) {
    const typeMap: Record<string, string> = { percent: 'percent', fixed: 'fixed', freeship: 'freeship', percentage: 'percent', free_shipping: 'freeship' };
    conditions.push(eq(localSchema.promotions.type, typeMap[type] || type));
  }
  
  const nowUnix = Math.floor(Date.now() / 1000);
  
  if (status === 'disabled') {
    conditions.push(eq(localSchema.promotions.status, 'disabled'));
  } else if (status === 'active') {
    conditions.push(eq(localSchema.promotions.status, 'active'));
    conditions.push(sql`(${localSchema.promotions.ends_at} IS NULL OR ${localSchema.promotions.ends_at} > ${nowUnix})`);
  } else if (status === 'expired') {
    conditions.push(eq(localSchema.promotions.status, 'active'));
    conditions.push(sql`${localSchema.promotions.ends_at} <= ${nowUnix}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(localSchema.promotions).where(whereClause);
  
  const data = await db.select()
    .from(localSchema.promotions)
    .where(whereClause)
    .orderBy(desc(localSchema.promotions.created_at))
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();

  return c.json({ success: true, data: data.map(mapPromotionToCoupon), page, limit, total: count });
});

router.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const coupon = await db.select().from(localSchema.promotions).where(eq(localSchema.promotions.id, id)).get();
  if (!coupon) return c.json({ success: false, error: 'Not found' }, 404);
  
  const count = coupon.times_used || 0;
    
  return c.json({ success: true, data: { ...mapPromotionToCoupon(coupon), applied_orders_count: count } });
});

router.put('/:id', requireRole(['superadmin', 'manager']), zValidator('json', updateCouponSchema), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = c.req.valid('json') as any;
  
  const existing = await db.select().from(localSchema.promotions).where(eq(localSchema.promotions.id, id)).get();
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404);

  const updates: any = {};
  if (body.max_uses !== undefined) updates.usage_limit = body.max_uses;
  if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit;
  if (body.expires_at !== undefined) updates.ends_at = body.expires_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.is_active !== undefined) updates.status = body.is_active ? 'active' : 'disabled';
  if (body.status !== undefined) updates.status = body.status === 'active' ? 'active' : 'disabled';
  if (body.type !== undefined) {
    const typeMap: Record<string, string> = { percent: 'percent', fixed: 'fixed', freeship: 'freeship', percentage: 'percent', free_shipping: 'freeship' };
    updates.type = typeMap[body.type] || body.type;
  }
  if (body.value !== undefined) updates.value = body.value;

  if (Object.keys(updates).length > 0) {
    await db.update(localSchema.promotions).set(updates).where(eq(localSchema.promotions.id, id)).execute();
    
    c.set('auditLogData', {
      coupon_id: id,
      action: 'updated',
      diff_json: { before: existing, after: { ...existing, ...updates } }
    });
  }

  const merged = { ...existing, ...updates };
  return c.json({ success: true, data: mapPromotionToCoupon(merged) });
});

router.patch('/:id/toggle', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  
  const existing = await db.select().from(localSchema.promotions).where(eq(localSchema.promotions.id, id)).get();
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404);

  const newStatus = existing.status === 'active' ? 'disabled' : 'active';
  await db.update(localSchema.promotions).set({ status: newStatus }).where(eq(localSchema.promotions.id, id)).execute();
  
  c.set('auditLogData', {
    coupon_id: id,
    action: newStatus === 'active' ? 'enabled' : 'disabled',
  });

  return c.json({ success: true, data: mapPromotionToCoupon({ ...existing, status: newStatus }) });
});

router.delete('/:id', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  
  const existing = await db.select().from(localSchema.promotions).where(eq(localSchema.promotions.id, id)).get();
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404);

  if ((existing.times_used || 0) > 0) {
    // Soft delete
    await db.update(localSchema.promotions).set({ status: 'disabled' }).where(eq(localSchema.promotions.id, id)).execute();
    c.set('auditLogData', { coupon_id: id, action: 'disabled' });
    return c.json({ success: true, softDeleted: true });
  } else {
    // Hard delete
    await db.delete(localSchema.promotions).where(eq(localSchema.promotions.id, id)).execute();
    c.set('auditLogData', { coupon_id: id, action: 'deleted' });
    return c.json({ success: true, deleted: true });
  }
});

export default router;
