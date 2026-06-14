import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { zValidator } from '@hono/zod-validator';
import { productFormSchema } from '@ecommerce/contract';
import { ProductService, CacheService } from '@ecommerce/core-services';

const products = new Hono<{ Bindings: Bindings }>();

// GET: Product List (Admin)
products.get('/products', async (c) => {
  try {
    const db = createDb(c.env.DB);
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
          SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1
        ) as regular_price,
        (
          SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1
        ) as stock_quantity,
        (
          SELECT CASE WHEN COUNT(v.id) > 0 THEN json_group_array(json_object(
            'id', v.id, 'sku', v.sku, 
            'regular_price', (SELECT price FROM price_list_items vpli WHERE vpli.product_id = v.id LIMIT 1),
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
    `);
    
    const formattedData = results.map((row: any) => {
      // images_json now contains actual asset objects { url, alt_text }
      let images = [];
      try { images = JSON.parse(row.images_json || '[]').filter((img: any) => img.url); } catch (e) {}
      
      let variations = [];
      try { variations = JSON.parse(row.variations || '[]').filter((v: any) => v.id); } catch (e) {}

      let secondaryCategories = [];
      try { secondaryCategories = JSON.parse(row.secondary_categories || '[]').filter(Boolean); } catch (e) {}

      return {
        ...row,
        images,
        secondary_categories: secondaryCategories,
        variations,
      };
    });
    
    return c.json({ success: true, data: formattedData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Autocomplete SKU Search
products.get('/products/search-sku', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const q = c.req.query('q') || '';
    if (!q || q.length < 2) {
      return c.json({ success: true, data: [] });
    }

    const results = await db.all<any>(sql`
      SELECT 
        p.id, p.sku, p.title,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1) as regular_price,
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

// POST: Create Product
products.post('/products', zValidator('form', productFormSchema), async (c) => {
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
      const filename = `${Date.now()}-${file.name}`;
      await c.env.PRODUCTS_R2.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrls.push(`/media/products/${filename}`);
    }

    const productId = crypto.randomUUID();
    let variations: any[] = [];
    if (body['variations']) {
      try { variations = JSON.parse(body['variations'] as string); } catch(e){}
    }
    let secondary_categories: string[] = [];
    if (body['secondary_categories']) {
      try { secondary_categories = JSON.parse(body['secondary_categories'] as string); } catch(e){}
    }

    const batchQueries = await ProductService.prepareUpsertProduct(db, {
      isUpdate: false,
      productId,
      name: body['name'] as string,
      sku: (body['sku'] as string) || null,
      type: (body['type'] as string) || 'simple',
      regular_price: parseInt((body['regular_price'] as string) || '0', 10),
      sale_price: body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null,
      stock: parseInt((body['stock'] as string) || '0', 10),
      weight: body['weight'] ? parseFloat(body['weight'] as string) : null,
      length: body['length'] ? parseFloat(body['length'] as string) : null,
      width: body['width'] ? parseFloat(body['width'] as string) : null,
      height: body['height'] ? parseFloat(body['height'] as string) : null,
      primary_category_id: (body['primary_category_id'] as string) || null,
      secondary_categories,
      variations,
      imageUrls,
    });

    if (batchQueries.length > 0) {
      await db.batch(batchQueries as any);
      
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
products.put('/products/:id', zValidator('form', productFormSchema), async (c) => {
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
      try { existingImages = JSON.parse(body['existing_images'] as string); } catch(e){}
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
      const filename = `${Date.now()}-${file.name}`;
      await c.env.PRODUCTS_R2.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrls.push(`/media/products/${filename}`);
    }

    let variations: any[] = [];
    if (body['variations']) {
      try { variations = JSON.parse(body['variations'] as string); } catch(e){}
    }
    let secondary_categories: string[] = [];
    if (body['secondary_categories']) {
      try { secondary_categories = JSON.parse(body['secondary_categories'] as string); } catch(e){}
    }

    const finalImageUrls = (body['existing_images'] !== undefined || files.length > 0) ? imageUrls : undefined;

    const batchQueries = await ProductService.prepareUpsertProduct(db, {
      isUpdate: true,
      productId,
      name: body['name'] as string,
      sku: (body['sku'] as string) || null,
      type: (body['type'] as string) || 'simple',
      regular_price: parseInt((body['regular_price'] as string) || '0', 10),
      sale_price: body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null,
      stock: parseInt((body['stock'] as string) || '0', 10),
      weight: body['weight'] ? parseFloat(body['weight'] as string) : null,
      length: body['length'] ? parseFloat(body['length'] as string) : null,
      width: body['width'] ? parseFloat(body['width'] as string) : null,
      height: body['height'] ? parseFloat(body['height'] as string) : null,
      primary_category_id: (body['primary_category_id'] as string) || null,
      secondary_categories,
      variations,
      imageUrls: finalImageUrls,
    });

    if (batchQueries.length > 0) {
      await db.batch(batchQueries as any);

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

export default products;
