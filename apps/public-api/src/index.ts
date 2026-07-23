import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb } from '@ecommerce/database'
import { localSchema as schema } from '@ecommerce/core-services'
import { eq, sql, and } from 'drizzle-orm'
import catalog from './routes/catalog'
import checkout from './routes/checkout'
import webhook from './routes/webhook'
import rma from './routes/rma'
import { customerRouter as customer } from '@ecommerce/shared-routes';
import { OrderService } from '@ecommerce/core-services'; // I-01 FIX: was missing — caused ReferenceError in cron scheduled()

import categories from './routes/categories'
import cms from './routes/cms'
import cart from './routes/cart'
import reviews from './routes/reviews'
import landingPages from './routes/landing-pages'
import { mediaRouter as media, featureFlagsRoute } from '@ecommerce/shared-routes';
import { WebhookProcessor } from './services/webhook-processor'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  PRODUCTS_R2: R2Bucket
  CMS_R2: R2Bucket
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
  INVENTORY_DO: DurableObjectNamespace
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
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('E-Commerce Public API Worker is running!')
})

// Route registration
app.route('/api/products', catalog)
app.route('/api/categories', categories)
app.route('/api/cms', cms)
app.route('/api/cart', cart)
app.route('/api/reviews', reviews)
app.route('/api/landing-pages', landingPages)
app.route('/api/checkout', checkout)
app.route('/api/webhooks', webhook)
app.route('/api/rma', rma)
app.route('/api', customer)
app.route('/api', featureFlagsRoute)

app.route('/media', media)


export { InventoryLockManagerDO } from '@ecommerce/core-services'

