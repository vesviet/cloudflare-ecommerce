import { Hono } from 'hono';
import { and, eq, sql, inArray } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { ProductService } from '@ecommerce/core-services';

const catalog = new Hono<{ Bindings: { DB: D1Database } }>();

catalog.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categorySlug = c.req.query('category');

    let productRows: any[];
    if (categorySlug) {
      const query = sql`
        WITH RECURSIVE category_tree AS (
          SELECT id FROM categories WHERE slug = ${categorySlug}
          UNION ALL
          SELECT c.id FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT DISTINCT p.* FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        WHERE p.status = 'published' AND p.parent_id IS NULL AND p.deleted_at IS NULL AND (
          p.primary_category_id IN (SELECT id FROM category_tree) OR
          pc.category_id IN (SELECT id FROM category_tree)
        )
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
      productRows = await db.all<any>(query);
    } else {
      productRows = await db.select()
        .from(schema.products)
        .where(and(
          eq(schema.products.status, 'published'),
          sql`${schema.products.parent_id} IS NULL`,
          sql`${schema.products.deleted_at} IS NULL`
        ))
        .orderBy(sql`${schema.products.created_at} DESC`)
        .limit(20)
        .all();
    }

    const productIds = productRows.map(p => p.id);
    let allVariations: any[] = [];
    if (productIds.length > 0) {
      allVariations = await db.select()
        .from(schema.products)
        .where(and(
          inArray(schema.products.parent_id, productIds),
          sql`${schema.products.deleted_at} IS NULL`
        ))
        .all();
    }

    const variationsByProductId = allVariations.reduce((acc: any, v: any) => {
      if (!v.parent_id) return acc;
      if (!acc[v.parent_id]) acc[v.parent_id] = [];
      acc[v.parent_id].push({
        ...v,
        stock: v.stock_quantity,
        attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
      });
      return acc;
    }, {});

    const enriched = productRows.map((product) => {
      const variations = variationsByProductId[product.id] || [];
      return {
        ...product,
        name: product.title,
        images: product.images_json ? JSON.parse(product.images_json) : [],
        variations,
        prices: ProductService.buildPrices(product, variations),
      }
    });

    return c.json({ success: true, data: enriched });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

catalog.get('/search', async (c) => {
  try {
    const q = c.req.query('q');
    if (!q) return c.json({ success: false, error: 'Missing query param' }, 400);

    const db = createDb(c.env.DB);
    const results = await db.all(
      sql`SELECT * FROM products_search WHERE products_search MATCH ${'*' + q + '*'} ORDER BY rank`
    );

    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

catalog.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = createDb(c.env.DB);

    const product = await db.select()
      .from(schema.products)
      .where(
        and(
          sql`${schema.products.slug} = ${slug} OR ${schema.products.id} = ${slug}`,
          eq(schema.products.status, 'published')
        )
      )
      .get();

    if (!product) return c.json({ success: false, error: 'Not found' }, 404);

    const variations = (await db.select()
      .from(schema.products)
      .where(and(
        eq(schema.products.parent_id, product.id),
        sql`${schema.products.deleted_at} IS NULL`
      ))
      .all()).map(v => ({
        ...v,
        stock: v.stock_quantity,
        attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
      }));

    return c.json({
      success: true,
      data: {
        ...product,
        name: product.title,
        images: product.images_json ? JSON.parse(product.images_json) : [],
        variations,
        prices: ProductService.buildPrices(product, variations),
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default catalog;
