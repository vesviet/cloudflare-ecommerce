import { Hono } from 'hono';
import { Bindings } from '../types';
import { drizzle } from 'drizzle-orm/d1';
import { cmsEntries } from '@ecommerce/database/src/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const app = new Hono<{ Bindings: Bindings }>();

const VALID_TYPES = ['post', 'article', 'event'] as const;

// GET all published CMS entries
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const type = c.req.query('type');
  
  if (type && !VALID_TYPES.includes(type as any)) {
    return c.json({ success: false, error: 'Invalid type' }, 400);
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('page_size') || '20', 10)));
  const offset = (page - 1) * pageSize;
  
  try {
    let condition = eq(cmsEntries.status, 'published');
    if (type) {
      condition = and(condition, eq(cmsEntries.type, type)) as any;
    }

    const [entries, countResult] = await Promise.all([
      db.select({
        slug: cmsEntries.slug,
        title: cmsEntries.title,
        excerpt: cmsEntries.excerpt,
        type: cmsEntries.type,
        featured_image_url: cmsEntries.featured_image_url,
        published_at: cmsEntries.published_at,
        metadata_json: cmsEntries.metadata_json,
        created_at: cmsEntries.created_at,
      })
      .from(cmsEntries)
      .where(condition)
      .orderBy(desc(cmsEntries.created_at))
      .limit(pageSize)
      .offset(offset)
      .all(),
      
      db.select({ count: sql<number>`count(*)` })
      .from(cmsEntries)
      .where(condition)
      .get()
    ]);

    const total = countResult?.count ?? 0;

    return c.json({
      success: true,
      data: entries,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize)
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET single published CMS entry by slug
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = drizzle(c.env.DB);
  
  try {
    const entry = await db.select()
      .from(cmsEntries)
      .where(and(eq(cmsEntries.slug, slug), eq(cmsEntries.status, 'published')))
      .get();
    
    if (!entry) {
      return c.json({ success: false, error: 'Entry not found' }, 404);
    }
    
    return c.json({ success: true, data: entry });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
