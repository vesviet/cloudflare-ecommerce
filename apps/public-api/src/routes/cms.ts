import { Hono } from 'hono';
type Bindings = {
  DB: D1Database;
};
import { createDb, schema } from '@ecommerce/database';
import { eq, and, desc, sql } from 'drizzle-orm';

const app = new Hono<{ Bindings: Bindings }>();

const VALID_TYPES = ['post', 'article', 'event'] as const;

// GET all published CMS entries
app.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const type = c.req.query('type');
  
  if (type && !VALID_TYPES.includes(type as any)) {
    return c.json({ success: false, error: 'Invalid type' }, 400);
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('page_size') || '20', 10)));
  const offset = (page - 1) * pageSize;
  
  try {
    let condition = eq(schema.cmsEntries.status, 'published');
    if (type) {
      condition = and(condition, eq(schema.cmsEntries.type, type)) as any;
    }

    const [entries, countResult] = await Promise.all([
      db.select({
        slug: schema.cmsEntries.slug,
        title: schema.cmsEntries.title,
        excerpt: schema.cmsEntries.excerpt,
        type: schema.cmsEntries.type,
        featured_image_url: schema.cmsEntries.featured_image_url,
        published_at: schema.cmsEntries.published_at,
        metadata_json: schema.cmsEntries.metadata_json,
        created_at: schema.cmsEntries.created_at,
      })
      .from(schema.cmsEntries)
      .where(condition)
      .orderBy(desc(schema.cmsEntries.created_at))
      .limit(pageSize)
      .offset(offset)
      .all(),
      
      db.select({ count: sql<number>`count(*)` })
      .from(schema.cmsEntries)
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
  const db = createDb(c.env.DB);
  
  try {
    const entry = await db.select()
      .from(schema.cmsEntries)
      .where(and(eq(schema.cmsEntries.slug, slug), eq(schema.cmsEntries.status, 'published')))
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