export default {
  // 1. HTTP Requests (Hono)
  fetch: app.fetch,

  // 2. Queue Consumer — order confirmation email via Resend
  // I-02 FIX: msg.ack() now called inside per-message try/catch to prevent infinite retry on unhandled exceptions
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    const db = createDb(env.DB)

    if (batch.queue === 'stripe-webhook-prod') {
      for (const msg of batch.messages) {
        try {
          const result = await WebhookProcessor.processStripeWebhook(db, env, msg.body)
          if (result === 'completed' || result === 'already_completed') {
            msg.ack()
          } else {
            msg.retry()
          }
        } catch (err) {
          console.error(`[Queue] Fatal error processing stripe webhook:`, err)
          msg.retry()
        }
      }
      return
    }

    if (batch.queue === 'carrier-webhook-prod') {
      for (const msg of batch.messages) {
        try {
          await WebhookProcessor.processCarrierWebhook(db, env, msg.body)
          msg.ack()
        } catch (err) {
          console.error(`[Queue] Fatal error processing carrier webhook:`, err)
          msg.retry()
        }
      }
      return
    }

    for (const msg of batch.messages) {
      try {
        const payload = msg.body

        if (payload.type === 'ORDER_SUCCESS') {
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
              console.error(`[Queue Email] Resend API error for order ${payload.orderId}:`, await emailRes.text())
            } else {
              console.log(`[Queue Email] Confirmation sent to ${recipientEmail} for order ${payload.orderId}`)
            }
          } else if (!env.RESEND_API_KEY) {
            console.warn('[Queue Email] RESEND_API_KEY not set — skipping email send')
          }

        } else if (payload.type === 'ORDER_SHIPPED') {
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

        } else if (payload.type === 'AFFILIATE_COMMISSION') {
          console.log(`[Queue Affiliate] Processing commission for affiliate ${payload.affiliateId} from order ${payload.orderId} (Amount: ${payload.totalAmount})`)
          // Tương lai: Gọi HTTP webhook tới Marketplace Partner hoặc lưu vào bảng Commission D1.

        } else if (payload.type === 'CANCEL_AND_RESTOCK') {
          // I-09 FIX: cancelOrderAndRestock now routed through Queue for at-least-once delivery
          const success = await OrderService.cancelOrderAndRestock(db, env, payload.orderId)
          if (success) {
            console.log(`[Queue] CANCEL_AND_RESTOCK: Cancelled and restocked order ${payload.orderId}`)
          } else {
            console.log(`[Queue] CANCEL_AND_RESTOCK: Skipped order ${payload.orderId} — already processed (optimistic lock)`)
          }

        } else {
          console.warn(`[Queue] Unknown message type: ${payload.type}`)
        }

        msg.ack() // Ack only after successful processing
      } catch (err) {
        // I-02 FIX: Explicit retry on unhandled error instead of silent nack of entire batch
        console.error(`[Queue] Fatal error processing message, retrying:`, err)
        msg.retry()
      }
    }
  },

  // 3. Cron Triggers
  // I-08 FIX: Added event.cron discriminator — 2 triggers were running identical logic each invocation.
  //   '*/5 * * * *' → 5-min: cancel expired pending_payment orders (15-min window)
  //   '0 * * * *'   → Hourly: mark stale pending_payment orders as abandoned (24h window)
  async scheduled(event: any, env: Bindings, _ctx: any): Promise<void> {
    console.log(`[Cron] Triggered cron=${event.cron} at ${new Date().toISOString()}`)
    const db = createDb(env.DB)

    if (event.cron === '*/5 * * * *') {
      // --- 5-minute job: Cancel pending orders older than 15 minutes ---
      // I-07 FIX: Added LIMIT 50 — previous unbounded query risked Workers CPU timeout (30s limit)
      const fifteenMinutesAgoISO = new Date(Date.now() - 15 * 60 * 1000).toISOString()

      const expiredOrders = await db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(sql`status = 'pending_payment' AND session_id IS NOT NULL AND created_at < ${fifteenMinutesAgoISO}`)
        .limit(50) // I-07 FIX: Bounded to prevent CPU timeout — cron runs every 5min to cover backlog
        .all()

      let cancelledCount = 0
      let skippedCount = 0

      for (const order of expiredOrders) {
        try {
          const success = await OrderService.cancelOrderAndRestock(db, env, order.id)
          if (success) {
            cancelledCount++
            console.log(`[Cron] Cancelled order ${order.id} and restocked inventory.`)
          } else {
            skippedCount++
            console.log(`[Cron] Skipped order ${order.id} — already processed (optimistic lock).`)
          }
        } catch (err: any) {
          console.error(`[Cron] Error cancelling order ${order.id}:`, err.message)
        }
      }

      console.log(`[Cron] 5-min done: cancelled=${cancelledCount} skipped=${skippedCount} batch=${expiredOrders.length}`)

    } else if (event.cron === '0 * * * *') {
      // --- Hourly job: Mark deeply stale orders as abandoned ---
      // Orders older than 24h that were never paid → abandoned state
      const twentyFourHoursAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // I-07 FIX: Max 10 iterations × 100 orders = 1000 per hourly run — prevents CPU timeout
      const MAX_ITERATIONS = 10
      let iterations = 0
      let abandonedCount = 0

      while (iterations < MAX_ITERATIONS) {
        // Use offset=0 always since matching rows are removed from result after each batch update
        const pendingOrders = await db
          .select({ id: schema.orders.id })
          .from(schema.orders)
          .where(sql`status = 'pending_payment' AND created_at < ${twentyFourHoursAgoISO}`)
          .limit(100)
          .all()

        if (!pendingOrders || pendingOrders.length === 0) break

        const abandonBatch = pendingOrders.map((o: { id: string }) =>
          db.update(schema.orders)
            .set({ status: 'abandoned', updated_at: sql`CURRENT_TIMESTAMP` })
            .where(eq(schema.orders.id, o.id))
        )

        await db.batch(abandonBatch as any)
        abandonedCount += pendingOrders.length
        iterations++
      }

      if (abandonedCount > 0) {
        console.log(`[Cron] Hourly: marked ${abandonedCount} orders as abandoned (${iterations} batches)`)
      } else {
        console.log(`[Cron] Hourly: no stale orders to abandon`)
      }

      // --- Hourly job: Abandoned Cart Recovery Emails ---
      // Find carts where last_active_at < 2 hours ago, status = 'active', and email not sent
      const twoHoursAgoSeconds = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
      
      const abandonedCarts = await db
        .select({
          id: schema.carts.id,
          customer_id: schema.carts.customer_id
        })
        .from(schema.carts)
        .where(
          and(
            eq(schema.carts.status, 'active'),
            sql`${schema.carts.last_active_at} < ${twoHoursAgoSeconds}`,
            sql`${schema.carts.abandoned_email_sent_at} IS NULL`,
            sql`${schema.carts.customer_id} IS NOT NULL` // Only registered customers have emails
          )
        )
        .limit(50)
        .all()

      let cartRecoveryCount = 0;
      for (const cart of abandonedCarts) {
        try {
          if (cart.customer_id) {
            const customer = await db.select({ email: schema.customers.email, firstName: schema.customers.first_name })
              .from(schema.customers)
              .where(eq(schema.customers.id, cart.customer_id))
              .get();
              
            if (customer && customer.email && env.RESEND_API_KEY) {
              const emailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${env.RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Aura Store <hello@aura.store>',
                  to: [customer.email],
                  subject: `Did you forget something, ${customer.firstName || 'there'}?`,
                  html: `
                    <h2 style="font-family:sans-serif">Your cart is waiting!</h2>
                    <p style="font-family:sans-serif;color:#666">You left some items in your cart. Come back and complete your purchase.</p>
                    <a href="${env.STOREFRONT_URL || 'https://aura-shop.tanhdev.com'}/cart" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-family:sans-serif;">Resume Checkout</a>
                  `,
                }),
              });

              if (emailRes.ok) {
                cartRecoveryCount++;
                await db.update(schema.carts)
                  .set({ abandoned_email_sent_at: Math.floor(Date.now() / 1000) })
                  .where(eq(schema.carts.id, cart.id)).run();
              } else {
                console.error(`[Cron] Resend API error for cart recovery:`, await emailRes.text());
              }
            } else if (customer && !env.RESEND_API_KEY) {
              // Dummy send if no API key
              cartRecoveryCount++;
              await db.update(schema.carts)
                .set({ abandoned_email_sent_at: Math.floor(Date.now() / 1000) })
                .where(eq(schema.carts.id, cart.id)).run();
              console.log(`[Cron] (Mock) Sent abandoned cart email to ${customer.email}`);
            }
          }
        } catch (err: any) {
          console.error(`[Cron] Error recovering cart ${cart.id}:`, err.message);
        }
      }

      if (cartRecoveryCount > 0) {
        console.log(`[Cron] Hourly: sent ${cartRecoveryCount} abandoned cart emails`);
      }

      // Hourly: cleanup expired idempotency keys (I-12 / TA-2)
      // Runs cleanup for keys with expires_at set (after migration 0010 is applied)
      const now = Math.floor(Date.now() / 1000)
      await db.run(sql`DELETE FROM idempotency_keys WHERE expires_at IS NOT NULL AND expires_at < ${now}`)
        .catch((err: any) => console.warn('[Cron] idempotency_keys cleanup skipped (column may not exist yet):', err.message))

    } else {
      console.warn(`[Cron] Unknown cron expression: ${event.cron}`)
    }
  },
}
