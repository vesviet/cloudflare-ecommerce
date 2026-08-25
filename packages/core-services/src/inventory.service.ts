import { inArray, sql, eq, and } from 'drizzle-orm';
import { schema } from '@ecommerce/database';
import { DEFAULT_LOCATION_ID } from '@ecommerce/contract';

export class InventoryService {
  /**
   * Validates inventory availability considering active soft-locks (reservations).
   *
   * I-03/I-04 FIX: Reads stock from `inventory_levels` and prices from `price_list_items`
   * (joined by price_list_id = 'pl_base') instead of the legacy `products` columns which
   * were dropped by migration 0007_cultured_thena.sql as part of the Big Bang PIM Refactor.
   *
   * Returns valid items with names, prices, and the calculated subtotal.
   */
  static async validateAndReserveInventory(
    db: any,
    items: { variation_id?: string; id?: string; quantity: number; [key: string]: any }[],
    locationId: string = DEFAULT_LOCATION_ID
  ) {
    const validItems: { variation_id: string; id: string; quantity: number; price: number; name: string }[] = [];
    const normalizedItems = (items || []).map((i) => {
      const varId = i.variation_id || i.id;
      if (!varId) {
        throw new Error('Item variation_id or id is required');
      }
      return {
        ...i,
        variation_id: varId,
        id: varId,
        quantity: i.quantity,
      };
    });
    const variationIds = normalizedItems.map((i) => i.variation_id);

    // 1. Fetch product metadata (title, is_purchasable, parent_id)
    const variations = await db
      .select({
        id: schema.products.id,
        title: schema.products.title,
        parent_id: schema.products.parent_id,
        is_purchasable: schema.products.is_purchasable,
      })
      .from(schema.products)
      .where(inArray(schema.products.id, variationIds))
      .all();

    // 2. Fetch stock from inventory_levels (source of truth post-PIM-refactor)
    // Uses the specified warehouse location (defaulting to 'loc-1')
    const inventoryRows = await db
      .select({
        product_id: schema.inventoryLevels.product_id,
        stock_quantity: schema.inventoryLevels.stock_quantity,
      })
      .from(schema.inventoryLevels)
      .where(
        and(
          inArray(schema.inventoryLevels.product_id, variationIds),
          eq(schema.inventoryLevels.location_id, locationId)
        )
      )
      .all();

    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRows) {
      // Aggregate across locations if product has multiple (sum across warehouses)
      inventoryMap.set(inv.product_id, (inventoryMap.get(inv.product_id) || 0) + inv.stock_quantity);
    }

    // 3. Fetch prices from price_list_items (base price list 'pl_base')
    const priceRows = await db
      .select({
        product_id: schema.priceListItems.product_id,
        price: schema.priceListItems.price,
      })
      .from(schema.priceListItems)
      .where(
        and(
          eq(schema.priceListItems.price_list_id, 'pl_base'),
          inArray(schema.priceListItems.product_id, variationIds)
        )
      )
      .all();

    const priceMap = new Map<string, number>();
    for (const p of priceRows) {
      priceMap.set(p.product_id, p.price);
    }

    // 4. Fetch active soft-locks (reservations) to compute real available stock
    const now = Math.floor(Date.now() / 1000);
    const allReservations = await db
      .select()
      .from(schema.inventoryReservations)
      .where(
        and(
          inArray(schema.inventoryReservations.product_id, variationIds),
          eq(schema.inventoryReservations.location_id, locationId),
          sql`expires_at > ${now}`
        )
      )
      .all();

    const reservationMap = new Map<string, number>();
    for (const res of allReservations) {
      reservationMap.set(res.product_id, (reservationMap.get(res.product_id) || 0) + res.quantity);
    }

