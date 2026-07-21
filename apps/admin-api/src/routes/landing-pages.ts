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
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  facebook_pixel_id: z.string().optional(),
  tiktok_pixel_id: z.string().optional(),
  urgency_end_time: z.string().optional(),
  urgency_fake_views: z.number().optional(),
  combo_rules_json: z.string().optional(),
});

// GET: List Landing Pages
landingPages.get('/landing-pages', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const results = await db.select().from(schema.landingPages).orderBy(sql`${schema.landingPages.created_at} DESC`).all();
    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST: Create Landing Page
landingPages.post('/landing-pages', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', landingPageSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = c.req.valid('json');
    const id = crypto.randomUUID();

    // Generate a valid epoch timestamp if urgency_end_time is provided
    let urgencyEpoch: number | null = null;
    if (body.urgency_end_time) {
      const parsed = new Date(body.urgency_end_time).getTime();
      if (!isNaN(parsed)) urgencyEpoch = Math.floor(parsed / 1000);
    }

    await db.insert(schema.landingPages).values({
      id,
      title: body.title,
      slug: body.slug,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      facebook_pixel_id: body.facebook_pixel_id,
      tiktok_pixel_id: body.tiktok_pixel_id,
      urgency_end_time: urgencyEpoch,
      urgency_fake_views: body.urgency_fake_views,
      combo_rules_json: body.combo_rules_json,
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

    let urgencyEpoch: number | null = null;
    if (body.urgency_end_time) {
      const parsed = new Date(body.urgency_end_time).getTime();
      if (!isNaN(parsed)) urgencyEpoch = Math.floor(parsed / 1000);
    }

    await db.update(schema.landingPages).set({
      title: body.title,
      slug: body.slug,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      facebook_pixel_id: body.facebook_pixel_id,
      tiktok_pixel_id: body.tiktok_pixel_id,
      urgency_end_time: urgencyEpoch,
      urgency_fake_views: body.urgency_fake_views,
      combo_rules_json: body.combo_rules_json,
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
