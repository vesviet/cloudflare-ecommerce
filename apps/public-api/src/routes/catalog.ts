import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { CatalogService, CacheService } from '@ecommerce/core-services';

const catalog = new Hono<{ Bindings: { DB: D1Database; CACHE_KV: KVNamespace } }>();

catalog.get('/', async (c) => {
  try {
    const categorySlug = c.req.query('category') || '';
    const ua = c.req.header('user-agent') || '';
    console.log(`[Catalog GET] Request User-Agent: "${ua}"`);
    // 1. Get current cache generation
    const generation = await CacheService.getGeneration(c.env);
    const queryParams = { category: categorySlug };

    // 2. Try Cache
    const cached = await CacheService.getCachedList(c.env, generation, queryParams);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json({ success: true, data: cached });
    }

    // 3. Cache Miss - Fetch from D1
    const db = createDb(c.env.DB);
    const data = await CatalogService.getCatalogList(db, categorySlug);

    // 4. Update Cache Async
    c.executionCtx.waitUntil(
      CacheService.setCachedList(c.env, generation, queryParams, data)
    );

    c.header('X-Cache', 'MISS');
    return c.json({ success: true, data });
  } catch (err: any) {
    console.error('Catalog get list error:', err);
    return c.json({ success: false, error: err.message, stack: err.stack }, 500);
  }
});

catalog.get('/search', async (c) => {
  try {
    const q = c.req.query('q');
    if (!q) return c.json({ success: false, error: 'Missing query param' }, 400);

    const generation = await CacheService.getGeneration(c.env);
    const queryParams = { q };

    const cached = await CacheService.getCachedList(c.env, generation, queryParams);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json({ success: true, data: cached });
    }

    const db = createDb(c.env.DB);
    const data = await CatalogService.searchCatalog(db, q);

    c.executionCtx.waitUntil(
      CacheService.setCachedList(c.env, generation, queryParams, data)
    );

    c.header('X-Cache', 'MISS');
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

catalog.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    
    // 1. Try Cache (Item caches don't use generation tag)
    const cached = await CacheService.getCachedItem(c.env, slug);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json({ success: true, data: cached });
    }

    // 2. Cache Miss - Fetch from D1
    const db = createDb(c.env.DB);
    const data = await CatalogService.getCatalogItem(db, slug);

    if (!data) return c.json({ success: false, error: 'Not found' }, 404);

    // 3. Update Cache Async
    c.executionCtx.waitUntil(
      CacheService.setCachedItem(c.env, slug, data)
    );

    c.header('X-Cache', 'MISS');
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default catalog;
