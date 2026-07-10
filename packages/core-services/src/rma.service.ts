import { eq, and, ne, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';
import Stripe from 'stripe';
import { OrderService } from './order.service';

export interface ReturnRequestPayload {
  drizzleDb: any;
  rawD1Db: any;
  orderId: string;
  customerId: string;
  reason: string;
  stripeSecretKey?: string;
  waitUntil?: (promise: Promise<any>) => void;
}

export class RmaService {
  /**
   * Orchestrates the creation of a return request, executes auto-approval logic,
   * inserts returns & return_items, and schedules async payment refunds if eligible.
   */
  static async createReturnRequest(payload: ReturnRequestPayload) {
    const { drizzleDb, rawD1Db, orderId, customerId, reason, stripeSecretKey, waitUntil } = payload;

    // 1. Validate order existence and customer ownership
    const order = await drizzleDb.select().from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
      
    if (!order || order.customer_id !== customerId) {
      throw new Error('Order not found or access denied');
    }

    // 2. Unified Order Status Validation (accepts completed or delivered)
    if (order.status !== 'completed' && order.status !== 'delivered') {
      throw new Error('Can only request RMA for completed or delivered orders');
    }

    // 3. Prevent duplicate active return requests
    const existingReturn = await drizzleDb.select().from(localSchema.returns)
      .where(and(eq(localSchema.returns.order_id, orderId), ne(localSchema.returns.status, 'rejected')))
      .get();
      
    if (existingReturn) {
      throw new Error('A return request already exists for this order');
    }

    // 4. Auto-approve logic: check order amount threshold (< 500,000 cents/VND) or VIP tags
    let status = 'requested';
    let isVip = false;
    const customer = await drizzleDb.select().from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();
    
    if (customer && customer.tags_json) {
      try {
        const tags = JSON.parse(customer.tags_json);
        if (tags.includes('VIP')) isVip = true;
      } catch { /* ignore parsing exceptions */ }
    }

    if (customer && customer.loyalty_points_balance !== undefined) {
      // If balance check is needed or VIP tag check
    }

    const AUTO_APPROVE_THRESHOLD = 500000;
    if (order.total_amount < AUTO_APPROVE_THRESHOLD || isVip) {
      status = 'approved';
    }

    const returnId = `rma_${crypto.randomUUID()}`;

    // Insert into returns table
    await drizzleDb.insert(localSchema.returns).values({
      id: returnId,
      order_id: orderId,
      customer_id: customerId,
      status,
      reason,
      refund_amount: order.total_amount,
    }).run();

    // 6. Handle Stripe Refund synchronously or asynchronously
    if (status === 'approved') {
      const refundPromise = (async () => {
        try {
          let gatewayRefundId: string | null = null;
          if (order.payment_intent_id && stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
            
            // Format payment intent id if it is a checkout session reference
            let paymentIntentId = order.payment_intent_id;
            if (paymentIntentId.startsWith('cs_')) {
              const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
              paymentIntentId = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || paymentIntentId;
            }

            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
            });
            gatewayRefundId = refund.id;
          }

          // Insert into refunds table
          const refundId = `ref_${crypto.randomUUID()}`;
          await drizzleDb.insert(localSchema.refunds).values({
            id: refundId,
            order_id: orderId,
            return_id: returnId,
            amount: order.total_amount,
            status: 'completed',
            gateway_refund_id: gatewayRefundId,
          }).run();

          // Restock inventory and mark order status to refunded
          await OrderService.refundOrderAndRestock(drizzleDb, rawD1Db, orderId, order.status);

          // Update return status to 'refunded'
          await drizzleDb.update(localSchema.returns)
            .set({ status: 'refunded', updated_at: sql`CURRENT_TIMESTAMP` })
            .where(eq(localSchema.returns.id, returnId))
            .run();

        } catch (stripeErr: any) {
          console.error('[RMA Auto-refund] Async Stripe Refund failed:', stripeErr.message);
        }
      })();

      if (waitUntil) {
        waitUntil(refundPromise);
      } else {
        await refundPromise;
      }
    }

    return { returnId, status };
  }

  /**
   * Admin-facing method to process pending returns (approval or rejection)
   */
  static async processRMA(drizzleDb: any, rawD1Db: any, returnId: string, action: 'approve' | 'reject', stripeSecretKey?: string) {
    const returnReq = await drizzleDb.select().from(localSchema.returns)
      .where(eq(localSchema.returns.id, returnId))
      .get();

    if (!returnReq || returnReq.status !== 'requested') {
      throw new Error('Invalid return request or already processed');
    }

    if (action === 'reject') {
      await drizzleDb.update(localSchema.returns)
        .set({ status: 'rejected', updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(localSchema.returns.id, returnId))
        .run();
      return { success: true, status: 'rejected' };
    }

    // Process approval
    const order = await drizzleDb.select().from(localSchema.orders)
      .where(eq(localSchema.orders.id, returnReq.order_id))
      .get();

    if (!order) {
      throw new Error('Associated order not found');
    }

    let gatewayRefundId: string | null = null;
    if (order.payment_intent_id && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
        
        let paymentIntentId = order.payment_intent_id;
        if (paymentIntentId.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
          paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || paymentIntentId;
        }

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        gatewayRefundId = refund.id;
      } catch (e: any) {
        throw new Error(`Refund processing failed: ${e.message}`);
      }
    }

    // Insert into refunds table
    const refundId = `ref_${crypto.randomUUID()}`;
    await drizzleDb.insert(localSchema.refunds).values({
      id: refundId,
      order_id: returnReq.order_id,
      return_id: returnId,
      amount: order.total_amount,
      status: 'completed',
      gateway_refund_id: gatewayRefundId,
    }).run();

    // Update return status to refunded
    await drizzleDb.update(localSchema.returns)
      .set({ status: 'refunded', updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(localSchema.returns.id, returnId))
      .run();

    // Perform restoration of order and inventory restocking
    await OrderService.refundOrderAndRestock(drizzleDb, rawD1Db, returnReq.order_id, order.status);

    return { success: true, status: 'refunded' };
  }
}
