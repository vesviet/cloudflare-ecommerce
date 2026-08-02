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
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '200', 10) || 200, 1), 200);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

  if (type) {
    const results = await db.select().from(schema.cmsEntries).where(eq(schema.cmsEntries.type, type))
      .orderBy(desc(schema.cmsEntries.created_at)).limit(limit).offset(offset).all();
    const countRow = await db.select({ total: sql<number>`COUNT(*)` }).from(schema.cmsEntries)
      .where(eq(schema.cmsEntries.type, type)).get();
    return c.json({ success: true, data: results, pagination: { total: countRow?.total ?? 0, limit, offset } });
  }

  const allEntries = await db.select().from(schema.cmsEntries)
    .orderBy(desc(schema.cmsEntries.created_at)).limit(limit).offset(offset).all();
  const countRow = await db.select({ total: sql<number>`COUNT(*)` }).from(schema.cmsEntries).get();
  return c.json({ success: true, data: allEntries, pagination: { total: countRow?.total ?? 0, limit, offset } });
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
      content: body.content_json || null,
      type: body.type || 'post',
      status: body.status || 'draft',
      featured_image_url: body.featured_image || null,
      published_at: null,
      metadata_json: JSON.stringify({ meta_title: (body as any).meta_title, meta_description: (body as any).meta_description }),
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
    if (body.content_json !== undefined) updateData.content = body.content_json;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.featured_image !== undefined) updateData.featured_image_url = body.featured_image;
    if ((body as any).meta_title !== undefined || (body as any).meta_description !== undefined) {
      updateData.metadata_json = JSON.stringify({ meta_title: (body as any).meta_title, meta_description: (body as any).meta_description });
    }
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
