import { eq, and, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';

export class OrderRepository {
  /**
   * Creates an order with status 'pending_payment'.
   * This is safe and does not modify inventory.
   */
  static async createOrder(db: any, orderData: {
    orderId: string;
    customerId?: string;
    email?: string;
    totalAmount: number;
    shippingFeeCents: number;
    affiliateId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    shippingAddressJson?: any;
    billingAddressJson?: any;
    validItems: any[];
    discountAmount: number;
    appliedCouponId?: string | null;
    taxAmountCents?: number;
    taxLinesJson?: any;
    shippingLinesJson?: any;
    locationId?: string;
  }): Promise<void> {
    const batchQueries: any[] = [];

    batchQueries.push(
      db.insert(localSchema.orders).values({
        id: orderData.orderId,
        customer_id: orderData.customerId || null,
        guest_email: orderData.customerId ? null : orderData.email,
        status: 'pending_payment',
        location_id: orderData.locationId || null,
        total_amount: orderData.totalAmount,
        shipping_fee: orderData.shippingFeeCents,
        affiliate_id: orderData.affiliateId || null,
        utm_source: orderData.utmSource || null,
        utm_medium: orderData.utmMedium || null,
        utm_campaign: orderData.utmCampaign || null,
        shipping_address_json: orderData.shippingAddressJson ? JSON.stringify(orderData.shippingAddressJson) : null,
        billing_address_json: orderData.billingAddressJson ? JSON.stringify(orderData.billingAddressJson) : null,
        discount_amount: orderData.discountAmount || 0,
        tax_amount: orderData.taxAmountCents || 0,
        applied_promotions_json: orderData.appliedCouponId ? JSON.stringify([{
          coupon_id: orderData.appliedCouponId,
          discount_amount: orderData.discountAmount || 0,
        }]) : '[]',
        shipping_lines_json: orderData.shippingLinesJson ? JSON.stringify(orderData.shippingLinesJson) : null,
        tax_lines_json: orderData.taxLinesJson ? JSON.stringify(orderData.taxLinesJson) : null,
      })
    );

    for (const item of orderData.validItems) {
      const flashFields: Record<string, unknown> = {};
      if (item._isFlashSale) {
        flashFields.is_flash_sale = 1;
        flashFields.flash_sale_item_id = item._flashSaleItemId || null;
      }
      batchQueries.push(
        db.insert(localSchema.orderItems).values({
          id: crypto.randomUUID(),
          order_id: orderData.orderId,
          product_id: item.variation_id || item.id || item.productId,
          quantity: item.quantity,
          price_at_purchase: item.price,
          ...flashFields,
        })
      );
    }

    await db.batch(batchQueries);
  }

  /**
   * Optimistic Concurrency Update.
   * Returns true if status was updated successfully.
   * Returns false if status was already changed (e.g. race condition between webhook and cron).
   */
  static async updateOrderStatus(db: any, orderId: string, oldStatus: string, newStatus: string): Promise<boolean> {
    const result = await db.update(localSchema.orders)
      .set({ status: newStatus, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(localSchema.orders.id, orderId), eq(localSchema.orders.status, oldStatus)))
      .run();

    // In D1/SQLite via Drizzle, meta.changes gives rows affected.
    return result?.meta?.changes > 0 || result?.changes > 0 || result?.rowsAffected > 0 || (result?.success && result?.meta?.changes !== 0) ? true : false;
  }

  static async getOrderItems(db: any, orderId: string): Promise<{ product_id: string; quantity: number }[]> {
    return db.select({
      product_id: localSchema.orderItems.product_id,
      quantity: localSchema.orderItems.quantity
    })
    .from(localSchema.orderItems)
    .where(eq(localSchema.orderItems.order_id, orderId))
    .all();
  }
}

