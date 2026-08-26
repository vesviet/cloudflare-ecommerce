import { eq, and, sql, inArray } from 'drizzle-orm';
import * as localSchema from './local-schema';

/**
 * Phase 2B — Flash Sale service (Laravel FlashSale/FlashSaleItem parity).
 *
 * Isolation rule (Laravel ADR): flash-sale pricing replaces catalog/promo
 * pricing for matched products — no further promotion stacking on those units.
 */

export interface ActiveFlashPrice {
  itemId: string;
  flashSaleId: string;
  price: number;
  endsAt: number | null;
  quota: number; // 0 = unlimited
  left: number;  // remaining units (Infinity when unlimited)
}

export class FlashSaleService {
  /** Loads active-window flash pricing keyed by product_id (best = lowest price). */
  static async getActiveFlashPricing(db: any, productIds: string[]): Promise<Map<string, ActiveFlashPrice>> {
    const map = new Map<string, ActiveFlashPrice>();
    if (!productIds || productIds.length === 0) return map;

    const nowUnix = Math.floor(Date.now() / 1000);
    const rows = await db.select({
      item_id: localSchema.flashSaleItems.id,
      product_id: localSchema.flashSaleItems.product_id,
      price: localSchema.flashSaleItems.price,
      quota: localSchema.flashSaleItems.quota,
      sold_quantity: localSchema.flashSaleItems.sold_quantity,
      sale_starts_at: localSchema.flashSales.starts_at,
      sale_ends_at: localSchema.flashSales.ends_at,
    })
      .from(localSchema.flashSaleItems)
      .innerJoin(localSchema.flashSales, eq(localSchema.flashSaleItems.flash_sale_id, localSchema.flashSales.id))
      .where(and(
        inArray(localSchema.flashSaleItems.product_id, productIds),
        eq(localSchema.flashSales.status, 'active')
      ))
      .all();

    for (const raw of rows) {
      const row = raw as any;
      if (row.sale_starts_at && nowUnix < row.sale_starts_at) continue;
      if (row.sale_ends_at && nowUnix > row.sale_ends_at) continue;

      const quota = Number(row.quota || 0);
      const left = quota > 0 ? Math.max(0, quota - Number(row.sold_quantity || 0)) : Number.POSITIVE_INFINITY;
      const candidate: ActiveFlashPrice = {
        itemId: row.item_id,
        flashSaleId: row.flash_sale_id ?? '',
        price: Number(row.price),
        endsAt: row.sale_ends_at ?? null,
        quota,
        left,
      };

      const existing = map.get(row.product_id);
      // Sold-out entries still surface (for countdown/sold-out UI) but a lower
      // price wins when several sales overlap.
      if (!existing || candidate.price < existing.price) {
        map.set(row.product_id, candidate);
      }
    }
    return map;
  }

  /**
   * Atomically locks flash quota BEFORE order creation (guarded increment).
   * Throws when any line cannot be satisfied so checkout aborts cleanly.
   */
  static async lockQuota(db: any, locks: Array<{ itemId: string; quantity: number }>): Promise<void> {
    for (const lock of locks) {
      if (lock.quantity <= 0) continue;
      const result = await db
        .update(localSchema.flashSaleItems)
        .set({ sold_quantity: sql`${localSchema.flashSaleItems.sold_quantity} + ${lock.quantity}` })
        .where(and(
          eq(localSchema.flashSaleItems.id, lock.itemId),
          sql`(${localSchema.flashSaleItems.quota} = 0 OR ${localSchema.flashSaleItems.sold_quantity} + ${lock.quantity} <= ${localSchema.flashSaleItems.quota})`
        ))
        .run();

      const affected = (result as any)?.meta?.changes ?? (result as any)?.changes ?? 0;
      if (affected === 0) {
        throw new Error('Flash sale quota exhausted for one or more items');
      }
    }
  }

  /**
   * Releases quota for cancelled/refunded orders. Floor at zero to stay
   * idempotent under double-invocation.
   */
  static async releaseQuotaForOrder(db: any, orderId: string): Promise<void> {
    const items = await db.select({
      flash_sale_item_id: localSchema.orderItems.flash_sale_item_id,
      quantity: localSchema.orderItems.quantity,
    })
      .from(localSchema.orderItems)
      .where(and(
        eq(localSchema.orderItems.order_id, orderId),
        sql`${localSchema.orderItems.flash_sale_item_id} IS NOT NULL`
      ))
      .all();

    for (const item of items) {
      if (!item.flash_sale_item_id) continue;
      await db
        .update(localSchema.flashSaleItems)
        .set({
          sold_quantity: sql`max(0, ${localSchema.flashSaleItems.sold_quantity} - ${item.quantity})`,
        })
        .where(eq(localSchema.flashSaleItems.id, item.flash_sale_item_id))
        .run();
    }
  }

  /** Public storefront payload: active sale meta + items with countdown fields. */
  static async getActiveFlashSalePublic(db: any): Promise<any | null> {
    const nowUnix = Math.floor(Date.now() / 1000);
    const sales = await db.select()
      .from(localSchema.flashSales)
      .where(eq(localSchema.flashSales.status, 'active'))
      .all();

    const active = sales
      .filter((s: any) => (!s.starts_at || nowUnix >= s.starts_at) && (!s.ends_at || nowUnix <= s.ends_at))
      .sort((a: any, b: any) => (a.starts_at || 0) - (b.starts_at || 0))[0];
    if (!active) return null;

    const items = await db.select({
      item_id: localSchema.flashSaleItems.id,
      product_id: localSchema.flashSaleItems.product_id,
      title: localSchema.products.title,
      slug: localSchema.products.slug,
      image: localSchema.products.attributes_json,
      price: localSchema.flashSaleItems.price,
      quota: localSchema.flashSaleItems.quota,
      sold_quantity: localSchema.flashSaleItems.sold_quantity,
    })
      .from(localSchema.flashSaleItems)
      .leftJoin(localSchema.products, eq(localSchema.flashSaleItems.product_id, localSchema.products.id))
      .where(eq(localSchema.flashSaleItems.flash_sale_id, active.id))
      .all();

    return {
      id: active.id,
      name: active.name,
      starts_at: active.starts_at,
      ends_at: active.ends_at,
      items: items.map((i: any) => ({
        ...i,
        left: i.quota > 0 ? Math.max(0, i.quota - i.sold_quantity) : null,
        sold_out: i.quota > 0 && i.sold_quantity >= i.quota,
      })),
    };
  }
}
