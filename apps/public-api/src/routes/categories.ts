import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { categories } from '@ecommerce/database/src/schema';

const app = new Hono<{ Bindings: { DB: D1Database, CACHE_KV: KVNamespace } }>();

// GET /api/categories - Returns category tree (KV cached)
app.get('/', async (c) => {
  const cacheKey = 'storefront:categories:tree';
  
  // 1. Check Cache
  const cachedTree = await c.env.CACHE_KV.get(cacheKey, 'json');
  if (cachedTree) {
    c.header('X-Cache', 'HIT');
    return c.json({ success: true, data: cachedTree });
  }

  // 2. Cache Miss - Query DB
  const db = drizzle(c.env.DB);
  const allCategories = await db.select().from(categories).all();
  
  // Build Tree
  const categoryMap = new Map();
  const tree: any[] = [];
  
  allCategories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });
  
  allCategories.forEach((cat) => {
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children.push(categoryMap.get(cat.id));
      } else {
        // Parent not found (orphaned), push to root
        tree.push(categoryMap.get(cat.id));
      }
    } else {
      tree.push(categoryMap.get(cat.id));
    }
  });

  // 3. Save to Cache (cache for a long time, invalidation happens on Admin update)
  await c.env.CACHE_KV.put(cacheKey, JSON.stringify(tree), { expirationTtl: 86400 * 7 }); // 7 days

  c.header('X-Cache', 'MISS');
  return c.json({ success: true, data: tree });
});

export default app;
