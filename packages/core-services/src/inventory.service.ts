import { inArray, sql, eq, and } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class InventoryService {
  /**
   * Validates inventory availability considering active soft-locks (reservations).
   * Returns valid items with names, prices, and the calculated subtotal.
   */
  static async validateAndReserveInventory(db: any, items: { variation_id: string; quantity: number }[]) {
    const validItems: { variation_id: string; quantity: number; price: number; name: string }[] = [];
    const variationIds = items.map((i) => i.variation_id);
    
    const variations = await db
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, variationIds))
      .all();

    const now = Math.floor(Date.now() / 1000);
    const allReservations = await db
      .select()
      .from(schema.inventoryReservations)
      .where(sql`product_id IN (${sql.join(variationIds, sql`, `)}) AND expires_at > ${now}`)
      .all();

    const reservationMap = new Map<string, number>();
    for (const res of allReservations) {
      reservationMap.set(res.product_id, (reservationMap.get(res.product_id) || 0) + res.quantity);
    }

    const parentIds = variations.map((v: any) => v.parent_id).filter((id: string | null) => id !== null) as string[];
    let productMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const products = await db
        .select({ id: schema.products.id, title: schema.products.title })
        .from(schema.products)
        .where(inArray(schema.products.id, parentIds))
        .all();
      productMap = new Map(products.map((p: any) => [p.id, p.title]));
    }

    let subTotal = 0; // cents

    for (const item of items) {
      const variation = variations.find((v: any) => v.id === item.variation_id);

      if (!variation || variation.is_purchasable === 0) {
        throw new Error(`Product variation ${item.variation_id} is invalid or unavailable`);
      }

      const reservedQuantity = reservationMap.get(item.variation_id) || 0;
      const availableStock = variation.stock_quantity - reservedQuantity;

      if (availableStock < item.quantity) {
        throw new Error(`Product variation ${item.variation_id} is out of stock (Available: ${availableStock})`);
      }

      const price = variation.sale_price ?? variation.regular_price;
      subTotal += price * item.quantity;

      validItems.push({
        variation_id: item.variation_id,
        quantity: item.quantity,
        price,
        name: variation.parent_id ? (productMap.get(variation.parent_id) ?? `Product ${item.variation_id.slice(0, 8)}`) : variation.title,
      });
    }

    return { validItems, subTotal };
  }

  /**
   * Generates Drizzle queries to soft-lock inventory for a specific order.
   */
  static getSoftLockQueries(db: any, orderId: string, validItems: any[]) {
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
    const queries = [];
    for (const item of validItems) {
      queries.push(
        db.insert(schema.inventoryReservations).values({
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: item.variation_id,
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
   */
  static getCommitDeductionQueries(db: any, orderId: string, items: { product_id: string; quantity: number }[]) {
    const queries = [];
    for (const item of items) {
      queries.push(
        db.update(schema.products)
          .set({ 
            stock_quantity: sql`stock_quantity - ${item.quantity}`, 
            in_stock: sql`CASE WHEN stock_quantity - ${item.quantity} > 0 THEN 1 ELSE 0 END` 
          })
          .where(
            and(
              eq(schema.products.id, item.product_id),
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
   */
  static getRestockQueries(db: any, items: { product_id: string; quantity: number }[]) {
    const queries = [];
    for (const item of items) {
      queries.push(
        db.update(schema.products)
          .set({ 
            stock_quantity: sql`stock_quantity + ${item.quantity}`, 
            in_stock: 1 
          })
          .where(eq(schema.products.id, item.product_id))
      );
    }
    return queries;
  }
}
