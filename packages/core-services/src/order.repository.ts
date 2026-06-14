import { eq, and, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

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
  }): Promise<void> {
    const batchQueries: any[] = [];

    batchQueries.push(
      db.insert(schema.orders).values({
        id: orderData.orderId,
        customer_id: orderData.customerId || null,
        guest_email: orderData.customerId ? null : orderData.email,
        status: 'pending_payment',
        total_amount: orderData.totalAmount,
        shipping_fee: orderData.shippingFeeCents,
        affiliate_id: orderData.affiliateId || null,
        utm_source: orderData.utmSource || null,
        utm_medium: orderData.utmMedium || null,
        utm_campaign: orderData.utmCampaign || null,
        shipping_address_json: orderData.shippingAddressJson ? JSON.stringify(orderData.shippingAddressJson) : null,
        billing_address_json: orderData.billingAddressJson ? JSON.stringify(orderData.billingAddressJson) : null,
      })
    );

    for (const item of orderData.validItems) {
      batchQueries.push(
        db.insert(schema.orderItems).values({
          id: crypto.randomUUID(),
          order_id: orderData.orderId,
          product_id: item.variation_id,
          quantity: item.quantity,
          price_at_purchase: item.price,
        })
      );
    }

    if (orderData.discountAmount > 0 && orderData.appliedCouponId) {
      batchQueries.push(
        db.insert(schema.orderDiscounts).values({
          id: crypto.randomUUID(),
          order_id: orderData.orderId,
          coupon_id: orderData.appliedCouponId,
          discount_amount: orderData.discountAmount,
        })
      );
      batchQueries.push(
        db.update(schema.coupons)
          .set({ uses: sql`uses + 1` })
          .where(eq(schema.coupons.id, orderData.appliedCouponId))
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
    const result = await db.update(schema.orders)
      .set({ status: newStatus, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, oldStatus)))
      .run();

    // In D1/SQLite via Drizzle, meta.changes gives rows affected.
    return result?.meta?.changes > 0 || result?.changes > 0 || result?.rowsAffected > 0 || (result?.success && result?.meta?.changes !== 0) ? true : false;
  }

  static async getOrderItems(db: any, orderId: string): Promise<{ product_id: string; quantity: number }[]> {
    return db.select({
      product_id: schema.orderItems.product_id,
      quantity: schema.orderItems.quantity
    })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.order_id, orderId))
    .all();
  }
}
