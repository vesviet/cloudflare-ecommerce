import { Hono } from 'hono'
import Stripe from 'stripe'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

type Bindings = {
  STRIPE_WEBHOOK_QUEUE?: Queue
  CARRIER_WEBHOOK_QUEUE?: Queue
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  CARRIER_WEBHOOK_SECRET: string
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

  // Push to Queue for async processing
  if (c.env.STRIPE_WEBHOOK_QUEUE) {
    await c.env.STRIPE_WEBHOOK_QUEUE.send(event)
  } else {
    console.warn('[Webhook] STRIPE_WEBHOOK_QUEUE binding missing')
  }

  return c.json({ received: true })
})

const CarrierWebhookSchema = z.object({
  order_id: z.string(),
  status: z.string(),
  carrier_name: z.string().optional(),
  tracking_number: z.string().optional()
});

webhook.post('/carrier', zValidator('json', CarrierWebhookSchema), async (c) => {
  const carrierSecret = c.req.header('X-Carrier-Webhook-Secret')
  if (!carrierSecret || carrierSecret !== c.env.CARRIER_WEBHOOK_SECRET) {
    console.warn('[Webhook] Carrier webhook: unauthorized request')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const payload = c.req.valid('json')

  if (c.env.CARRIER_WEBHOOK_QUEUE) {
    await c.env.CARRIER_WEBHOOK_QUEUE.send(payload)
  } else {
    console.warn('[Webhook] CARRIER_WEBHOOK_QUEUE binding missing')
  }

  return c.json({ received: true })
})

export default webhook
