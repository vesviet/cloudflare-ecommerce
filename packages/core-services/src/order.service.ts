import { OrderRepository } from './order.repository';
import { InventoryRepository } from './inventory.repository';
import { and, or, isNull, sql as drizzleSql, eq } from 'drizzle-orm';
import * as localSchema from './local-schema';
import { LoyaltyService } from './loyalty.service';

export class OrderService {
  /**
   * Two-Phase Commit Orchestrator for processing a new checkout.
   * Phase 0: Atomic coupon lock (before any order creation)
   * Phase 1: Create Order in 'pending_payment'
   * Phase 2: Atomic Inventory Deduction
   */
  static async processCheckout(drizzleDb: any, rawD1Db: any, orderData: {
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
    loyaltyPointsApplied?: number;
    locationId?: string;
  }): Promise<{ success: boolean; message?: string }> {
    // I-05 FIX: Phase 0 — Atomic coupon lock BEFORE order creation.
    // Prevents concurrent checkout race where N users all pass validation then all increment uses.
    if (orderData.appliedCouponId) {
      const couponResult = await drizzleDb
        .update(localSchema.promotions)
        .set({ times_used: drizzleSql`times_used + 1` })
        .where(
          and(
            eq(localSchema.promotions.id, orderData.appliedCouponId),
            or(
              isNull(localSchema.promotions.usage_limit),
              // times_used < usage_limit: atomic guard at DB level
              drizzleSql`${localSchema.promotions.times_used} < ${localSchema.promotions.usage_limit}`
            )
          )
        )
        .run();

      const affected = couponResult?.meta?.changes ?? couponResult?.changes ?? 0;
      if (affected === 0) {
        throw new Error('Coupon usage limit reached or coupon is no longer valid');
      }
    }

    // Phase 1: Create Order in 'pending_payment'
    await OrderRepository.createOrder(drizzleDb, orderData);

    // Phase 1.5: Lock Loyalty Points (redeem)
    if (orderData.loyaltyPointsApplied && orderData.loyaltyPointsApplied > 0 && orderData.customerId) {
      await LoyaltyService.redeemPoints(drizzleDb, orderData.customerId, orderData.orderId, orderData.loyaltyPointsApplied);
    }

    // Phase 2: Atomic Inventory Deduction
    const itemsToDeduct = orderData.validItems.map(i => ({
      productId: i.variation_id || i.id || i.productId,
      quantity: i.quantity
    }));
    const locationId = orderData.locationId || 'loc-1';
    const deductionSuccess = await InventoryRepository.deductStock(rawD1Db, itemsToDeduct, locationId);

    if (!deductionSuccess) {
      // Phase 3 (Rollback): Mark Order as Failed
      await OrderRepository.updateOrderStatus(drizzleDb, orderData.orderId, 'pending_payment', 'failed');
      
      // Phase 3.5 (Rollback): Refund Loyalty Points
      if (orderData.loyaltyPointsApplied && orderData.loyaltyPointsApplied > 0 && orderData.customerId) {
        await LoyaltyService.refundPoints(drizzleDb, orderData.customerId, orderData.orderId, orderData.loyaltyPointsApplied);
      }
      
      throw new Error('Out of stock or inventory lock failed');
    }

    return { success: true };
  }

