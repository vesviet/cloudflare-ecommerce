import { sql } from 'drizzle-orm';
import { ProductService } from './product.service';

export class CatalogService {
  /**
   * Fetches the catalog list, optionally filtered by category tree.
   * Extracted from public-api/src/routes/catalog.ts
   */
  static async getCatalogList(db: any, categorySlug?: string): Promise<any[]> {
    let query: any;
    if (categorySlug) {
      query = sql`
        WITH RECURSIVE category_tree AS (
          SELECT id FROM categories WHERE slug = ${categorySlug}
          UNION ALL
          SELECT c.id FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT DISTINCT 
          p.*,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1) as regular_price,
          (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1) as stock_quantity,
          (
            SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
            FROM product_assets pa
            JOIN assets a ON pa.asset_id = a.id
            WHERE pa.product_id = p.id
            ORDER BY pa.position ASC
          ) as assets
        FROM products p
        LEFT JOIN collection_products cp ON p.id = cp.product_id
        WHERE p.status = 'published' AND p.parent_id IS NULL AND p.deleted_at IS NULL AND (
          p.primary_category_id IN (SELECT id FROM category_tree) OR
          cp.collection_id IN (SELECT id FROM category_tree)
        )
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    } else {
      query = sql`
        SELECT 
          p.*,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1) as regular_price,
          (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1) as stock_quantity,
          (
            SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
            FROM product_assets pa
            JOIN assets a ON pa.asset_id = a.id
            WHERE pa.product_id = p.id
            ORDER BY pa.position ASC
          ) as assets
        FROM products p
        WHERE p.status = 'published' AND p.parent_id IS NULL AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    }

    const productRows = await db.all<any>(query);
    const productIds = productRows.map((p: any) => p.id);

    let allVariations: any[] = [];
    if (productIds.length > 0) {
      allVariations = await db.all<any>(sql`
        SELECT 
          v.*,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id LIMIT 1) as regular_price,
          (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = v.id LIMIT 1) as stock_quantity
        FROM products v
        WHERE v.parent_id IN (${sql.join(productIds, sql`, `)})
          AND v.deleted_at IS NULL
      `);
    }

    const variationsByProductId = allVariations.reduce((acc: any, v: any) => {
      if (!v.parent_id) return acc;
      if (!acc[v.parent_id]) acc[v.parent_id] = [];
      acc[v.parent_id].push({
        ...v,
        stock: v.stock_quantity || 0,
        attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
      });
      return acc;
    }, {});

    const enriched = productRows.map((product: any) => {
      const variations = variationsByProductId[product.id] || [];
      let images = [];
      try { images = JSON.parse(product.assets || '[]').filter((img: any) => img.url); } catch (e) {}

      return {
        ...product,
        name: product.title,
        images,
        variations,
        prices: ProductService.buildPrices(product, variations),
      }
    });

    return enriched;
  }

  /**
   * Fetches a specific catalog item (product) and its variations.
   */
  static async getCatalogItem(db: any, slug: string): Promise<any | null> {
    const product = await db.get<any>(sql`
      SELECT 
        p.*,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id LIMIT 1) as regular_price,
        (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = p.id LIMIT 1) as stock_quantity,
        (
          SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
          FROM product_assets pa
          JOIN assets a ON pa.asset_id = a.id
          WHERE pa.product_id = p.id
          ORDER BY pa.position ASC
        ) as assets
      FROM products p
      WHERE (p.slug = ${slug} OR p.id = ${slug}) AND p.status = 'published'
    `);

    if (!product) return null;

    const variations = (await db.all<any>(sql`
      SELECT 
        v.*,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id LIMIT 1) as regular_price,
        (SELECT stock_quantity FROM inventory_levels il WHERE il.product_id = v.id LIMIT 1) as stock_quantity
      FROM products v
      WHERE v.parent_id = ${product.id} AND v.deleted_at IS NULL
    `)).map((v: any) => ({
      ...v,
      stock: v.stock_quantity || 0,
      attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
    }));

    let images = [];
    try { images = JSON.parse(product.assets || '[]').filter((img: any) => img.url); } catch (e) {}

    return {
      ...product,
      name: product.title,
      images,
      variations,
      prices: ProductService.buildPrices(product, variations),
    };
  }

  /**
   * Search products for catalog
   */
  static async searchCatalog(db: any, query: string): Promise<any[]> {
    if (!query) return [];
    return await db.all(
      sql`SELECT * FROM products_search WHERE products_search MATCH ${'*' + query + '*'} ORDER BY rank`
    );
  }
}
