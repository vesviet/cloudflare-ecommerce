import { eq, and, sql, inArray } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class ProductService {
  /**
   * Helper: build a normalised `prices` object for any product row + its variations.
   */
  static buildPrices(product: any, variations: any[]) {
    if (product.type === 'variable' && variations.length > 0) {
      const purchasable = variations.filter((v: any) => v.is_purchasable === 1)
      const prices = purchasable.length > 0 ? purchasable : variations
      const amounts = prices.map((v: any) => v.sale_price ?? v.regular_price)
      const min = Math.min(...amounts)
      const max = Math.max(...amounts)
      return {
        regular_price: null,
        sale_price: null,
        price_range: {
          min_amount: String(min),
          max_amount: String(max),
        },
      }
    }
    return {
      regular_price: product.regular_price != null ? String(product.regular_price) : null,
      sale_price: product.sale_price != null ? String(product.sale_price) : null,
      price_range: null,
    }
  }

  /**
   * Format products for Storefront API (WooCommerce format)
   */
  static formatForStorefront(products: any[], variationsByProductId: Record<string, any[]>) {
    return products.map((row: any) => {
      const validVars = variationsByProductId[row.id] || [];
      const minPrice = validVars.length > 0 ? Math.min(...validVars.map((v: any) => v.sale_price || v.regular_price || 0)) : row.sale_price || row.regular_price;
      const maxPrice = validVars.length > 0 ? Math.max(...validVars.map((v: any) => v.regular_price || 0)) : row.regular_price;

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
          price_range: (row.type === 'variable' || row.type === 'configurable') && validVars.length > 0 ? {
            min_amount: minPrice.toString(),
            max_amount: maxPrice.toString(),
          } : null,
        },
        attributes: row.attributes_json ? JSON.parse(row.attributes_json) : [],
        variations: validVars,
      };
    });
  }

  /**
   * Generates Drizzle queries to upsert product and its variations.
   */
  static async prepareUpsertProduct(db: any, params: {
    isUpdate: boolean;
    productId: string;
    name?: string;
    sku?: string | null;
    type?: string;
    regular_price?: number;
    sale_price?: number | null;
    stock?: number;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    imageUrls?: string[];
    primary_category_id?: string | null;
    secondary_categories?: string[];
    variations?: any[];
  }) {
    const { isUpdate, productId, type, variations = [], secondary_categories = [] } = params;
    const batchQueries: any[] = [];
    
    // Core Product Update/Insert
    let slug = '';
    if (params.name) {
      slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    if (!isUpdate) {
      if (!params.name) throw new Error("Name is required for new product");
      slug = slug + '-' + crypto.randomUUID().slice(0, 6);
      batchQueries.push(
        db.insert(schema.products).values({
          id: productId,
          slug,
          sku: params.sku || null,
          title: params.name,
          description: null,
          images_json: params.imageUrls ? JSON.stringify(params.imageUrls) : '[]',
          status: 'published',
          type: type || 'simple',
          regular_price: params.regular_price || 0,
          sale_price: params.sale_price || null,
          stock_quantity: type === 'simple' ? (params.stock || 0) : 0,
          manage_stock: 1,
          in_stock: type === 'simple' ? ((params.stock || 0) > 0 ? 1 : 0) : 1,
          weight: type === 'simple' ? params.weight : null,
          length: type === 'simple' ? params.length : null,
          width: type === 'simple' ? params.width : null,
          height: type === 'simple' ? params.height : null,
          primary_category_id: params.primary_category_id || null,
        })
      );
    } else {
      const updateData: any = { updated_at: sql`CURRENT_TIMESTAMP` };
      if (params.name) updateData.title = params.name;
      if (params.sku !== undefined) updateData.sku = params.sku;
      if (params.type) updateData.type = params.type;
      if (params.regular_price !== undefined) updateData.regular_price = params.regular_price;
      if (params.sale_price !== undefined) updateData.sale_price = params.sale_price;
      if (params.stock !== undefined && type === 'simple') {
        updateData.stock_quantity = params.stock;
        updateData.in_stock = params.stock > 0 ? 1 : 0;
      }
      if (params.weight !== undefined && type === 'simple') updateData.weight = params.weight;
      if (params.length !== undefined && type === 'simple') updateData.length = params.length;
      if (params.width !== undefined && type === 'simple') updateData.width = params.width;
      if (params.height !== undefined && type === 'simple') updateData.height = params.height;
      if (params.primary_category_id !== undefined) updateData.primary_category_id = params.primary_category_id;
      if (params.imageUrls && params.imageUrls.length > 0) {
        updateData.images_json = JSON.stringify(params.imageUrls);
      }
      batchQueries.push(
        db.update(schema.products).set(updateData).where(eq(schema.products.id, productId))
      );
    }

    // Variations Handling
    if (type !== 'simple' && variations.length > 0) {
      if (isUpdate) {
        const keepIds = variations.map((v: any) => v.id).filter(Boolean);
        if (keepIds.length > 0) {
          batchQueries.push(
            db.update(schema.products)
              .set({ deleted_at: sql`CURRENT_TIMESTAMP`, is_purchasable: 0 })
              .where(and(
                eq(schema.products.parent_id, productId),
                sql`${schema.products.id} NOT IN (${sql.join(keepIds, sql`, `)})`
              ))
          );
        } else {
          batchQueries.push(
            db.update(schema.products)
              .set({ deleted_at: sql`CURRENT_TIMESTAMP`, is_purchasable: 0 })
              .where(eq(schema.products.parent_id, productId))
          );
        }
      }

      for (let index = 0; index < variations.length; index++) {
        const v = variations[index];
        if (v.id) {
          batchQueries.push(
            db.update(schema.products)
              .set({
                parent_id: productId,
                regular_price: v.regular_price || 0,
                sale_price: v.sale_price || null,
                stock_quantity: v.stock || 0,
                in_stock: (v.stock || 0) > 0 ? 1 : 0,
                attributes_json: JSON.stringify(v.attributes || {}),
                is_purchasable: 1,
                deleted_at: null
              })
              .where(and(
                eq(schema.products.id, v.id),
                sql`(${schema.products.parent_id} IS NULL OR ${schema.products.parent_id} = ${productId})`
              ))
          );
        } else {
          const variationId = crypto.randomUUID();
          const varSku = v.sku || `SKU-${slug.toUpperCase()}-${index + 1}`;
          batchQueries.push(
            db.insert(schema.products).values({
              id: variationId,
              parent_id: productId,
              slug: `${slug}-${index + 1}`,
              sku: varSku,
              title: `${params.name} - ${v.attributes ? Object.values(v.attributes).join(' ') : index + 1}`,
              type: 'simple',
              regular_price: v.regular_price || 0,
              sale_price: v.sale_price || null,
              stock_quantity: v.stock || 0,
              manage_stock: 1,
              in_stock: (v.stock || 0) > 0 ? 1 : 0,
              is_purchasable: 1,
              attributes_json: JSON.stringify(v.attributes || {}),
            })
          );
        }
      }
    } else if (isUpdate && type === 'simple') {
      batchQueries.push(
        db.update(schema.products)
          .set({ deleted_at: sql`CURRENT_TIMESTAMP`, is_purchasable: 0 })
          .where(eq(schema.products.parent_id, productId))
      );
    }

    // Categories Handling
    batchQueries.push(db.delete(schema.productCategories).where(eq(schema.productCategories.product_id, productId)));
    if (secondary_categories.length > 0) {
      for (const catId of secondary_categories) {
        batchQueries.push(
          db.insert(schema.productCategories).values({
            product_id: productId,
            category_id: catId,
          })
        );
      }
    }

    return batchQueries;
  }
}
