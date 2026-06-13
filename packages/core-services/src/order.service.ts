import { eq, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class OrderService {
  /**
   * Generates Drizzle queries to advance order state.
   */
  static getAdvanceOrderStatusQueries(db: any, orderId: string, newStatus: string) {
    return [
      db.update(schema.orders)
        .set({ status: newStatus, updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.orders.id, orderId))
    ];
  }

  /**
   * Generates Drizzle queries to create an initial order.
   */
  static getCreateOrderQueries(db: any, orderData: {
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
  }) {
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

    return batchQueries;
  }

  /**
   * Generates Drizzle queries to update customer attribution if needed.
   */
  static getUpdateCustomerAttributionQueries(db: any, customer: any, customerId: string, utmSource?: string, utmMedium?: string, utmCampaign?: string, affiliateId?: string, acceptsMarketing?: boolean) {
    const queries = [];
    if (customer) {
      const shouldUpdateAttribution =
        !customer.signup_utm_source &&
        !customer.signup_utm_medium &&
        !customer.signup_utm_campaign &&
        !customer.signup_affiliate_id;

      if (shouldUpdateAttribution && (utmSource || utmMedium || utmCampaign || affiliateId)) {
        queries.push(
          db.update(schema.customers)
            .set({
              signup_utm_source: utmSource || null,
              signup_utm_medium: utmMedium || null,
              signup_utm_campaign: utmCampaign || null,
              signup_affiliate_id: affiliateId || null,
            })
            .where(eq(schema.customers.id, customerId))
        );
      }

      if (acceptsMarketing !== undefined) {
        queries.push(
          db.update(schema.customers)
            .set({ accepts_marketing: acceptsMarketing ? 1 : 0 })
            .where(eq(schema.customers.id, customerId))
        );
      }
    }
    return queries;
  }

  /**
   * Logic for fulfilling an order (or partial). 
   * Returns queries to execute and boolean if fully fulfilled.
   */
  static async prepareFulfillment(db: any, orderId: string, trackingNumber: string, carrierName: string, requestItems?: { order_item_id: string; quantity: number }[]) {
    const orderItems = await db.select().from(schema.orderItems).where(eq(schema.orderItems.order_id, orderId)).all();
    const itemsToFulfill = requestItems || orderItems.map((i: any) => ({ order_item_id: i.id, quantity: i.quantity }));

    const fulfillmentId = crypto.randomUUID();
    const queries = [];

    queries.push(
      db.insert(schema.fulfillments).values({
        id: fulfillmentId,
        order_id: orderId,
        status: 'shipped',
        tracking_number: trackingNumber,
        carrier: carrierName,
        shipped_at: new Date().toISOString(),
      })
    );

    const fulfillmentItemsRecords = itemsToFulfill.map((i: any) => ({
      id: crypto.randomUUID(),
      fulfillment_id: fulfillmentId,
      order_item_id: i.order_item_id,
      quantity: i.quantity,
    }));
    
    queries.push(db.insert(schema.fulfillmentItems).values(fulfillmentItemsRecords));

    let isFullyFulfilled = false;
    if (!requestItems) {
      isFullyFulfilled = true;
    } else {
      const allFulfillments = await db.select({
        order_item_id: schema.fulfillmentItems.order_item_id,
        quantity: schema.fulfillmentItems.quantity
      })
      .from(schema.fulfillmentItems)
      .innerJoin(schema.fulfillments, eq(schema.fulfillments.id, schema.fulfillmentItems.fulfillment_id))
      .where(eq(schema.fulfillments.order_id, orderId))
      .all();
      
      const fulfilledMap = new Map<string, number>();
      allFulfillments.forEach((f: any) => {
        fulfilledMap.set(f.order_item_id, (fulfilledMap.get(f.order_item_id) || 0) + f.quantity);
      });
      
      isFullyFulfilled = orderItems.every((oi: any) => (fulfilledMap.get(oi.id) || 0) >= oi.quantity);
    }

    if (isFullyFulfilled) {
      queries.push(
        db.update(schema.orders)
          .set({ 
            status: 'completed', 
            tracking_number: trackingNumber, 
            carrier_name: carrierName,
            updated_at: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(schema.orders.id, orderId))
      );
    }

    return { queries, isFullyFulfilled };
  }
}
