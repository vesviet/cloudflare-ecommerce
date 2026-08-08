import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';

const landingLeads = new Hono<{ Bindings: Bindings }>();

// GET: /api/landing-leads
landingLeads.get('/landing-leads', requireRole(['superadmin', 'manager', 'support', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
    const [results, countRow] = await Promise.all([
      db.select({
        id: localSchema.landingPageLeads.id,
        landing_page_id: localSchema.landingPageLeads.landing_page_id,
        order_id: localSchema.landingPageLeads.order_id,
        customer_name: localSchema.landingPageLeads.customer_name,
        customer_phone: localSchema.landingPageLeads.customer_phone,
        customer_address: localSchema.landingPageLeads.customer_address,
        customer_note: localSchema.landingPageLeads.customer_note,
        selected_combo_id: localSchema.landingPageLeads.selected_combo_id,
        selected_variants_json: localSchema.landingPageLeads.selected_variants_json,
        total_amount: localSchema.landingPageLeads.total_amount,
        utm_source: localSchema.landingPageLeads.utm_source,
        utm_campaign: localSchema.landingPageLeads.utm_campaign,
        utm_content: localSchema.landingPageLeads.utm_content,
        sync_status: localSchema.landingPageLeads.sync_status,
        created_at: localSchema.landingPageLeads.created_at,
        landing_page_title: localSchema.landingPages.title,
        order_status: localSchema.orders.status,
      })
        .from(localSchema.landingPageLeads)
        .leftJoin(localSchema.landingPages, eq(localSchema.landingPageLeads.landing_page_id, localSchema.landingPages.id))
        .leftJoin(localSchema.orders, eq(localSchema.landingPageLeads.order_id, localSchema.orders.id))
        .orderBy(sql`${localSchema.landingPageLeads.created_at} DESC`)
        .limit(limit)
        .offset(offset)
        .all(),
      db.get<{ total: number }>(sql`SELECT COUNT(*) as total FROM landing_page_leads`),
    ]);

    return c.json({ success: true, data: results, pagination: { total: countRow?.total ?? 0, limit, offset } });
  } catch (err: any) {
    console.error('Admin list landing-leads error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default landingLeads;
