import { sql } from 'drizzle-orm';
import { ProductService } from './product.service';
import { PromotionRulesEngine, getActiveCatalogRules } from './promotion.rules.engine';
import { FlashSaleService } from './flash-sale.service';

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
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
          (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = p.id) as stock_quantity,
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
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
          (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = p.id) as stock_quantity,
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

    const productRows = await db.all(query) as any[];
    const productIds = productRows.map((p: any) => p.id);

    let allVariations: any[] = [];
    if (productIds.length > 0) {
      const idChunks = productIds.map((id: string) => sql`${id}`);
      allVariations = await db.all(sql`
        SELECT 
          v.*,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
          (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
          (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = v.id) as stock_quantity
        FROM products v
        WHERE v.parent_id IN (${sql.join(idChunks, sql`, `)})
          AND v.deleted_at IS NULL
      `) as any[];
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

    await this.applyCatalogPromotions(db, enriched);
    return enriched;
  }

  /**
   * Phase 2A (PRM-03) + 2B: strike-through pricing. Flash-sale pricing is
   * applied first and ISOLATES the product from catalog-rule stacking
   * (Laravel ADR); otherwise the best catalog_rule wins.
   */
  private static async applyCatalogPromotions(db: any, items: any | any[]): Promise<void> {
    const list = Array.isArray(items) ? items : [items];
    if (list.length === 0) return;

    const productIds = list.map((i: any) => i.id).filter(Boolean);
    const flashMap = await FlashSaleService.getActiveFlashPricing(db, productIds);

    const needsRules = list.some((i: any) => !flashMap.has(i.id));
    const rules = needsRules ? await getActiveCatalogRules(db) : [];

    for (const item of list) {
      const base = Number(item.prices?.regular_price ?? item.prices?.price ?? 0);
      const current = Number(item.prices?.sale_price ?? base);
      if (!(base > 0)) continue;

      const flash = flashMap.get(item.id);
      if (flash && flash.price < current && flash.left > 0) {
        item.prices.promoted_price = flash.price;
        item.prices.is_flash_sale = true;
        item.prices.flash_ends_at = flash.endsAt;
        continue; // isolation: no rule stacking on flash units
      }

      if (rules.length === 0) continue;
      const promo = await PromotionRulesEngine.resolveCatalogPrice(db, item.id, item.primary_category_id ?? null, base, rules);
      if (promo && promo.promoted_price < current) {
        item.prices.promoted_price = promo.promoted_price;
        item.prices.promo_rule_name = promo.rule_name;
      }
    }
  }

  /**
   * Fetches a specific catalog item (product) and its variations.
   */
  static async getCatalogItem(db: any, slug: string): Promise<any | null> {
    const product = await db.get(sql`
      SELECT 
        p.*,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
        (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = p.id) as stock_quantity,
        (
          SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
          FROM product_assets pa
          JOIN assets a ON pa.asset_id = a.id
          WHERE pa.product_id = p.id
          ORDER BY pa.position ASC
        ) as assets
      FROM products p
      WHERE (p.slug = ${slug} OR p.id = ${slug}) AND p.status = 'published'
    `) as any;

    if (!product) return null;

    const variations = (await db.all(sql`
      SELECT 
        v.*,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = v.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
        (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = v.id) as stock_quantity
      FROM products v
      WHERE v.parent_id = ${product.id} AND v.deleted_at IS NULL
    `)).map((v: any) => ({
      ...v,
      stock: v.stock_quantity || 0,
      attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
    }));

    let images = [];
    try { images = JSON.parse(product.assets || '[]').filter((img: any) => img.url); } catch { /* ignore */ }

    const result = {
      ...product,
      name: product.title,
      images,
      variations,
      prices: ProductService.buildPrices(product, variations),
    };
    await this.applyCatalogPromotions(db, result);
    return result;
  }

  /**
   * Search products for catalog
   */
  static async searchCatalog(db: any, query: string): Promise<any[]> {
    if (!query) return [];
    
    // Convert to FTS5 query format (escape quotes, append *)
    const ftsQuery = `"${query.replace(/"/g, '""')}*"`;

    const productRows = await db.all(sql`
      SELECT 
        p.*,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'base' LIMIT 1) LIMIT 1) as regular_price,
        (SELECT price FROM price_list_items pli WHERE pli.product_id = p.id AND pli.price_list_id = (SELECT id FROM price_lists WHERE type = 'sale' LIMIT 1) LIMIT 1) as sale_price,
        (SELECT coalesce(sum(stock_quantity), 0) FROM inventory_levels il WHERE il.product_id = p.id) as stock_quantity,
        (
          SELECT json_group_array(json_object('url', a.url, 'alt_text', a.alt_text))
          FROM product_assets pa
          JOIN assets a ON pa.asset_id = a.id
          WHERE pa.product_id = p.id
          ORDER BY pa.position ASC
        ) as assets
      FROM products_search ps
      JOIN products p ON ps.id = p.id
      WHERE products_search MATCH ${ftsQuery}
        AND p.status = 'published' 
        AND p.deleted_at IS NULL
      ORDER BY ps.rank
      LIMIT 20
    `) as any[];

    const mapped = productRows.map((product: any) => {
      let images = [];
      try { images = JSON.parse(product.assets || '[]').filter((img: any) => img.url); } catch (e) {}

      return {
        ...product,
        name: product.title,
        images,
        variations: [], // Search usually returns simple product list, avoid deep variations for performance
        prices: ProductService.buildPrices(product, []),
      }
    });
    await this.applyCatalogPromotions(db, mapped);
    return mapped;
  }
}
