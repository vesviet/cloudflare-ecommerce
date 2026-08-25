import { and, eq, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';
import { createDb } from '@ecommerce/database';

export class WishlistService {
  /**
   * Retrieves the wishlist for a customer, joining with product details.
   */
  static async getWishlist(dbInstance: any, customerId: string) {
    const drizzleDb = (typeof dbInstance.select === 'function') ? dbInstance : createDb(dbInstance);
    
    const customer = await drizzleDb.select({
      metafields_json: localSchema.customers.metafields_json
    })
      .from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();

    let productIds: string[] = [];
    if (customer && customer.metafields_json) {
      try {
        const metafields = JSON.parse(customer.metafields_json);
        if (metafields && Array.isArray(metafields.wishlist)) {
          productIds = metafields.wishlist;
        }
      } catch (e) {}
    }

    const items = [];
    for (const productId of productIds) {
      const product = await drizzleDb.select({
        id: localSchema.products.id,
        title: localSchema.products.title,
        slug: localSchema.products.slug,
        status: localSchema.products.status,
      })
        .from(localSchema.products)
        .where(eq(localSchema.products.id, productId))
        .get();

      if (!product) continue;

      const priceItem = await drizzleDb.select({ price: localSchema.priceListItems.price })
        .from(localSchema.priceListItems)
        .where(eq(localSchema.priceListItems.product_id, productId))
        .get();

      const invLevel = await drizzleDb.select({ stock_quantity: sql`coalesce(sum(${localSchema.inventoryLevels.stock_quantity}), 0)` })
        .from(localSchema.inventoryLevels)
        .where(eq(localSchema.inventoryLevels.product_id, productId))
        .get();

      const productAssets = await drizzleDb.select({
        url: localSchema.assets.url,
        alt_text: localSchema.assets.alt_text,
      })
        .from(localSchema.productAssets)
        .join(localSchema.assets, eq(localSchema.productAssets.asset_id, localSchema.assets.id))
        .where(eq(localSchema.productAssets.product_id, productId))
        .orderBy(localSchema.productAssets.position)
        .all();

      items.push({
        wishlist_id: `wlist_${productId}`,
        product_id: productId,
        created_at: new Date().toISOString(),
        product: {
          id: product.id,
          name: product.title,
          slug: product.slug,
          status: product.status,
          images: productAssets.filter((img: any) => img.url),
          prices: {
            price: priceItem?.price || 0,
            regular_price: priceItem?.price || 0,
            currency_code: 'VND',
          },
          in_stock: (invLevel?.stock_quantity || 0) > 0,
        }
      });
    }

    return items;
  }

  /**
   * Adds an item to the wishlist.
   */
  static async addItem(drizzleDb: any, customerId: string, productId: string) {
    const customer = await drizzleDb.select()
      .from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    let metafields: any = {};
    if (customer.metafields_json) {
      try {
        metafields = JSON.parse(customer.metafields_json) || {};
      } catch (e) {}
    }
    if (!Array.isArray(metafields.wishlist)) {
      metafields.wishlist = [];
    }

    if (metafields.wishlist.includes(productId)) {
      return {
        id: `wlist_${productId}`,
        customer_id: customerId,
        product_id: productId,
      };
    }

    metafields.wishlist.push(productId);

    await drizzleDb.update(localSchema.customers)
      .set({
        metafields_json: JSON.stringify(metafields),
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(localSchema.customers.id, customerId))
      .run();

    return {
      id: `wlist_${productId}`,
      customer_id: customerId,
      product_id: productId,
    };
  }

  /**
   * Removes an item from the wishlist.
   */
  static async removeItem(drizzleDb: any, customerId: string, productId: string) {
    const customer = await drizzleDb.select()
      .from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();
    
    if (!customer) {
      return false;
    }

    let metafields: any = {};
    if (customer.metafields_json) {
      try {
        metafields = JSON.parse(customer.metafields_json) || {};
      } catch (e) {}
    }
    if (Array.isArray(metafields.wishlist)) {
      metafields.wishlist = metafields.wishlist.filter((id: string) => id !== productId);
      await drizzleDb.update(localSchema.customers)
        .set({
          metafields_json: JSON.stringify(metafields),
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(localSchema.customers.id, customerId))
        .run();
    }

    return true;
  }

  /**
   * Merges multiple product IDs into the customer's wishlist (e.g. upon login).
   */
  static async mergeWishlist(drizzleDb: any, customerId: string, productIds: string[]) {
    if (!productIds || productIds.length === 0) return [];

    const customer = await drizzleDb.select()
      .from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    let metafields: any = {};
    if (customer.metafields_json) {
      try {
        metafields = JSON.parse(customer.metafields_json) || {};
      } catch (e) {}
    }
    if (!Array.isArray(metafields.wishlist)) {
      metafields.wishlist = [];
    }

    const current = metafields.wishlist;
    const addedItems = [];
    for (const pid of productIds) {
      if (!current.includes(pid)) {
        current.push(pid);
        addedItems.push({
          id: `wlist_${pid}`,
          customer_id: customerId,
          product_id: pid,
        });
      }
    }

    if (addedItems.length > 0) {
      await drizzleDb.update(localSchema.customers)
        .set({
          metafields_json: JSON.stringify(metafields),
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(localSchema.customers.id, customerId))
        .run();
    }

    return addedItems;
  }
}
