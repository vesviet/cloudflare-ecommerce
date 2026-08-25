import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { zValidator } from '@hono/zod-validator';
import { productFormSchema, DEFAULT_LOCATION_ID } from '@ecommerce/contract';
import { ProductService, CacheService, InventoryRepository } from '@ecommerce/core-services';
import { requireRole } from '../middleware/auth';
import { buildUploadKey } from './uploadKey';

const products = new Hono<{ Bindings: Bindings }>();

// Form-encoded decimals: cents must be a finite non-negative integer.
const parseMoneyCents = (raw: unknown, fallback = 0): number | null => {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

// GET: Product List (Admin)
products.get('/products', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
    // Rewritten query to fetch data from the new relational schema
    // Note: SQLite JSON functions are used to aggregate the related items
    const results = await db.all<any>(sql`
      SELECT 
        p.id, p.slug, p.sku, p.title, p.description, p.type, p.status, p.is_purchasable, p.attributes_json,
        p.weight, p.length, p.width, p.height, p.primary_category_id,
        (
          SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
          FROM product_assets pa
          JOIN assets a ON pa.asset_id = a.id
          WHERE pa.product_id = p.id
          ORDER BY pa.position ASC
        ) as images_json,
        (
          SELECT json_group_array(cp.collection_id) 
          FROM collection_products cp 
          WHERE cp.product_id = p.id
        ) as secondary_categories,
        (
          SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1
        ) as regular_price,
        (
          SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1
        ) as stock_quantity,
        (
          SELECT CASE WHEN COUNT(v.id) > 0 THEN json_group_array(json_object(
            'id', v.id, 'sku', v.sku, 
            'regular_price', (SELECT price FROM price_list_items vpli WHERE vpli.product_id = v.id AND vpli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1),
            'stock', (SELECT stock_quantity FROM inventory_levels vil WHERE vil.product_id = v.id LIMIT 1),
            'is_purchasable', v.is_purchasable,
            'attributes', v.attributes_json
          )) ELSE '[]' END 
          FROM products v 
          WHERE v.parent_id = p.id AND v.deleted_at IS NULL AND v.is_purchasable = 1
        ) as variations
      FROM products p
      WHERE p.parent_id IS NULL AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countRow = await db.get<{ total: number }>(sql`
      SELECT COUNT(*) as total FROM products WHERE parent_id IS NULL AND deleted_at IS NULL
    `);
    
    const formattedData = results.map((row: any) => {
      // images_json now contains actual asset objects { url, alt_text }
      let images = [];
      try { images = JSON.parse(row.images_json || '[]').filter((img: any) => img.url); } catch { /* ignore */ }
      
      let variations = [];
      try { variations = JSON.parse(row.variations || '[]').filter((v: any) => v.id); } catch { /* ignore */ }

      let secondaryCategories = [];
      try { secondaryCategories = JSON.parse(row.secondary_categories || '[]').filter(Boolean); } catch { /* ignore */ }

      return {
        ...row,
        images,
        secondary_categories: secondaryCategories,
        variations,
      };
    });
    
    return c.json({ success: true, data: formattedData, pagination: { total: countRow?.total ?? 0, limit, offset } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Autocomplete SKU Search
products.get('/products/search-sku', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const q = c.req.query('q') || '';
    if (!q || q.length < 2) {
      return c.json({ success: true, data: [] });
    }

    const results = await db.all<any>(sql`
      SELECT 
        p.id, p.sku, p.title,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1) as stock
      FROM products p
      WHERE p.type = 'simple' 
        AND p.parent_id IS NULL 
        AND p.deleted_at IS NULL 
        AND p.sku LIKE ${'%' + q + '%'}
      LIMIT 10
    `);

    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Autocomplete Product Search (For Combobox)
products.get('/products/search', requireRole(['superadmin', 'manager', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const q = c.req.query('q') || '';
    if (!q || q.length < 2) {
      return c.json({ success: true, data: [] });
    }

    const results = await db.all<any>(sql`
      SELECT 
        p.id, p.sku, p.title,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (
          SELECT a.url 
          FROM product_assets pa 
          JOIN assets a ON pa.asset_id = a.id 
          WHERE pa.product_id = p.id 
          ORDER BY pa.position ASC 
          LIMIT 1
        ) as image_url
      FROM products p
      WHERE p.parent_id IS NULL 
        AND p.deleted_at IS NULL 
        AND (p.sku LIKE ${'%' + q + '%'} OR p.title LIKE ${'%' + q + '%'})
      LIMIT 10
    `);

    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET: Product Detail (Admin)
products.get('/products/:id', async (c) => {
  const productId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    const results = await db.all<any>(sql`
      SELECT 
        p.id, p.slug, p.sku, p.title, p.description, p.type, p.status, p.is_purchasable, p.attributes_json,
        p.weight, p.length, p.width, p.height, p.primary_category_id,
        (
          SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
          FROM product_assets pa
          JOIN assets a ON pa.asset_id = a.id
          WHERE pa.product_id = p.id
          ORDER BY pa.position ASC
        ) as images_json,
        (
          SELECT json_group_array(cp.collection_id) 
          FROM collection_products cp 
          WHERE cp.product_id = p.id
        ) as secondary_categories,
        (
          SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1
        ) as regular_price,
        (
          SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1
        ) as stock_quantity,
        (
          SELECT CASE WHEN COUNT(v.id) > 0 THEN json_group_array(json_object(
            'id', v.id, 'sku', v.sku, 
            'regular_price', (SELECT price FROM price_list_items vpli WHERE vpli.product_id = v.id AND vpli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1),
            'stock', (SELECT stock_quantity FROM inventory_levels vil WHERE vil.product_id = v.id LIMIT 1),
            'is_purchasable', v.is_purchasable,
            'attributes', v.attributes_json
          )) ELSE '[]' END 
          FROM products v 
          WHERE v.parent_id = p.id AND v.deleted_at IS NULL AND v.is_purchasable = 1
        ) as variations
      FROM products p
      WHERE p.id = ${productId} AND p.deleted_at IS NULL
    `);

    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    const row = results[0];
    let images = [];
    try { images = JSON.parse(row.images_json || '[]').filter((img: any) => img.url); } catch { /* ignore */ }
    
    let variations = [];
    try { variations = JSON.parse(row.variations || '[]').filter((v: any) => v.id); } catch { /* ignore */ }

    let secondaryCategories = [];
    try { secondaryCategories = JSON.parse(row.secondary_categories || '[]').filter(Boolean); } catch { /* ignore */ }

    const formattedData = {
      ...row,
      images,
      secondary_categories: secondaryCategories,
      variations,
    };

    return c.json({ success: true, data: formattedData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});


// POST: Create Product
products.post('/products', requireRole(['superadmin', 'manager', 'editor']), zValidator('form', productFormSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = c.req.valid('form');
    
    if (!body['name']) {
      return c.json({ success: false, error: 'Missing product name' }, 400);
    }

    const imageRaw = body['images'];
    const files: File[] = [];
    if (imageRaw) {
      if (Array.isArray(imageRaw)) files.push(...imageRaw.filter((i): i is File => i instanceof File));
      else if (imageRaw instanceof File) files.push(imageRaw);
    }
    if (body['image'] instanceof File) files.push(body['image']);

    const imageUrls: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!file.type.startsWith('image/')) continue;
      const filename = buildUploadKey(file.name);
      await c.env.PRODUCTS_R2.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrls.push(`/media/products/${filename}`);
    }

    const productId = crypto.randomUUID();
    let variations: any[] = [];
    if (body['variations']) {
      try { variations = JSON.parse(body['variations'] as string); } catch { /* ignore */ }
    }

    const regularPrice = parseMoneyCents(body['regular_price'], 0);
    const salePrice = parseMoneyCents(body['sale_price'], -1);
    if (regularPrice === null) {
      return c.json({ success: false, error: 'regular_price must be a non-negative number' }, 400);
    }
    if (body['sale_price'] && salePrice === null) {
      return c.json({ success: false, error: 'sale_price must be a non-negative number' }, 400);
    }
    if (salePrice !== -1 && salePrice !== null && salePrice > regularPrice) {
      return c.json({ success: false, error: 'sale_price cannot exceed regular_price' }, 400);
    }

    const batchQueries = await ProductService.prepareUpsertProduct(db, {
      isUpdate: false,
      productId,
      name: body['name'] as string,
      sku: (body['sku'] as string) || null,
      type: (body['type'] as string) || 'simple',
      regular_price: regularPrice,
      sale_price: salePrice === -1 ? null : salePrice,
      stock: parseInt((body['stock'] as string) || '0', 10),
      weight: body['weight'] ? parseFloat(body['weight'] as string) : null,
      length: body['length'] ? parseFloat(body['length'] as string) : null,
      width: body['width'] ? parseFloat(body['width'] as string) : null,
      height: body['height'] ? parseFloat(body['height'] as string) : null,
      primary_category_id: (body['primary_category_id'] as string) || null,
      variations,
      imageUrls,
      locationId: DEFAULT_LOCATION_ID,
    });

    if (batchQueries.length > 0) {
      await db.batch(batchQueries as any);
      
      if (body['stock'] !== undefined) {
        c.executionCtx.waitUntil(InventoryRepository.invalidateCache(c.env, productId, DEFAULT_LOCATION_ID));
      }
      if (variations && variations.length > 0) {
        for (const v of variations) {
          if (v.id) {
            c.executionCtx.waitUntil(InventoryRepository.invalidateCache(c.env, v.id, DEFAULT_LOCATION_ID));
          }
        }
      }

      // Fetch the generated slug to invalidate the specific item cache
      const newProduct = await db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.id, productId)).get();
      if (newProduct && newProduct.slug) {
        c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, newProduct.slug));
        c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, productId));
      }
    }

    return c.json({ success: true, message: 'Product created successfully', data: { id: productId } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT: Update Product
products.put('/products/:id', requireRole(['superadmin', 'manager', 'editor']), zValidator('form', productFormSchema), async (c) => {
  const productId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    const body = c.req.valid('form');

    const existingProduct = await db.select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .get();
    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    let existingImages: string[] = [];
    if (body['existing_images']) {
      try { existingImages = JSON.parse(body['existing_images'] as string); } catch { /* ignore */ }
    }
    const imageRaw = body['images'];
    const files: File[] = [];
    if (imageRaw) {
      if (Array.isArray(imageRaw)) files.push(...imageRaw.filter((i): i is File => i instanceof File));
      else if (imageRaw instanceof File) files.push(imageRaw);
    }

    const imageUrls: string[] = [...existingImages];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!file.type.startsWith('image/')) continue;
      const filename = buildUploadKey(file.name);
      await c.env.PRODUCTS_R2.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrls.push(`/media/products/${filename}`);
    }

    let variations: any[] = [];
    if (body['variations']) {
      try { variations = JSON.parse(body['variations'] as string); } catch { /* ignore */ }
    }

    const finalImageUrls = (body['existing_images'] !== undefined || files.length > 0) ? imageUrls : undefined;

    const regularPrice = parseMoneyCents(body['regular_price'], 0);
    const salePrice = parseMoneyCents(body['sale_price'], -1);
    if (regularPrice === null) {
      return c.json({ success: false, error: 'regular_price must be a non-negative number' }, 400);
    }
    if (body['sale_price'] && salePrice === null) {
      return c.json({ success: false, error: 'sale_price must be a non-negative number' }, 400);
    }
    if (salePrice !== -1 && salePrice !== null && salePrice > regularPrice) {
      return c.json({ success: false, error: 'sale_price cannot exceed regular_price' }, 400);
    }

    const batchQueries = await ProductService.prepareUpsertProduct(db, {
      isUpdate: true,
      productId,
      name: body['name'] as string,
      sku: (body['sku'] as string) || null,
      type: (body['type'] as string) || 'simple',
      regular_price: regularPrice,
      sale_price: salePrice === -1 ? null : salePrice,
      stock: parseInt((body['stock'] as string) || '0', 10),
      weight: body['weight'] ? parseFloat(body['weight'] as string) : null,
      length: body['length'] ? parseFloat(body['length'] as string) : null,
      width: body['width'] ? parseFloat(body['width'] as string) : null,
      height: body['height'] ? parseFloat(body['height'] as string) : null,
      primary_category_id: (body['primary_category_id'] as string) || null,
      variations,
      imageUrls: finalImageUrls,
      locationId: DEFAULT_LOCATION_ID,
    });

    if (batchQueries.length > 0) {
      await db.batch(batchQueries as any);

      if (body['stock'] !== undefined) {
        c.executionCtx.waitUntil(InventoryRepository.invalidateCache(c.env, productId, DEFAULT_LOCATION_ID));
      }
      if (variations && variations.length > 0) {
        for (const v of variations) {
          if (v.id) {
            c.executionCtx.waitUntil(InventoryRepository.invalidateCache(c.env, v.id, DEFAULT_LOCATION_ID));
          }
        }
      }

      // Invalidate item cache (both by id and potential slug)
      const updatedProduct = await db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.id, productId)).get();
      if (updatedProduct && updatedProduct.slug) {
        c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, updatedProduct.slug));
      }
      c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, productId));
    }

    return c.json({ success: true, message: 'Product updated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE: Soft Delete Product
products.delete('/products/:id', requireRole(['superadmin', 'manager']), async (c) => {
  const productId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    const existingProduct = await db.select({ id: schema.products.id, slug: schema.products.slug })
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .get();

    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    await db.batch([
      db.update(schema.products)
        .set({ deleted_at: sql`CURRENT_TIMESTAMP`, updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.products.id, productId)),
      db.update(schema.products)
        .set({ deleted_at: sql`CURRENT_TIMESTAMP`, updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.products.parent_id, productId))
    ]);

    if (existingProduct.slug) {
      c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, existingProduct.slug));
    }
    c.executionCtx.waitUntil(CacheService.invalidateProductCache(c.env, productId));
    c.executionCtx.waitUntil(InventoryRepository.invalidateCache(c.env, productId, DEFAULT_LOCATION_ID));

    return c.json({ success: true, message: 'Product soft-deleted successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default products;
