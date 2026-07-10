import { eq, sql } from 'drizzle-orm'
import { schema } from '@ecommerce/database'
import { OrderService, LoyaltyService, PaymentService } from '@ecommerce/core-services'
import Stripe from 'stripe'

export class WebhookProcessor {
  static async processStripeWebhook(db: any, env: any, event: Stripe.Event) {
    const insertResult = await db
      .insert(schema.idempotencyKeys)
      .values({
        id: event.id,
        event_type: event.type,
        // Set expires_at for TTL-based cleanup (90 days)
        expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 3600),
      })
      .onConflictDoNothing()

    const changes = (insertResult as any)?.meta?.changes ?? (insertResult as any)?.changes
    if (changes === 0) {
      console.log(`[Queue] Stripe Webhook: Duplicate event ${event.id} (${event.type}) — already processed, skipping`)
      return
    }

    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const eventObject = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent

      let order: any = null
      const metadataOrderId = (eventObject as any)?.metadata?.order_id
      if (metadataOrderId) {
        order = await db.select().from(schema.orders).where(eq(schema.orders.id, metadataOrderId)).get()
      }

      if (!order) {
        const sessionId = eventObject.id
        order = await db.select().from(schema.orders).where(eq(schema.orders.session_id, sessionId)).get()
                ?? await db.select().from(schema.orders).where(eq(schema.orders.payment_intent_id, sessionId)).get()
      }

      if (order && order.status === 'cancelled') {
        const paymentIntentId = eventObject.object === 'payment_intent'
          ? eventObject.id
          : (typeof (eventObject as any).payment_intent === 'string'
              ? (eventObject as any).payment_intent
              : (eventObject as any).payment_intent?.id)

        await db.insert(schema.auditLogs).values({
          id: crypto.randomUUID(),
          action: 'late_payment_refund_triggered',
          entity_type: 'order',
          entity_id: order.id,
          payload_json: JSON.stringify({
            stripe_event_id: event.id,
            order_id: order.id,
            payment_intent_id: paymentIntentId,
            reason: 'Late payment received on cancelled order'
          })
        }).run()

        if (paymentIntentId) {
          try {
            await PaymentService.processRefund(env.STRIPE_SECRET_KEY, paymentIntentId)
          } catch (refundErr: any) {
            console.error(`[Queue] Failed to process automatic refund for order ${order.id}:`, refundErr.message)
          }
        }
      }

      if (order && order.status === 'pending_payment') {
        const success = await OrderService.processPaymentSuccess(db, order.id)

        if (success) {
          let paymentIntentId: string | null = null;
          if (event.type === 'payment_intent.succeeded') {
            paymentIntentId = event.data.object.id;
          } else if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            paymentIntentId = typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id || null);
          }

          if (paymentIntentId && !order.payment_intent_id) {
            await db.update(schema.orders)
              .set({ payment_intent_id: paymentIntentId })
              .where(eq(schema.orders.id, order.id));
          }

          await db.insert(schema.auditLogs).values({
            id: crypto.randomUUID(), action: 'stripe_webhook_success',
            entity_type: 'order',
            entity_id: order.id,
            payload_json: JSON.stringify({ stripe_event_id: event.id, order_id: order.id, status: 'processing' })
          }).run()

