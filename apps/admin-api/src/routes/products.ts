import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';

const products = new Hono<{ Bindings: Bindings }>();

// 5. API Quản lý Sản phẩm
products.get('/products', async (c) => {
  try {
    const db = createDb(c.env.DB);
    // Complex GROUP BY with json_group_array is not expressible via Drizzle builder;
    // using sql helper to safely execute the aggregate query.
    const results = await db.all<any>(sql`
      SELECT 
        p.*,
        (SELECT json_group_array(category_id) FROM product_categories WHERE product_id = p.id) as secondary_categories,
        json_group_array(json_object(
          'id', v.id, 'sku', v.sku, 'regular_price', v.regular_price, 
          'sale_price', v.sale_price, 'stock', v.stock, 'is_purchasable', v.is_purchasable,
          'attributes', v.attributes_json
        )) as variations
      FROM products p
      LEFT JOIN product_variations v ON p.id = v.product_id AND v.is_purchasable = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    // Parse variations JSON strings
    const formattedData = results.map((row: any) => ({
      ...row,
      images: row.images_json ? JSON.parse(row.images_json) : [],
      secondary_categories: row.secondary_categories ? JSON.parse(row.secondary_categories) : [],
      variations: row.variations ? JSON.parse(row.variations).filter((v: any) => v.id !== null) : [],
    }));
    
    return c.json({ success: true, data: formattedData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Storefront API - WooCommerce Format
products.get('/store/products', async (c) => {
  try {
    const db = createDb(c.env.DB);
    // Complex GROUP BY aggregate with json_group_array — use sql helper
    const results = await db.all<any>(sql`
      SELECT p.*, 
             json_group_array(json_object(
                'id', v.id, 'sku', v.sku, 'regular_price', v.regular_price, 
                'sale_price', v.sale_price, 'stock', v.stock, 'in_stock', v.in_stock,
                'attributes', v.attributes_json
             )) as variations
      FROM products p
      LEFT JOIN product_variations v ON p.id = v.product_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const formattedProducts = results.map((row: any) => {
      const vars = JSON.parse(row.variations || '[]');
      const minPrice = vars.length > 0 ? Math.min(...vars.map((v: any) => v.sale_price || v.regular_price || 0)) : row.sale_price || row.regular_price;
      const maxPrice = vars.length > 0 ? Math.max(...vars.map((v: any) => v.regular_price || 0)) : row.regular_price;

      return {
        id: row.id,
        name: row.title,
        slug: row.slug,
        type: row.type,
        description: row.description,
        images: row.images_json ? JSON.parse(row.images_json) : [],
        is_purchasable: !!row.is_purchasable,
        in_stock: !!row.in_stock,
        prices: {
          currency_code: 'USD',
          currency_symbol: '$',
          currency_minor_unit: 2,
          currency_decimal_separator: '.',
          currency_thousand_separator: ',',
          currency_prefix: '$',
          currency_suffix: '',
          price: (row.sale_price || row.regular_price || 0).toString(),
          regular_price: (row.regular_price || 0).toString(),
          sale_price: row.sale_price ? row.sale_price.toString() : row.regular_price?.toString(),
          price_range: row.type === 'variable' && vars.length > 0 ? {
            min_amount: minPrice.toString(),
            max_amount: maxPrice.toString(),
          } : null,
        },
        attributes: JSON.parse(row.attributes || '[]'),
        variations: vars,
      };
    });

    // Caching headers
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(formattedProducts);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

products.post('/products', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.parseBody();
    const name = body['name'] as string;
    const type = (body['type'] as string) || 'simple';
    const regular_price = parseInt((body['regular_price'] as string) || '0', 10);
    const sale_price = body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null;
    const stock = parseInt((body['stock'] as string) || '0', 10);
    const image = body['image'];
    const imageRaw = body['images'];
    const primary_category_id = (body['primary_category_id'] as string) || null;
    let secondary_categories: string[] = [];
    if (body['secondary_categories']) {
      try {
        secondary_categories = JSON.parse(body['secondary_categories'] as string);
      } catch (e) {
        // ignore
      }
    }
    
    // Parse variations JSON if provided
    let variations: any[] = [];
    if (body['variations']) {
      try {
        variations = JSON.parse(body['variations'] as string);
      } catch (e) {
        return c.json({ success: false, error: 'Invalid variations JSON' }, 400);
      }
    }
    
    if (!name) {
      return c.json({ success: false, error: 'Missing product name' }, 400);
    }

    const files: File[] = [];
    if (imageRaw) {
      if (Array.isArray(imageRaw)) files.push(...imageRaw.filter((i): i is File => i instanceof File));
      else if (imageRaw instanceof File) files.push(imageRaw);
    }
    if (image instanceof File) files.push(image);

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
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + crypto.randomUUID().slice(0, 6);

    // Insert product
    await db.insert(schema.products).values({
      id: productId,
      slug,
      title: name,
      description: null,
      images_json: JSON.stringify(imageUrls),
      status: 'published',
      type,
      regular_price,
      sale_price,
      primary_category_id,
    });

    // Insert variations via Drizzle batch
    const variationInserts = [];
    if (type === 'simple' || variations.length === 0) {
      const variationId = crypto.randomUUID();
      const sku = `SKU-${slug.toUpperCase()}`;
      variationInserts.push(
        db.insert(schema.productVariations).values({
          id: variationId,
          product_id: productId,
          sku,
          regular_price,
          sale_price,
          stock,
          attributes_json: JSON.stringify({}),
        })
      );
    } else {
      variations.forEach((v: any, index: number) => {
        const variationId = crypto.randomUUID();
        const sku = v.sku || `SKU-${slug.toUpperCase()}-${index + 1}`;
        variationInserts.push(
          db.insert(schema.productVariations).values({
            id: variationId,
            product_id: productId,
            sku,
            regular_price: v.regular_price || 0,
            sale_price: v.sale_price || null,
            stock: v.stock || 0,
            attributes_json: JSON.stringify(v.attributes || {}),
          })
        );
      });
    }

    if (secondary_categories.length > 0) {
      const pcInserts = secondary_categories.map(catId => ({
        id: crypto.randomUUID(),
        product_id: productId,
        category_id: catId,
      }));
      variationInserts.push(db.insert(schema.productCategories).values(pcInserts));
    }

    if (variationInserts.length > 0) {
      await db.batch(variationInserts as any);
    }

    return c.json({ success: true, message: 'Product created successfully', data: { id: productId, slug } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

products.put('/products/:id', async (c) => {
  const productId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.parseBody();
    const name = body['name'] as string;
    const type = (body['type'] as string) || 'simple';
    const regular_price = parseInt((body['regular_price'] as string) || '0', 10);
    const sale_price = body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null;
    const stock = parseInt((body['stock'] as string) || '0', 10);
    const primary_category_id = (body['primary_category_id'] as string) || null;
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
    let secondary_categories: string[] = [];
    if (body['secondary_categories']) {
      try {
        secondary_categories = JSON.parse(body['secondary_categories'] as string);
      } catch (e) {
        // ignore
      }
    }
    
    let variations: any[] = [];
    if (body['variations']) {
      try {
        variations = JSON.parse(body['variations'] as string);
      } catch (e) {
        return c.json({ success: false, error: 'Invalid variations JSON' }, 400);
      }
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

    const existingProduct = await db.select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .get();
    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    const updateData: any = { title: name, type, regular_price, sale_price, primary_category_id, updated_at: sql`CURRENT_TIMESTAMP` };
    // Only update images if the client actually sent image data
    if (body['existing_images'] !== undefined || files.length > 0) {
      updateData.images_json = JSON.stringify(imageUrls);
      updateData.description = null;
    }

    const batchQueries: any[] = [
      db.update(schema.products)
        .set(updateData)
        .where(eq(schema.products.id, productId)),
    ];

    // Re-create secondary categories
    batchQueries.push(db.delete(schema.productCategories).where(eq(schema.productCategories.product_id, productId)));
    if (secondary_categories.length > 0) {
      const pcInserts = secondary_categories.map(catId => ({
        id: crypto.randomUUID(),
        product_id: productId,
        category_id: catId,
      }));
      batchQueries.push(db.insert(schema.productCategories).values(pcInserts));
    }

    // Handle Variations UPSERT / Soft Delete
    if (type === 'variable' && variations.length > 0) {
      // 1. Mark all existing variations as unpurchasable (soft delete)
      batchQueries.push(
        db.update(schema.productVariations)
          .set({ is_purchasable: 0 })
          .where(eq(schema.productVariations.product_id, productId))
      );

      // 2. Upsert incoming variations
      variations.forEach((v: any) => {
        if (v.id) {
          // Update existing and restore purchasable state
          batchQueries.push(
            db.update(schema.productVariations)
              .set({
                sku: v.sku,
                regular_price: v.regular_price,
                sale_price: v.sale_price,
                stock: v.stock,
                attributes_json: JSON.stringify(v.attributes || {}),
                is_purchasable: 1,
              })
              .where(and(
                eq(schema.productVariations.id, v.id),
                eq(schema.productVariations.product_id, productId)
              ))
          );
        } else {
          // Insert new
          const variationId = crypto.randomUUID();
          const sku = v.sku || `SKU-${productId.substring(0, 6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          batchQueries.push(
            db.insert(schema.productVariations).values({
              id: variationId,
              product_id: productId,
              sku,
              regular_price: v.regular_price || 0,
              sale_price: v.sale_price || null,
              stock: v.stock || 0,
              attributes_json: JSON.stringify(v.attributes || {}),
              is_purchasable: 1,
            })
          );
        }
      });
    } else if (type === 'simple') {
      // For simple products, update all variations of this product to match
      batchQueries.push(
        db.update(schema.productVariations)
          .set({ regular_price, sale_price, stock })
          .where(eq(schema.productVariations.product_id, productId))
      );
    }

    await db.batch(batchQueries as any);

    return c.json({ success: true, message: 'Product updated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default products;
