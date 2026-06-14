import { Hono } from 'hono'
import Stripe from 'stripe'
import { createDb, schema } from '@ecommerce/database'
import { eq } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  STRIPE_SECRET_KEY: string
}

const admin = new Hono<{ Bindings: Bindings }>()

// NOTE: MVP Admin Refund API. In production, this MUST be protected by Admin Auth Middleware (e.g. JWT check)
admin.post('/orders/:id/refund', async (c) => {
  const orderId = c.req.param('id')
  const db = createDb(c.env.DB)
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

  try {
    const order = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get()
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    
    if (order.status === 'refunded') {
      return c.json({ success: false, error: 'Order is already refunded' }, 400)
    }
    
    if (!order.payment_intent_id) {
      return c.json({ success: false, error: 'Order has no Stripe payment session linked' }, 400)
    }

    let paymentIntentId = order.payment_intent_id
    
    // The DB stores the Checkout Session ID (cs_test_...).
    // Stripe Refunds API requires the PaymentIntent ID (pi_test_...).
    if (paymentIntentId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(paymentIntentId)
      if (!session.payment_intent) {
        return c.json({ success: false, error: 'Checkout session has no associated payment intent' }, 400)
      }
      paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id
    }

    // Call Stripe to issue a full refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId
    })

    // VERY IMPORTANT: We DO NOT update the database status to 'refunded' here!
    // Why? Because Stripe will automatically fire the `charge.refunded` Webhook event.
    // Our Webhook handler in `webhook.ts` will catch it, update the status, and reliably restore the inventory.
    // This guarantees the Single Source of Truth and prevents race conditions.

    console.log(`[Admin] Successfully requested Stripe refund for order ${orderId}. Webhook will handle DB update.`)
    
    return c.json({ 
      success: true, 
      message: 'Refund requested successfully. Order status will be updated via Webhook shortly.',
      refund_id: refund.id 
    })
  } catch (err: any) {
    console.error(`[Admin] Refund error for order ${orderId}:`, err.message)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default admin