          if (env.EVENT_QUEUE) {
            await env.EVENT_QUEUE.send({
              type: 'ORDER_SUCCESS',
              orderId: order.id,
              emailEvent: 'order_confirmation',
            })

            if (order.affiliate_id) {
              await env.EVENT_QUEUE.send({
                type: 'AFFILIATE_COMMISSION',
                orderId: order.id,
                affiliateId: order.affiliate_id,
                totalAmount: order.total_amount,
              })
            }
            
            if (order.customer_id) {
              await LoyaltyService.earnPoints(db, order.customer_id, order.id, order.total_amount);
            }
          }
        }
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const eventObject = event.data.object as Stripe.Checkout.Session

      let order: any = null
      const metadataOrderId = (eventObject as any)?.metadata?.order_id
      if (metadataOrderId) {
        order = await db.select().from(schema.orders).where(eq(schema.orders.id, metadataOrderId)).get()
      }

      if (!order) {
        const sessionId = eventObject.id
        order = await db.select().from(schema.orders).where(eq(schema.orders.session_id, sessionId)).get()
      }

      if (order && order.status === 'pending_payment') {
        console.log(`[Queue] Session expired for order ${order.id}. Enqueueing restock...`)
        if (env.EVENT_QUEUE) {
          await env.EVENT_QUEUE.send({ type: 'CANCEL_AND_RESTOCK', orderId: order.id })
            .catch((qErr: any) => console.error(`[Queue] Failed to enqueue CANCEL_AND_RESTOCK for ${order.id}:`, qErr.message))
        } else {
          // Fallback if no queue
          await OrderService.cancelOrderAndRestock(db, env, order.id)
        }

        await db.insert(schema.auditLogs).values({
          id: crypto.randomUUID(), action: 'stripe_webhook_expired',
          entity_type: 'order',
          entity_id: order.id,
          payload_json: JSON.stringify({ stripe_event_id: event.id, order_id: order.id, status: 'cancelled' })
        }).run()
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

      if (paymentIntentId) {
        const order = await db.select().from(schema.orders).where(eq(schema.orders.payment_intent_id, paymentIntentId)).get()
        
        if (order && ['pending_payment', 'processing', 'completed'].includes(order.status || '')) {
          const success = await OrderService.refundOrderAndRestock(db, env, order.id, order.status as string)

          if (success) {
            await db.insert(schema.auditLogs).values({
              id: crypto.randomUUID(), action: 'stripe_webhook_refund',
              entity_type: 'order',
              entity_id: order.id,
              payload_json: JSON.stringify({ stripe_event_id: event.id, order_id: order.id, status: 'refunded' })
            }).run()
          }
        }
      }
    }
  }

  static async processCarrierWebhook(db: any, env: any, payload: any) {
    const { order_id, status, carrier_name, tracking_number } = payload

    if (status === 'Delivered') {
      // 1. Update shipments table first
      if (tracking_number) {
        await db.update(schema.shipments)
          .set({ status: 'delivered', delivered_at: new Date().toISOString(), updated_at: sql`CURRENT_TIMESTAMP` })
          .where(eq(schema.shipments.tracking_number, tracking_number))
      }

      // 2. Fetch all shipments for this order
      const allShipments = await db.select()
        .from(schema.shipments)
        .where(eq(schema.shipments.order_id, order_id))
        .all();

      const allDelivered = allShipments.length > 0 && allShipments.every((s: any) => s.status === 'delivered');

      // 3. Fetch all order items and compare their total quantity to the total quantity of all shipment items
      const orderItems = await db.select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.order_id, order_id))
        .all();

      const allShipmentItems = await db.select({
        quantity: schema.shipmentItems.quantity
      })
        .from(schema.shipmentItems)
        .innerJoin(schema.shipments, eq(schema.shipmentItems.shipment_id, schema.shipments.id))
        .where(eq(schema.shipments.order_id, order_id))
        .all();

      const totalOrderedQty = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const totalShippedQty = allShipmentItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

      const allItemsShipped = totalShippedQty >= totalOrderedQty;

      // 4. Call OrderService.completeOrder ONLY if all shipments are delivered AND all ordered items have been shipped.
      if (allDelivered && allItemsShipped) {
        const success = await OrderService.completeOrder(db, order_id)
        if (success) {
          console.log(`[Queue] Carrier: order ${order_id} marked as completed.`)

          if (env.EVENT_QUEUE) {
            await env.EVENT_QUEUE.send({
              type: 'ORDER_DELIVERED',
              orderId: order_id,
              carrierName: carrier_name ?? 'Unknown',
              trackingNumber: tracking_number ?? '',
            })
          }
        } else {
          console.warn(`[Queue] Carrier: order ${order_id} status update skipped (not in expected state).`)
        }
      } else {
        console.log(`[Queue] Carrier: order ${order_id} is not fully delivered or shipped yet. allDelivered=${allDelivered}, totalShippedQty=${totalShippedQty}, totalOrderedQty=${totalOrderedQty}`)
      }
    } else if (status === 'Shipped') {
      if (tracking_number) {
        await db.update(schema.shipments)
          .set({ status: 'shipped', shipped_at: new Date().toISOString(), updated_at: sql`CURRENT_TIMESTAMP` })
          .where(eq(schema.shipments.tracking_number, tracking_number))
      }
    }
  }
}
