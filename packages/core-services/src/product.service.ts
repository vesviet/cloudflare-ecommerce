import { eq, and, sql, inArray } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class ProductService {
  /**
   * Helper: build a normalised `prices` object for any product row + its variations.
   */
  static buildPrices(product: any, variations: any[]) {
    // This assumes variation prices and stock are now pulled from price_list_items and inventory_levels
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
        images: row.assets || [],
        is_purchasable: !!row.is_purchasable,
        in_stock: (row.stock_quantity || 0) > 0,
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
    locationId?: string;
  }) {
    const { isUpdate, productId, type, variations = [], secondary_categories = [] } = params;
    const batchQueries: any[] = [];
    const locationId = params.locationId || 'loc_default';
    const primaryCategoryId = (params.primary_category_id && typeof params.primary_category_id === 'string' && params.primary_category_id.trim() !== '' && params.primary_category_id !== 'null' && params.primary_category_id !== 'undefined')
      ? params.primary_category_id
      : null;
    
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
          status: 'published',
          type: type || 'simple',
          weight: type === 'simple' ? params.weight : null,
          length: type === 'simple' ? params.length : null,
          width: type === 'simple' ? params.width : null,
          height: type === 'simple' ? params.height : null,
          primary_category_id: primaryCategoryId,
        })
      );
    } else {
      const updateData: any = { updated_at: sql`CURRENT_TIMESTAMP` };
      if (params.name) updateData.title = params.name;
      if (params.sku !== undefined) updateData.sku = params.sku;
      if (params.type) updateData.type = params.type;
      if (params.weight !== undefined && type === 'simple') updateData.weight = params.weight;
      if (params.length !== undefined && type === 'simple') updateData.length = params.length;
      if (params.width !== undefined && type === 'simple') updateData.width = params.width;
      if (params.height !== undefined && type === 'simple') updateData.height = params.height;
      if (params.primary_category_id !== undefined) updateData.primary_category_id = primaryCategoryId;
      
      batchQueries.push(
        db.update(schema.products).set(updateData).where(eq(schema.products.id, productId))
      );
    }

    // Handle prices and inventory for simple product
    if (type === 'simple') {
      if (params.regular_price !== undefined) {
        batchQueries.push(
          db.delete(schema.priceListItems).where(eq(schema.priceListItems.product_id, productId))
        );
        batchQueries.push(
          db.insert(schema.priceListItems).values({
            id: crypto.randomUUID(),
            price_list_id: 'pl_base',
            product_id: productId,
            price: params.regular_price || 0
          })
        );
      }
      
      if (params.stock !== undefined) {
        batchQueries.push(
          db.delete(schema.inventoryLevels).where(
            and(
              eq(schema.inventoryLevels.product_id, productId),
              eq(schema.inventoryLevels.location_id, locationId)
            )
          )
        );
        batchQueries.push(
          db.insert(schema.inventoryLevels).values({
            id: crypto.randomUUID(),
            location_id: locationId,
            product_id: productId,
            stock_quantity: params.stock || 0
          })
        );
      }
    }

    // Handle images / assets
    if (params.imageUrls && params.imageUrls.length > 0) {
      if (isUpdate) {
        batchQueries.push(
          db.delete(schema.productAssets).where(eq(schema.productAssets.product_id, productId))
        );
      }

      const assetIdMap: Record<string, string> = {};
      const existingAssets = await db.select({ id: schema.assets.id, r2_key: schema.assets.r2_key })
        .from(schema.assets)
        .where(inArray(schema.assets.r2_key, params.imageUrls));
        
      existingAssets.forEach((a: any) => { assetIdMap[a.r2_key] = a.id; });

      for (let i = 0; i < params.imageUrls.length; i++) {
        const url = params.imageUrls[i];
        let assetId = assetIdMap[url];

        if (!assetId) {
          assetId = crypto.randomUUID();
          // Insert asset
          batchQueries.push(
            db.insert(schema.assets).values({
              id: assetId,
              r2_key: url,
              url: url,
              alt_text: params.name || 'Product Image'
            })
          );
        }
        
        // Link asset to product
        batchQueries.push(
          db.insert(schema.productAssets).values({
            id: crypto.randomUUID(),
            product_id: productId,
            asset_id: assetId,
            position: i
          })
        );
      }
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
        const varId = v.id || crypto.randomUUID();
        
        if (v.id) {
          batchQueries.push(
            db.update(schema.products)
              .set({
                parent_id: productId,
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
          const varSku = v.sku || `SKU-${slug.toUpperCase()}-${index + 1}`;
          batchQueries.push(
            db.insert(schema.products).values({
              id: varId,
              parent_id: productId,
              slug: `${slug}-${index + 1}`,
              sku: varSku,
              title: `${params.name} - ${v.attributes ? Object.values(v.attributes).join(' ') : index + 1}`,
              type: 'simple',
              is_purchasable: 1,
              attributes_json: JSON.stringify(v.attributes || {}),
            })
          );
        }

        // Handle variations prices and inventory
        batchQueries.push(
          db.delete(schema.priceListItems).where(eq(schema.priceListItems.product_id, varId))
        );
        batchQueries.push(
          db.insert(schema.priceListItems).values({
            id: crypto.randomUUID(),
            price_list_id: 'pl_base',
            product_id: varId,
            price: v.regular_price || 0
          })
        );

        batchQueries.push(
          db.delete(schema.inventoryLevels).where(
            and(
              eq(schema.inventoryLevels.product_id, varId),
              eq(schema.inventoryLevels.location_id, locationId)
            )
          )
        );
        batchQueries.push(
          db.insert(schema.inventoryLevels).values({
            id: crypto.randomUUID(),
            location_id: locationId,
            product_id: varId,
            stock_quantity: v.stock || 0
          })
        );
      }
    } else if (isUpdate && type === 'simple') {
      batchQueries.push(
        db.update(schema.products)
          .set({ deleted_at: sql`CURRENT_TIMESTAMP`, is_purchasable: 0 })
          .where(eq(schema.products.parent_id, productId))
      );
    }

    return batchQueries;
  }
}
