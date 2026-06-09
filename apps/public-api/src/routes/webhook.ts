import { Hono } from 'hono'
import Stripe from 'stripe'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql, and } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  EVENT_QUEUE: Queue
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

const webhook = new Hono<{ Bindings: Bindings }>()

webhook.post('/stripe', async (c) => {
  // 1. Read raw body BEFORE any parsing — Stripe signature verification requires
  //    the original untouched request body bytes. Calling c.req.json() first
  //    would invalidate the signature check.
  const rawBody = await c.req.text()
  const signature = c.req.header('Stripe-Signature')

  if (!signature) {
    return c.json({ error: 'Missing Stripe-Signature header' }, 400)
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  let event: Stripe.Event

  try {
    // constructEventAsync is the async variant required by Cloudflare Workers
    // (uses Web Crypto API instead of Node.js crypto)
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

  // 2. Idempotency — skip already-processed events
  // BUG-004 FIX: Use INSERT OR IGNORE (onConflictDoNothing) instead of SELECT-then-INSERT.
  // This closes the TOCTOU race window: if two concurrent Workers receive the same event,
  // only one INSERT will succeed (PK unique constraint). The other will get meta.changes=0
  // and we bail out immediately before any order processing begins.
  // D1Result returns { meta: { changes: number } } — changes=0 means the row already existed.
  const insertResult = await db
    .insert(schema.idempotencyKeys)
    .values({
      id: event.id,
      event_type: event.type,
    })
    .onConflictDoNothing()

  // If the row already existed (conflict), meta.changes = 0 — skip processing
  const changes = (insertResult as any)?.meta?.changes ?? (insertResult as any)?.changes
  if (changes === 0) {
    console.log(`[Webhook] Duplicate event ${event.id} (${event.type}) — already processed, skipping`)
    return c.json({ received: true, message: 'Event already processed' })
  }

  // 3. Process payment success events
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const sessionId = (event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent).id

    console.log(`[Webhook] Processing ${event.type} for session/intent ${sessionId}`)

    const order = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_intent_id, sessionId))
      .get()

    if (!order) {
      console.warn(`[Webhook] No order found for payment_intent_id=${sessionId} — may be from a different system or already cleaned up`)
    } else if (order.status !== 'pending_payment') {
      console.log(`[Webhook] Order ${order.id} already in status '${order.status}' — skipping processing`)
    } else {
      const orderItems = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.order_id, order.id))
        .all()

      const batchQueries: any[] = []

      // RISK-02 FIX: Add stock >= quantity guard in WHERE clause.
      // Without this, if stock is somehow 0 (edge case race), the DB CHECK(stock >= 0)
      // constraint would throw an error crashing the entire batch, leaving the order
      // in pending_payment while the idempotency key is already recorded (so retry is skipped).
      // The WHERE guard makes the update a no-op instead of throwing.
      for (const item of orderItems) {
        batchQueries.push(
          db
            .update(schema.products)
            .set({ stock_quantity: sql`stock_quantity - ${item.quantity}`, in_stock: sql`CASE WHEN stock_quantity - ${item.quantity} > 0 THEN 1 ELSE 0 END` })
            .where(
              and(
                eq(schema.products.id, item.product_id),
                sql`stock_quantity >= ${item.quantity}`, // RISK-02 FIX: Prevents constraint violation
              )
            ),
        )
      }

      // Remove soft-locks now that stock is hard-decremented
      batchQueries.push(
        db
          .delete(schema.inventoryReservations)
          .where(eq(schema.inventoryReservations.order_id, order.id)),
      )

      // Advance order state machine: pending_payment → processing
      batchQueries.push(
        db
          .update(schema.orders)
          .set({ status: 'processing' })
          .where(eq(schema.orders.id, order.id)),
      )

      await db.batch(batchQueries as any)

      console.log(`[Webhook] Order ${order.id} advanced to 'processing', stock decremented for ${orderItems.length} items`)

      // Enqueue email confirmation
      if (c.env.EVENT_QUEUE) {
        await c.env.EVENT_QUEUE.send({
          type: 'ORDER_SUCCESS',
          orderId: order.id,
          emailEvent: 'order_confirmation',
        })
        console.log(`[Webhook] Enqueued ORDER_SUCCESS email for order ${order.id}`)

        // Push commission event if affiliate_id is present
        if (order.affiliate_id) {
          await c.env.EVENT_QUEUE.send({
            type: 'AFFILIATE_COMMISSION',
            orderId: order.id,
            affiliateId: order.affiliate_id,
            totalAmount: order.total_amount,
          })
          console.log(`[Webhook] Enqueued AFFILIATE_COMMISSION for affiliate ${order.affiliate_id} on order ${order.id}`)
        }
      }
    }
  } else {
    console.log(`[Webhook] Unhandled event type: ${event.type} — acknowledged but not processed`)
  }

  return c.json({ received: true })
})

export default webhook
