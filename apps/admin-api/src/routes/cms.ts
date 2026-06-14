import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb, schema } from '@ecommerce/database';
import { eq, sql, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { cmsSchema, updateCmsSchema } from '@ecommerce/contract';

const app = new Hono<{ Bindings: Bindings }>();

// Helper to invalidate cache (if needed)
const invalidateCache = async (env: Bindings) => {
  await env.CACHE_KV.delete('storefront:cms:entries');
};

// GET all CMS entries
app.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const type = c.req.query('type');
  
  let query = db.select().from(schema.cmsEntries).orderBy(desc(schema.cmsEntries.created_at)).limit(200);
  
  if (type) {
    // We can't easily chain .where() conditionally without building the query
    const results = await db.select().from(schema.cmsEntries).where(eq(schema.cmsEntries.type, type)).orderBy(desc(schema.cmsEntries.created_at)).limit(200).all();
    return c.json({ success: true, data: results });
  }

  const allEntries = await query.all();
  return c.json({ success: true, data: allEntries });
});

// GET single CMS entry
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const entry = await db.select().from(schema.cmsEntries).where(eq(schema.cmsEntries.id, id)).get();
  
  if (!entry) {
    return c.json({ success: false, error: 'Entry not found' }, 404);
  }
  
  return c.json({ success: true, data: entry });
});

// CREATE new CMS entry
app.post('/', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', cmsSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  
  const id = crypto.randomUUID();
  const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  
  try {
    await db.insert(schema.cmsEntries).values({
      id,
      title: body.title,
      slug,
      excerpt: body.excerpt || null,
      content: body.content || null,
      type: body.type || 'post',
      status: body.status || 'draft',
      featured_image_url: body.featured_image_url || null,
      published_at: body.published_at || null,
      metadata_json: body.metadata_json || '{}',
      placement: body.placement || null,
      expires_at: body.expires_at || null,
    });
    
    await invalidateCache(c.env);
    
    return c.json({ success: true, data: { id } }, 201);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'Slug must be unique' }, 400);
    }
    return c.json({ success: false, error: err.message }, 400);
  }
});

// UPDATE CMS entry
app.put('/:id', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', updateCmsSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  try {
    const updateData: any = {
      updated_at: sql`CURRENT_TIMESTAMP`
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url;
    if (body.published_at !== undefined) updateData.published_at = body.published_at;
    if (body.metadata_json !== undefined) updateData.metadata_json = body.metadata_json;
    if (body.placement !== undefined) updateData.placement = body.placement;
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at;

    await db.update(schema.cmsEntries)
      .set(updateData)
      .where(eq(schema.cmsEntries.id, id));
      
    await invalidateCache(c.env);
    
    return c.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'Slug must be unique' }, 400);
    }
    return c.json({ success: false, error: err.message }, 400);
  }
});

// DELETE CMS entry
app.delete('/:id', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  
  await db.delete(schema.cmsEntries).where(eq(schema.cmsEntries.id, id));
  await invalidateCache(c.env);
  
  return c.json({ success: true });
});

export default app;