  /**
   * Cancels an unpaid order and restocks inventory via Optimistic Lock.
   */
  static async cancelOrderAndRestock(drizzleDb: any, rawD1Db: any, orderId: string): Promise<boolean> {
    const orderRecord = await drizzleDb.select({
        status: localSchema.orders.status,
        location_id: localSchema.orders.location_id,
        applied_promotions_json: localSchema.orders.applied_promotions_json
      })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();

    if (!orderRecord) {
      return false;
    }

    let shouldRestock = false;

    // Telesale/COD orders may sit in pending/confirmed/processing before fulfilment.
    // Laravel baseline (CancelOrderAction): cancellable until shipped.
    const CANCELLABLE_STATUSES = ['pending_payment', 'pending', 'confirmed', 'processing'];
    if (orderRecord.status && CANCELLABLE_STATUSES.includes(orderRecord.status)) {
      const lockedAndUpdated = await OrderRepository.updateOrderStatus(drizzleDb, orderId, orderRecord.status, 'cancelled');
      if (lockedAndUpdated) {
        shouldRestock = true;
      }
    } else if (orderRecord.status === 'cancelled') {
      const alreadyRestocked = await drizzleDb.select()
        .from(localSchema.auditLogs)
        .where(
          and(
            eq(localSchema.auditLogs.entity_id, orderId),
            eq(localSchema.auditLogs.action, 'order_restocked')
          )
        )
        .get();
      if (!alreadyRestocked) {
        shouldRestock = true;
      }
    }

    if (shouldRestock) {
      const locationId = orderRecord.location_id || 'loc-1';
      const items = await OrderRepository.getOrderItems(drizzleDb, orderId);
      const itemsToRestock = items.map(i => ({ productId: i.product_id, quantity: i.quantity }));
      await InventoryRepository.restock(rawD1Db, itemsToRestock, locationId);

      await drizzleDb.insert(localSchema.auditLogs).values({
        id: crypto.randomUUID(),
        action: 'order_restocked',
        entity_type: 'order',
        entity_id: orderId,
        payload_json: JSON.stringify({ order_id: orderId, status: 'cancelled' })
      }).run();

      const ledgerEntry = await drizzleDb.select()
        .from(localSchema.loyaltyLedgers)
        .where(
          and(
            eq(localSchema.loyaltyLedgers.order_id, orderId),
            eq(localSchema.loyaltyLedgers.transaction_type, 'redeemed')
          )
        )
        .get();
      if (ledgerEntry) {
        await LoyaltyService.refundPoints(drizzleDb, ledgerEntry.customer_id, orderId, Math.abs(ledgerEntry.points));
      }

      if (orderRecord.applied_promotions_json) {
        try {
          const promotions = JSON.parse(orderRecord.applied_promotions_json);
          if (Array.isArray(promotions) && promotions.length > 0) {
            const firstPromo = promotions[0];
            const couponId = firstPromo.coupon_id || firstPromo.id;
            if (couponId) {
              await drizzleDb.update(localSchema.promotions)
                .set({ times_used: drizzleSql`times_used - 1` })
                .where(and(eq(localSchema.promotions.id, couponId), drizzleSql`times_used > 0`))
                .run();
              console.log(`[Coupon Revert] Reverted coupon ${couponId} for order ${orderId}`);
            }
          }
        } catch (e) {
          console.error('Failed to parse applied_promotions_json for reversion', e);
        }
      }

      return true;
    }

    return false;
  }

