import { Hono } from 'hono'
import { createDb, schema } from '@ecommerce/database'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import Stripe from 'stripe'

type Bindings = {
  DB: D1Database
  STRIPE_SECRET_KEY: string
}

const rma = new Hono<{ Bindings: Bindings }>()

const rmaRequestSchema = z.object({
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  reason: z.string().min(5),
})

rma.post('/', zValidator('json', rmaRequestSchema), async (c) => {
  try {
    const { order_id, customer_id, reason } = c.req.valid('json')
    const db = createDb(c.env.DB)

    // Check if order exists and belongs to customer
    const order = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order_id))
      .get()

    if (!order || order.customer_id !== customer_id) {
      return c.json({ success: false, error: 'Invalid order or customer' }, 400)
    }

    if (order.status !== 'completed' && order.status !== 'processing') {
      return c.json({ success: false, error: 'Order is not eligible for RMA' }, 400)
    }

    // Luồng RMA Auto-approve rule: < 500,000 (cents/VND depending on store config) or VIP
    let status = 'requested'
    let isVip = false
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, customer_id)).get()
    
    if (customer && customer.tags_json) {
      try {
        const tags = JSON.parse(customer.tags_json)
        if (tags.includes('VIP')) isVip = true
      } catch (e) {}
    }

    const THRESHOLD = 500000;
    if (order.total_amount < THRESHOLD || isVip) {
      status = 'approved'
    }

    const rmaId = crypto.randomUUID()

    // Insert RMA request
    await db.insert(schema.rmaRequests).values({
      id: rmaId,
      order_id,
      customer_id,
      status,
      reason,
      refund_amount: order.total_amount // refund entire amount for MVP
    })

    if (status === 'approved') {
      // Execute Stripe refund if possible
      if (order.payment_intent_id && c.env.STRIPE_SECRET_KEY) {
        try {
          const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
          await stripe.refunds.create({
            payment_intent: order.payment_intent_id
          })
          
          await db.update(schema.rmaRequests)
            .set({ status: 'refunded' })
            .where(eq(schema.rmaRequests.id, rmaId))
            
          await db.update(schema.orders)
            .set({ status: 'refunded' })
            .where(eq(schema.orders.id, order_id))
            
          status = 'refunded'

        } catch (stripeErr: any) {
          console.error('[RMA Auto-refund] Stripe Refund failed:', stripeErr.message)
          // Keep it as approved if refund failed, admin can retry
        }
      }
    }

    return c.json({ success: true, rma_id: rmaId, status })

  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default rma
