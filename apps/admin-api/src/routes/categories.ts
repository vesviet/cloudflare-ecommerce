import { Hono } from 'hono';
import { Bindings } from '../types';
import { drizzle } from 'drizzle-orm/d1';
import { categories, products } from '@ecommerce/database/src/schema';
import { eq, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { categorySchema, updateCategorySchema } from '@ecommerce/contract';

const app = new Hono<{ Bindings: Bindings }>();

// Helper to invalidate cache
const invalidateCache = async (env: Bindings) => {
  await env.CACHE_KV.delete('storefront:categories:tree');
};

// Lấy danh sách tất cả danh mục (phẳng, quản trị viên tự dựng cây trên UI nếu cần)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allCategories = await db.select().from(categories).all();
  return c.json({ success: true, data: allCategories });
});

// Lấy 1 danh mục
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  const cat = await db.select().from(categories).where(eq(categories.id, id)).get();
  
  if (!cat) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }
  
  return c.json({ success: true, data: cat });
});

// Tạo mới
app.post('/', zValidator('json', categorySchema), async (c) => {
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const id = crypto.randomUUID();
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-');
  
  try {
    await db.insert(categories).values({
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

// Cập nhật
app.put('/:id', zValidator('json', updateCategorySchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Kiểm tra cycle prevention nếu có parent_id
  if (body.parent_id) {
    if (body.parent_id === id) {
      return c.json({ success: false, error: 'A category cannot be its own parent' }, 400);
    }
    
    // Kiểm tra parent_id có phải là một trong các con cháu của danh mục này không
    // Sử dụng raw query với CTE đệ quy
    const query = sql`
      WITH RECURSIVE category_tree AS (
        SELECT id FROM categories WHERE parent_id = ${id}
        UNION ALL
        SELECT c.id FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id FROM category_tree WHERE id = ${body.parent_id};
    `;
    
    const cycleCheck = await db.run(query);
    if (cycleCheck.results && cycleCheck.results.length > 0) {
      return c.json({ success: false, error: 'Cycle detected: parent_id cannot be a descendant of this category' }, 400);
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

    await db.update(categories)
      .set(updateData)
      .where(eq(categories.id, id));
      
    await invalidateCache(c.env);
    
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Xóa
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  // Safe category deletion: set subcategories' parent_id to null
  await db.update(categories)
    .set({ parent_id: null })
    .where(eq(categories.parent_id, id));
    
  // Also wait, should we set products.primary_category_id to null? 
  // It has ON DELETE SET NULL constraint in schema, but for SQLite, D1 foreign keys aren't fully supported unless PRAGMA foreign_keys = ON.
  // Better to manually update to be safe.
  await db.update(products)
    .set({ primary_category_id: null })
    .where(eq(products.primary_category_id, id));

  await db.delete(categories).where(eq(categories.id, id));
  
  await invalidateCache(c.env);
  
  return c.json({ success: true });
});

export default app;
