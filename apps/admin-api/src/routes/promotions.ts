import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { eq, asc, desc } from 'drizzle-orm';
import { auditMiddleware } from '../middleware/audit';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Phase 2B: admin CRUD for the promotion rules engine (T2.6) and flash sales
// (T2.5). Manager+ only; every mutation flows through the audit middleware.

const router = new Hono<{ Bindings: Bindings, Variables: any }>();

router.use('*', auditMiddleware);

// ---------- Promotion Rules (Laravel-shape engine) ----------

const ruleConditionsSchema = z.object({
  min_order_amount: z.number().int().min(0).optional(),
  target_product_ids: z.array(z.string()).optional(),
  tiered_steps: z.array(z.object({ min_qty: z.number().int().min(1), percent: z.number().min(0).max(100) })).optional(),
  bxgy_config: z.object({
    buy_product_id: z.string().optional(),
    buy_qty: z.number().int().min(1),
    get_product_id: z.string().optional(),
    get_qty: z.number().int().min(1),
    max_rewards: z.number().int().min(1).optional(),
  }).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  rule_type: z.enum(['cart_rule', 'catalog_rule']).default('cart_rule'),
  action_type: z.enum(['percentage_with_max_cap', 'fixed_amount', 'free_shipping', 'tiered_quantity', 'buy_x_get_y']),
  action_value: z.number().min(0).default(0),
  max_discount_amount: z.number().int().min(0).nullable().optional(),
  conditions: ruleConditionsSchema.optional(),
  target_customer_tier: z.enum(['all', 'guest', 'first_time', 'bronze', 'silver', 'gold', 'platinum']).default('all'),
  usage_limit: z.number().int().min(0).nullable().optional(),
  usage_limit_per_user: z.number().int().min(0).default(1),
  priority: z.number().int().default(0),
  stop_further_rules: z.boolean().default(false),
  starts_at: z.number().int().nullable().optional(),
  ends_at: z.number().int().nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateRuleSchema = createRuleSchema.partial();

router.get('/rules', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const rules = await db.select().from(localSchema.promotionRules)
    .orderBy(asc(localSchema.promotionRules.priority), desc(localSchema.promotionRules.created_at))
    .all();
  return c.json({ success: true, data: rules });
});

router.post('/rules', requireRole(['superadmin', 'manager']), zValidator('json', createRuleSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  const id = crypto.randomUUID();
  await db.insert(localSchema.promotionRules).values({
    id,
    name: body.name,
    rule_type: body.rule_type,
    action_type: body.action_type,
    action_value: body.action_value,
    max_discount_amount: body.max_discount_amount ?? null,
    conditions_json: JSON.stringify(body.conditions || {}),
    target_customer_tier: body.target_customer_tier,
    usage_limit: body.usage_limit ?? null,
    usage_limit_per_user: body.usage_limit_per_user,
    priority: body.priority,
    stop_further_rules: body.stop_further_rules ? 1 : 0,
    starts_at: body.starts_at ?? null,
    ends_at: body.ends_at ?? null,
    status: body.status,
  });

  return c.json({ success: true, data: { id } }, 201);
});

router.put('/rules/:id', requireRole(['superadmin', 'manager']), zValidator('json', updateRuleSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.rule_type !== undefined) updates.rule_type = body.rule_type;
  if (body.action_type !== undefined) updates.action_type = body.action_type;
  if (body.action_value !== undefined) updates.action_value = body.action_value;
  if (body.max_discount_amount !== undefined) updates.max_discount_amount = body.max_discount_amount;
  if (body.conditions !== undefined) updates.conditions_json = JSON.stringify(body.conditions);
  if (body.target_customer_tier !== undefined) updates.target_customer_tier = body.target_customer_tier;
  if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit;
  if (body.usage_limit_per_user !== undefined) updates.usage_limit_per_user = body.usage_limit_per_user;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.stop_further_rules !== undefined) updates.stop_further_rules = body.stop_further_rules ? 1 : 0;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.status !== undefined) updates.status = body.status;

  const result = await db.update(localSchema.promotionRules)
    .set({ ...updates, updated_at: new Date().toISOString() })
    .where(eq(localSchema.promotionRules.id, id))
    .run();

  const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
  if (changes === 0) {
    return c.json({ success: false, error: 'Rule not found' }, 404);
  }
  return c.json({ success: true });
});

// Soft-disable (keeps historical usages intact — same policy as coupons).
router.delete('/rules/:id', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const result = await db.update(localSchema.promotionRules)
    .set({ status: 'inactive', updated_at: new Date().toISOString() })
    .where(eq(localSchema.promotionRules.id, id))
    .run();
  const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
  if (changes === 0) {
    return c.json({ success: false, error: 'Rule not found' }, 404);
  }
  return c.json({ success: true, message: 'Rule disabled' });
});

