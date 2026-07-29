import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const landingPages = new Hono<{ Bindings: Bindings }>();

const landingPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  product_id: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  // Pixel IDs are interpolated into inline analytics <script> on the storefront.
  // Restrict to safe token characters so they cannot break out of the string
  // literal and inject script (XSS). Empty string allowed to clear the value.
  facebook_pixel_id: z.string().regex(/^[A-Za-z0-9._-]*$/, 'Invalid pixel id').max(64).optional(),
  tiktok_pixel_id: z.string().regex(/^[A-Za-z0-9._-]*$/, 'Invalid pixel id').max(64).optional(),
  urgency_end_time: z.string().optional(),
  urgency_fake_views: z.number().optional(),
  combo_rules_json: z.string().optional(),
  features_json: z.string().optional(),
  header_logo_url: z.string().optional(),
  header_cta_text: z.string().optional(),
  footer_content: z.string().optional(),
});

// GET: List Landing Pages
landingPages.get('/landing-pages', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
    const results = await db.select().from(schema.landingPages).orderBy(sql`${schema.landingPages.created_at} DESC`).limit(limit).offset(offset).all();
    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST: Create Landing Page
// urgency_end_time is an ISO string column. Writing an epoch number instead made
// the admin form parse it as milliseconds and display the wrong date.
const toIsoStringOrNull = (value?: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

landingPages.post('/landing-pages', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', landingPageSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = c.req.valid('json');
    const id = crypto.randomUUID();

    await db.insert(schema.landingPages).values({
      id,
      title: body.title,
      slug: body.slug,
      product_id: body.product_id || null,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      facebook_pixel_id: body.facebook_pixel_id,
      tiktok_pixel_id: body.tiktok_pixel_id,
      urgency_end_time: toIsoStringOrNull(body.urgency_end_time),
      urgency_fake_views: body.urgency_fake_views,
      combo_rules_json: body.combo_rules_json,
      features_json: body.features_json,
      header_logo_url: body.header_logo_url,
      header_cta_text: body.header_cta_text,
      footer_content: body.footer_content,
      status: 'published',
    });

    return c.json({ success: true, message: 'Landing page created', data: { id } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT: Update Landing Page
landingPages.put('/landing-pages/:id', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', landingPageSchema), async (c) => {
  const id = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    const body = c.req.valid('json');

    await db.update(schema.landingPages).set({
      title: body.title,
      slug: body.slug,
      product_id: body.product_id || null,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      facebook_pixel_id: body.facebook_pixel_id,
      tiktok_pixel_id: body.tiktok_pixel_id,
      urgency_end_time: toIsoStringOrNull(body.urgency_end_time),
      urgency_fake_views: body.urgency_fake_views,
      combo_rules_json: body.combo_rules_json,
      features_json: body.features_json,
      header_logo_url: body.header_logo_url,
      header_cta_text: body.header_cta_text,
      footer_content: body.footer_content,
    }).where(eq(schema.landingPages.id, id));

    return c.json({ success: true, message: 'Landing page updated' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE: Delete Landing Page
landingPages.delete('/landing-pages/:id', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  const id = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    await db.delete(schema.landingPages).where(eq(schema.landingPages.id, id));
    return c.json({ success: true, message: 'Landing page deleted' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default landingPages;
