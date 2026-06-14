import { Hono } from 'hono'
import Stripe from 'stripe'
import { createDb, schema } from '@ecommerce/database'
import { eq } from 'drizzle-orm'
import { InventoryService, OrderService } from '@ecommerce/core-services'

type Bindings = {
  DB: D1Database
  EVENT_QUEUE: Queue
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

const webhook = new Hono<{ Bindings: Bindings }>()

webhook.post('/stripe', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('Stripe-Signature')

  if (!signature) {
    return c.json({ error: 'Missing Stripe-Signature header' }, 400)
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('[Webhook] Stripe signature verification failed:', err)
    return c.json({ error: 'Invalid Stripe signature' }, 400)
  }

  const db = createDb(c.env.DB)

  const insertResult = await db
    .insert(schema.idempotencyKeys)
    .values({
      id: event.id,
      event_type: event.type,
    })
    .onConflictDoNothing()

  const changes = (insertResult as any)?.meta?.changes ?? (insertResult as any)?.changes
  if (changes === 0) {
    console.log(`[Webhook] Duplicate event ${event.id} (${event.type}) — already processed, skipping`)
    return c.json({ received: true, message: 'Event already processed' })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const sessionId = (event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent).id

    const order = await db.select().from(schema.orders).where(eq(schema.orders.session_id, sessionId)).get() || 
                  await db.select().from(schema.orders).where(eq(schema.orders.payment_intent_id, sessionId)).get();

    if (order && order.status === 'pending_payment') {
      const success = await OrderService.processPaymentSuccess(db, order.id);

      if (success) {
        await db.insert(schema.auditLogs).values({
          id: crypto.randomUUID(), action: 'stripe_webhook_success',
          entity_type: 'order',
          entity_id: order.id,
          payload_json: JSON.stringify({ stripe_event_id: event.id, order_id: order.id, status: 'processing' })
        }).execute();

      if (c.env.EVENT_QUEUE) {
        await c.env.EVENT_QUEUE.send({
          type: 'ORDER_SUCCESS',
          orderId: order.id,
          emailEvent: 'order_confirmation',
        })

        if (order.affiliate_id) {
          await c.env.EVENT_QUEUE.send({
            type: 'AFFILIATE_COMMISSION',
            orderId: order.id,
            affiliateId: order.affiliate_id,
            totalAmount: order.total_amount,
          })
        }
      }
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

    if (paymentIntentId) {
      const order = await db.select().from(schema.orders).where(eq(schema.orders.payment_intent_id, paymentIntentId)).get()
      
      if (order && ['processing', 'completed'].includes(order.status || '')) {
        const success = await OrderService.refundOrderAndRestock(db, c.env.DB, order.id, order.status);

        if (success) {
          await db.insert(schema.auditLogs).values({
            id: crypto.randomUUID(), action: 'stripe_webhook_refund',
            entity_type: 'order',
            entity_id: order.id,
            payload_json: JSON.stringify({ stripe_event_id: event.id, order_id: order.id, status: 'refunded' })
          }).execute();
        }
      }
    }
  }

  return c.json({ received: true })
})

webhook.post('/carrier', async (c) => {
  const body = await c.req.json();
  const { order_id, status } = body;

  const db = createDb(c.env.DB);
  
  if (status === 'Delivered') {
    await OrderService.completeOrder(db, order_id);
    console.log(`[Webhook] Order ${order_id} marked as completed via Carrier webhook.`);
  }

  return c.json({ received: true });
});

export default webhook