// ---------- Flash Sales ----------

const flashItemSchema = z.object({
  product_id: z.string().min(1),
  price: z.number().int().min(0),
  quota: z.number().int().min(0).default(0), // 0 = unlimited
});

const createFlashSaleSchema = z.object({
  name: z.string().min(1).max(255),
  starts_at: z.number().int().nullable().optional(),
  ends_at: z.number().int().nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  items: z.array(flashItemSchema).default([]),
});

const updateFlashSaleSchema = createFlashSaleSchema.partial();

router.get('/flash-sales', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const sales = await db.select().from(localSchema.flashSales)
    .orderBy(desc(localSchema.flashSales.created_at))
    .all();

  const items = sales.length > 0
    ? await db.select().from(localSchema.flashSaleItems).all()
    : [];

  const itemsBySale = new Map<string, any[]>();
  for (const item of items) {
    const list = itemsBySale.get(item.flash_sale_id) || [];
    list.push(item);
    itemsBySale.set(item.flash_sale_id, list);
  }

  return c.json({
    success: true,
    data: sales.map((sale: any) => ({ ...sale, items: itemsBySale.get(sale.id) || [] })),
  });
});

router.post('/flash-sales', requireRole(['superadmin', 'manager']), zValidator('json', createFlashSaleSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  // Overlapping active sales on the same product make pricing ambiguous.
  if (body.status === 'active') {
    const existingActive = await db.select()
      .from(localSchema.flashSales)
      .where(eq(localSchema.flashSales.status, 'active'))
      .all();
    const liveOverlap = existingActive.some((s: any) => s.id && s.name !== body.name &&
      (!body.ends_at || !s.starts_at || s.starts_at <= body.ends_at) &&
      (!body.starts_at || !s.ends_at || body.starts_at <= s.ends_at));
    if (liveOverlap) {
      return c.json({ success: false, error: 'Another active flash sale overlaps this window' }, 409);
    }
  }

  const id = crypto.randomUUID();
  const queries: any[] = [
    db.insert(localSchema.flashSales).values({
      id,
      name: body.name,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      status: body.status,
    }),
  ];
  for (const item of body.items) {
    queries.push(db.insert(localSchema.flashSaleItems).values({
      id: crypto.randomUUID(),
      flash_sale_id: id,
      product_id: item.product_id,
      price: item.price,
      quota: item.quota,
    }));
  }
  await db.batch(queries);

  return c.json({ success: true, data: { id } }, 201);
});

// Replace-all semantics for items keeps quota/sold state simple: existing rows
// are deleted and recreated with sold_quantity reset only when the product is
// NOT already present in the new payload.
router.put('/flash-sales/:id', requireRole(['superadmin', 'manager']), zValidator('json', updateFlashSaleSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const sale = await db.select().from(localSchema.flashSales).where(eq(localSchema.flashSales.id, id)).get();
  if (!sale) return c.json({ success: false, error: 'Flash sale not found' }, 404);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.status !== undefined) updates.status = body.status;
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    await db.update(localSchema.flashSales).set(updates).where(eq(localSchema.flashSales.id, id)).run();
  }

  if (body.items) {
    const existingItems = await db.select().from(localSchema.flashSaleItems)
      .where(eq(localSchema.flashSaleItems.flash_sale_id, id))
      .all();
    const existingByProduct = new Map(existingItems.map((i: any) => [i.product_id, i]));

    const queries: any[] = [
      db.delete(localSchema.flashSaleItems).where(eq(localSchema.flashSaleItems.flash_sale_id, id)),
    ];
    for (const item of body.items) {
      const prior = existingByProduct.get(item.product_id);
      queries.push(db.insert(localSchema.flashSaleItems).values({
        id: crypto.randomUUID(),
        flash_sale_id: id,
        product_id: item.product_id,
        price: item.price,
        quota: item.quota,
        // preserve sold counters for products that stay in the sale
        sold_quantity: prior?.sold_quantity ?? 0,
      }));
    }
    await db.batch(queries);
  }

  return c.json({ success: true });
});

router.delete('/flash-sales/:id', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const result = await db.update(localSchema.flashSales)
    .set({ status: 'inactive', updated_at: new Date().toISOString() })
    .where(eq(localSchema.flashSales.id, id))
    .run();
  const changes = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
  if (changes === 0) {
    return c.json({ success: false, error: 'Flash sale not found' }, 404);
  }
  return c.json({ success: true, message: 'Flash sale disabled' });
});

export default router;