  static async refundOrderAndRestock(drizzleDb: any, rawD1Db: any, orderId: string, oldStatus: string): Promise<boolean> {
    const orderRecord = await drizzleDb.select({
        status: localSchema.orders.status,
        location_id: localSchema.orders.location_id,
        applied_promotions_json: localSchema.orders.applied_promotions_json
      })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();

    if (!orderRecord) {
      return false;
    }

    let shouldRestock = false;

    // Route guard allows refunds from processing/shipped/completed; the shipped
    // case must restock too or the route would 500 on the silent lock failure.
    if (['pending_payment', 'processing', 'shipped', 'completed'].includes(orderRecord.status || '')) {
      const lockedAndUpdated = await OrderRepository.updateOrderStatus(drizzleDb, orderId, orderRecord.status as string, 'refunded');
      if (lockedAndUpdated) {
        shouldRestock = true;
      }
    } else if (orderRecord.status === 'refunded') {
      const alreadyRestocked = await drizzleDb.select()
        .from(localSchema.auditLogs)
        .where(
          and(
            eq(localSchema.auditLogs.entity_id, orderId),
            eq(localSchema.auditLogs.action, 'order_restocked')
          )
        )
        .get();
      if (!alreadyRestocked) {
        shouldRestock = true;
      }
    }

    if (shouldRestock) {
      const locationId = orderRecord.location_id || 'loc-1';
      const items = await OrderRepository.getOrderItems(drizzleDb, orderId);
      const itemsToRestock = items.map(i => ({ productId: i.product_id, quantity: i.quantity }));
      await InventoryRepository.restock(rawD1Db, itemsToRestock, locationId);

      await drizzleDb.insert(localSchema.auditLogs).values({
        id: crypto.randomUUID(),
        action: 'order_restocked',
        entity_type: 'order',
        entity_id: orderId,
        payload_json: JSON.stringify({ order_id: orderId, status: 'refunded' })
      }).run();

      const ledgerEntry = await drizzleDb.select()
        .from(localSchema.loyaltyLedgers)
        .where(
          and(
            eq(localSchema.loyaltyLedgers.order_id, orderId),
            eq(localSchema.loyaltyLedgers.transaction_type, 'redeemed')
          )
        )
        .get();
      if (ledgerEntry) {
        await LoyaltyService.refundPoints(drizzleDb, ledgerEntry.customer_id, orderId, Math.abs(ledgerEntry.points));
      }

      if (orderRecord.applied_promotions_json) {
        try {
          const promotions = JSON.parse(orderRecord.applied_promotions_json);
          if (Array.isArray(promotions) && promotions.length > 0) {
            const firstPromo = promotions[0];
            const couponId = firstPromo.coupon_id || firstPromo.id;
            if (couponId) {
              await drizzleDb.update(localSchema.promotions)
                .set({ times_used: drizzleSql`times_used - 1` })
                .where(and(eq(localSchema.promotions.id, couponId), drizzleSql`times_used > 0`))
                .run();
              console.log(`[Coupon Revert] Reverted coupon ${couponId} for order ${orderId}`);
            }
          }
        } catch (e) {
          console.error('Failed to parse applied_promotions_json for reversion', e);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Marks a pending order as processing after successful payment via Optimistic Lock.
   */
  static async processPaymentSuccess(drizzleDb: any, orderId: string): Promise<boolean> {
    return OrderRepository.updateOrderStatus(drizzleDb, orderId, 'pending_payment', 'processing');
  }

  /**
   * Marks a shipped order as completed after Carrier webhook.
   */
  static async completeOrder(drizzleDb: any, orderId: string): Promise<boolean> {
    return OrderRepository.updateOrderStatus(drizzleDb, orderId, 'shipped', 'completed');
  }

  static getUpdateCustomerAttributionQueries(
    db: any,
    customer: any,
    customerId: string,
    utmSource?: string,
    utmMedium?: string,
    utmCampaign?: string,
    affiliateId?: string,
    acceptsMarketing?: boolean
  ): any[] {
    if (!customerId) return [];
    const updates: any = {};
    if (utmSource && (!customer || !customer.signup_utm_source)) updates.signup_utm_source = utmSource;
    if (utmMedium && (!customer || !customer.signup_utm_medium)) updates.signup_utm_medium = utmMedium;
    if (utmCampaign && (!customer || !customer.signup_utm_campaign)) updates.signup_utm_campaign = utmCampaign;
    if (affiliateId && (!customer || !customer.signup_affiliate_id)) updates.signup_affiliate_id = affiliateId;
    if (acceptsMarketing !== undefined) {
      updates.accepts_marketing = acceptsMarketing ? 1 : 0;
      updates.accepts_marketing_updated_at = new Date().toISOString();
    }
    if (Object.keys(updates).length > 0) {
      return [
        db.update(localSchema.customers)
          .set(updates)
          .where(eq(localSchema.customers.id, customerId))
      ];
    }
    return [];
  }

  /**
   * T1.2: Guest order tracking — matches the order id against the guest email
   * OR the owning customer's email. Returns a sanitized public projection or
   * null so callers can emit one generic "not found" response.
   */
  static async findTrackableOrder(drizzleDb: any, orderId: string, email: string): Promise<any | null> {
    const normalized = email.trim().toLowerCase();
    const order = await drizzleDb.select({
      id: localSchema.orders.id,
      status: localSchema.orders.status,
      created_at: localSchema.orders.created_at,
      updated_at: localSchema.orders.updated_at,
      shipping_fee: localSchema.orders.shipping_fee,
      discount_amount: localSchema.orders.discount_amount,
      total_amount: localSchema.orders.total_amount,
    })
      .from(localSchema.orders)
      .leftJoin(localSchema.customers, eq(localSchema.orders.customer_id, localSchema.customers.id))
      .where(and(
        eq(localSchema.orders.id, orderId),
        or(
          drizzleSql`lower(${localSchema.orders.guest_email}) = ${normalized}`,
          drizzleSql`lower(coalesce(${localSchema.customers.email}, '')) = ${normalized}`
        )
      ))
      .get();

    if (!order) return null;
    return this.attachPublicItems(drizzleDb, order);
  }

  /**
   * T1.4: Receipt view for a signed order-receipt token (already verified by
   * the caller). Same sanitized projection as guest tracking.
   */
  static async getPublicOrderById(drizzleDb: any, orderId: string): Promise<any | null> {
    const order = await drizzleDb.select({
      id: localSchema.orders.id,
      status: localSchema.orders.status,
      created_at: localSchema.orders.created_at,
      updated_at: localSchema.orders.updated_at,
      shipping_fee: localSchema.orders.shipping_fee,
      discount_amount: localSchema.orders.discount_amount,
      total_amount: localSchema.orders.total_amount,
    })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();

    if (!order) return null;
    return this.attachPublicItems(drizzleDb, order);
  }

  private static async attachPublicItems(drizzleDb: any, order: any): Promise<any> {
    const items = await drizzleDb.select({
      product_id: localSchema.orderItems.product_id,
      quantity: localSchema.orderItems.quantity,
      price_at_purchase: localSchema.orderItems.price_at_purchase,
      sku: localSchema.products.sku,
      title: localSchema.products.title,
    })
      .from(localSchema.orderItems)
      .leftJoin(localSchema.products, eq(localSchema.orderItems.product_id, localSchema.products.id))
      .where(eq(localSchema.orderItems.order_id, order.id))
      .all();

    return { ...order, items };
  }
}