    // 5. Resolve parent product names for variation display
    const parentIds = variations.map((v: any) => v.parent_id).filter((id: string | null) => id !== null) as string[];
    let productMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const parents = await db
        .select({ id: schema.products.id, title: schema.products.title })
        .from(schema.products)
        .where(inArray(schema.products.id, parentIds))
        .all();
      productMap = new Map(parents.map((p: any) => [p.id, p.title]));
    }

    let subTotal = 0; // cents

    for (const item of normalizedItems) {
      const variation = variations.find((v: any) => v.id === item.variation_id);

      if (!variation || variation.is_purchasable === 0) {
        throw new Error(`Product variation ${item.variation_id} is invalid or unavailable`);
      }

      // Stock check from inventory_levels (not products)
      const totalStock = inventoryMap.get(item.variation_id) ?? 0;
      const reservedQuantity = reservationMap.get(item.variation_id) || 0;
      const availableStock = totalStock - reservedQuantity;

      if (availableStock < item.quantity) {
        throw new Error(`Product variation ${item.variation_id} is out of stock (Available: ${availableStock})`);
      }

      // Price from price_list_items base list (not products.sale_price)
      const price = priceMap.get(item.variation_id);
      if (price === undefined || price === null) {
        throw new Error(`No price found for product variation ${item.variation_id} in base price list`);
      }

      subTotal += price * item.quantity;

      validItems.push({
        variation_id: item.variation_id,
        id: item.variation_id,
        quantity: item.quantity,
        price,
        name: variation.parent_id
          ? (productMap.get(variation.parent_id) ?? `Product ${item.variation_id.slice(0, 8)}`)
          : variation.title,
      });
    }

    return { validItems, subTotal };
  }

  /**
   * Generates Drizzle queries to soft-lock inventory for a specific order.
   */
  static getSoftLockQueries(db: any, orderId: string, validItems: any[], locationId: string = DEFAULT_LOCATION_ID) {
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
    const queries = [];
    for (const item of validItems) {
      queries.push(
        db.insert(schema.inventoryReservations).values({
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: item.variation_id,
          location_id: locationId,
          quantity: item.quantity,
          expires_at: expiresAt,
        })
      );
    }
    return queries;
  }

  /**
   * Generates Drizzle queries to release soft-locks (e.g., when payment fails or completes).
   */
  static getReleaseSoftLockQueries(db: any, orderId: string) {
    return [
      db.delete(schema.inventoryReservations).where(eq(schema.inventoryReservations.order_id, orderId))
    ];
  }

  /**
   * Generates Drizzle queries to hard-decrement inventory and release soft locks (Payment Success).
   *
   * I-03/I-04 FIX: Updates inventory_levels.stock_quantity (not products.stock_quantity which
   * was dropped in migration 0007). Guard against going negative via WHERE stock_quantity >= qty.
   */
  static getCommitDeductionQueries(db: any, orderId: string, items: { product_id: string; quantity: number }[], locationId: string = DEFAULT_LOCATION_ID) {
    const queries = [];
    for (const item of items) {
      queries.push(
        db.update(schema.inventoryLevels)
          .set({
            stock_quantity: sql`stock_quantity - ${item.quantity}`,
            updated_at: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(schema.inventoryLevels.product_id, item.product_id),
              eq(schema.inventoryLevels.location_id, locationId),
              sql`stock_quantity >= ${item.quantity}` // guard against going negative
            )
          )
      );
    }
    // Delete the soft locks
    queries.push(...this.getReleaseSoftLockQueries(db, orderId));
    return queries;
  }

  /**
   * Generates Drizzle queries to restock inventory (Refund / Cancel).
   *
   * I-03/I-04 FIX: Updates inventory_levels.stock_quantity (not products which no longer has this column).
   */
  static getRestockQueries(db: any, items: { product_id: string; quantity: number }[], locationId: string = DEFAULT_LOCATION_ID) {
    const queries = [];
    for (const item of items) {
      queries.push(
        db.update(schema.inventoryLevels)
          .set({
            stock_quantity: sql`stock_quantity + ${item.quantity}`,
            updated_at: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(schema.inventoryLevels.product_id, item.product_id),
              eq(schema.inventoryLevels.location_id, locationId)
            )
          )
      );
    }
    return queries;
  }

  /**
   * Verifies that all batch inventory deduction queries updated at least 1 row.
   * If any item deduction resulted in 0 rows updated (e.g. insufficient stock or row missing),
   * throws an error to trigger rollback.
   */
  static verifyDeductionResults(batchResults: any[], itemsCount: number): void {
    if (itemsCount <= 0) return;
    if (!Array.isArray(batchResults) || batchResults.length < itemsCount) {
      throw new Error('Batch results array is invalid or incomplete');
    }
    for (let i = 0; i < itemsCount; i++) {
      const res = batchResults[i];
      const changes = res?.meta?.changes ?? res?.changes ?? 0;
      if (changes === 0) {
        throw new Error(`Stock deduction failed for item at index ${i}: 0 rows updated (insufficient stock)`);
      }
    }
  }
}
