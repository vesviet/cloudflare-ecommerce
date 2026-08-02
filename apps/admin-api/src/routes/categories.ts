import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb, schema } from '@ecommerce/database';
import { eq, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { categorySchema, updateCategorySchema } from '@ecommerce/contract';
import { CategoryService } from '@ecommerce/core-services';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings }>();

const invalidateCache = async (env: Bindings) => {
  await env.CACHE_KV.delete('storefront:categories:tree');
};

app.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const allCategories = await db.select().from(schema.categories).all();
  return c.json({ success: true, data: allCategories });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const cat = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
  
  if (!cat) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }
  
  return c.json({ success: true, data: cat });
});

app.post('/', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', categorySchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  
  const id = crypto.randomUUID();
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-');

  if (body.parent_id) {
    const parent = await db.select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.id, body.parent_id))
      .get();
    if (!parent) {
      return c.json({ success: false, error: 'Parent category does not exist' }, 400);
    }
  }

  try {
    await db.insert(schema.categories).values({
      id,
      name: body.name,
      slug,
      description: body.description || null,
      parent_id: body.parent_id || null,
      image_url: body.image_url || null,
    });
    
    await invalidateCache(c.env);
    
    return c.json({ success: true, data: { id } }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

app.put('/:id', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', updateCategorySchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  
  if (body.parent_id) {
    if (body.parent_id === id) {
      return c.json({ success: false, error: 'A category cannot be its own parent' }, 400);
    }
    if (await CategoryService.hasCycle(db, id, body.parent_id)) {
      return c.json({ success: false, error: 'Cycle detected: parent_id cannot be a descendant of this category or itself' }, 400);
    }
  }

  try {
    const updateData: any = {
      updated_at: sql`CURRENT_TIMESTAMP`
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;

    await db.update(schema.categories)
      .set(updateData)
      .where(eq(schema.categories.id, id));
      
    await invalidateCache(c.env);
    
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

app.delete('/:id', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  
  const batchQueries = CategoryService.getSafeDeletionQueries(db, id);
  await db.batch(batchQueries as any);
  
  await invalidateCache(c.env);
  
  return c.json({ success: true });
});

export default app;
