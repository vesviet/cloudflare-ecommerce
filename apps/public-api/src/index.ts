import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql } from 'drizzle-orm'
import catalog from './routes/catalog'
import checkout from './routes/checkout'
import webhook from './routes/webhook'
import customer from './routes/customer'
import refund from './routes/refund'
import categories from './routes/categories'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_R2: R2Bucket
  EVENT_QUEUE: Queue
  JWT_SECRET: string
  PARTNER_API_KEYS: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  RESEND_API_KEY: string
  STOREFRONT_URL: string
  // RISK-01 FIX: Comma-separated list of allowed CORS origins for production.
  // Set via wrangler.toml [vars] or `wrangler secret put ALLOWED_ORIGINS`.
  // Example: "https://aura.store,https://www.aura.store"
  ALLOWED_ORIGINS?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// RISK-01 FIX: CORS origins are now configurable via ALLOWED_ORIGINS env binding.
// In production, set ALLOWED_ORIGINS = "https://aura.store,https://www.aura.store"
// in wrangler.toml [vars] or via `wrangler secret put ALLOWED_ORIGINS`.
// Falls back to localhost for local development when the binding is not set.
app.use('/*', cors({
  origin: (origin, c) => {
    const env = c.env as Bindings
    const allowedList = env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173']
    return allowedList.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('E-Commerce Public API Worker is running!')
})

// Route registration
app.route('/api/products', catalog)
app.route('/api/categories', categories)
app.route('/api/checkout', checkout)
app.route('/api/webhooks', webhook)
app.route('/api', customer)
app.route('/api/refund', refund)

export default {
  // 1. HTTP Requests (Hono)
  fetch: app.fetch,

  // 2. Queue Consumer — order confirmation email via Resend
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    const db = createDb(env.DB)

    for (const msg of batch.messages) {
      const payload = msg.body

      if (payload.type === 'ORDER_SUCCESS') {
        try {
          const order = await db
            .select()
            .from(schema.orders)
            .where(eq(schema.orders.id, payload.orderId))
            .get()

          // Resolve recipient: guest email or registered customer email
          let recipientEmail: string | null = order?.guest_email ?? null
          if (!recipientEmail && order?.customer_id) {
            const customer = await db
              .select()
              .from(schema.customers)
              .where(eq(schema.customers.id, order.customer_id))
              .get()
            recipientEmail = customer?.email ?? null
          }

          if (recipientEmail && env.RESEND_API_KEY) {
            const shortId = payload.orderId.slice(0, 8).toUpperCase()
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Aura Store <orders@aura.store>',
                to: [recipientEmail],
                subject: `Order Confirmed #${shortId}`,
                html: `
                  <h2 style="font-family:sans-serif">Thank you for your order!</h2>
                  <p style="font-family:sans-serif;color:#666">Your order has been confirmed and is being processed.</p>
                  <p style="font-family:sans-serif"><strong>Order ID:</strong> <code>${payload.orderId}</code></p>
                  <p style="font-family:sans-serif">You will receive a shipping notification once your order is dispatched.</p>
                `,
              }),
            })

            if (!emailRes.ok) {
              // Log but don't retry — prevent infinite queue loop
              console.error(`[Queue Email] Resend API error for order ${payload.orderId}:`, await emailRes.text())
            } else {
              console.log(`[Queue Email] Confirmation sent to ${recipientEmail} for order ${payload.orderId}`)
            }
          } else if (!env.RESEND_API_KEY) {
            console.warn('[Queue Email] RESEND_API_KEY not set — skipping email send')
          }
        } catch (err) {
          // Log error but always ack to avoid infinite retry loop
          console.error(`[Queue Email] Unexpected error for order ${payload.orderId}:`, err)
        }
      } else if (payload.type === 'ORDER_SHIPPED') {
        try {
          const order = await db
            .select()
            .from(schema.orders)
            .where(eq(schema.orders.id, payload.orderId))
            .get()

          let recipientEmail: string | null = order?.guest_email ?? null
          if (!recipientEmail && order?.customer_id) {
            const customer = await db
              .select()
              .from(schema.customers)
              .where(eq(schema.customers.id, order.customer_id))
              .get()
            recipientEmail = customer?.email ?? null
          }

          if (recipientEmail && env.RESEND_API_KEY) {
            const shortId = payload.orderId.slice(0, 8).toUpperCase()
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Aura Store <orders@aura.store>',
                to: [recipientEmail],
                subject: `Order Shipped #${shortId}`,
                html: `
                  <h2 style="font-family:sans-serif">Great news! Your order is on the way.</h2>
                  <p style="font-family:sans-serif;color:#666">Your order has been fulfilled and shipped.</p>
                  <p style="font-family:sans-serif"><strong>Order ID:</strong> <code>${payload.orderId}</code></p>
                  <p style="font-family:sans-serif"><strong>Carrier:</strong> ${payload.carrierName}</p>
                  <p style="font-family:sans-serif"><strong>Tracking Number:</strong> <code>${payload.trackingNumber}</code></p>
                  <p style="font-family:sans-serif">You can use the tracking number on the carrier's website to monitor your delivery.</p>
                `,
              }),
            })

            if (!emailRes.ok) {
              console.error(`[Queue Email] Resend API error for shipped order ${payload.orderId}:`, await emailRes.text())
            } else {
              console.log(`[Queue Email] Shipping confirmation sent to ${recipientEmail} for order ${payload.orderId}`)
            }
          } else if (!env.RESEND_API_KEY) {
            console.warn('[Queue Email] RESEND_API_KEY not set — skipping shipping email')
          }
        } catch (err) {
          console.error(`[Queue Email] Unexpected error for shipped order ${payload.orderId}:`, err)
        }
      }

      msg.ack()
    }
  },

  // 3. Cron Trigger — auto-cancel expired pending orders every 5 minutes
  async scheduled(event: any, env: Bindings, ctx: any): Promise<void> {
    console.log(`[Cron] Scanning expired soft-locks at ${new Date().toISOString()}`)
    const db = createDb(env.DB)

    const now = Math.floor(Date.now() / 1000)
    const expiredReservations = await db
      .select()
      .from(schema.inventoryReservations)
      .where(sql`expires_at < ${now}`)
      .all()

    let cancelledCount = 0
    let skippedCount = 0

    for (const res of expiredReservations) {
      // BUG-003 FIX: Only cancel orders that are still in 'pending_payment'.
      // If a payment webhook processed the order (status = 'processing' or 'completed')
      // but the soft-lock deletion in the batch failed, the cron would have incorrectly
      // cancelled a paid order. The status guard prevents that.
      const order = await db
        .select({ status: schema.orders.status })
        .from(schema.orders)
        .where(eq(schema.orders.id, res.order_id))
        .get()

      if (!order || order.status !== 'pending_payment') {
        // Order is already paid/processing/completed/cancelled — just clean up the stale lock
        await db
          .delete(schema.inventoryReservations)
          .where(eq(schema.inventoryReservations.id, res.id))
        skippedCount++
        console.log(`[Cron] Skipped cancel for order ${res.order_id} (status=${order?.status ?? 'not found'}), removed stale soft-lock`)
        continue
      }

      await db
        .update(schema.orders)
        .set({ status: 'cancelled' })
        .where(eq(schema.orders.id, res.order_id))
      await db
        .delete(schema.inventoryReservations)
        .where(eq(schema.inventoryReservations.id, res.id))
      cancelledCount++
      console.log(`[Cron] Cancelled order ${res.order_id}, released soft-lock (Variation: ${res.variation_id}, Qty: ${res.quantity})`)
    }

    console.log(`[Cron] Done: cancelled=${cancelledCount} skipped=${skippedCount} total_expired=${expiredReservations.length}`)
  },
}
