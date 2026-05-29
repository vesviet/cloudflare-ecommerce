import { Hono } from 'hono'
import Stripe from 'stripe'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql, inArray } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  STRIPE_SECRET_KEY: string
  STOREFRONT_URL: string
  ENVIRONMENT?: string
}

// BUG-002 FIX: Keep shipping fee in CENTS throughout to avoid mixed-unit arithmetic.
// subTotal is accumulated in cents (from DB integer prices), so shippingFeeCents must
// also be in cents so that totalAmount is stored consistently in cents.
const FLAT_SHIPPING_FEE_CENTS = 999 // 999 cents = $9.99

const checkout = new Hono<{ Bindings: Bindings }>()

checkout.post('/', async (c) => {
  try {
  const body = await c.req.json()
  const {
    items, affiliate_id, address, shipping_address_json, billing_address_json,
    customer_id, email, utm_source, utm_medium, utm_campaign,
    accepts_marketing,
  } = body

  // VALIDATE: Cart không rỗng
  if (!items || items.length === 0) {
    return c.json({ success: false, error: 'Cart is empty' }, 400)
  }

  // VALIDATE: Guest phải cung cấp email hợp lệ
  if (!customer_id && (!email || !email.includes('@'))) {
    return c.json({ success: false, error: 'A valid email address is required for guest checkout' }, 400)
  }

  const db = createDb(c.env.DB)

  // BƯỚC 1: Tính toán Shipping (luôn giữ đơn vị CENTS)
  // MVP: flat rate 999 cents ($9.99). FedEx/USPS real API là Phase 2.
  // BUG-002 FIX: shippingFeeCents stays in cents — never divide to dollars here.
  let shippingFeeCents = FLAT_SHIPPING_FEE_CENTS // 999 cents
  if (address?.zipcode) {
    const cacheKey = `ship_${address.zipcode}`
    const cachedRate = await c.env.CACHE_KV.get(cacheKey)
    if (cachedRate) {
      // Cached values are also stored in cents
      shippingFeeCents = parseInt(cachedRate, 10)
    } else {
      // Giữ flat rate đến khi FedEx/USPS được tích hợp thật
      await c.env.CACHE_KV.put(cacheKey, shippingFeeCents.toString(), { expirationTtl: 600 })
    }
  }

  // BƯỚC 2: Validate items using batched queries
  let subTotal = 0 // in cents
  const validItems: { variation_id: string; quantity: number; price: number; name: string }[] = []

  const variationIds = items.map((i: any) => i.variation_id)
  
  // Fetch all variations in one query
  const variations = await db
    .select()
    .from(schema.productVariations)
    .where(inArray(schema.productVariations.id, variationIds))
    .all()

  // Fetch all active reservations for these variations in one query
  const now = Math.floor(Date.now() / 1000)
  const allReservations = await db
    .select()
    .from(schema.inventoryReservations)
    .where(sql`variation_id IN (${sql.join(variationIds, sql`, `)}) AND expires_at > ${now}`)
    .all()

  // Group reservations by variation_id
  const reservationMap = new Map<string, number>()
  for (const res of allReservations) {
    reservationMap.set(res.variation_id, (reservationMap.get(res.variation_id) || 0) + res.quantity)
  }

  // Fetch products for names in one query
  const productIds = variations.map(v => v.product_id)
  const products = await db
    .select({ id: schema.products.id, title: schema.products.title })
    .from(schema.products)
    .where(inArray(schema.products.id, productIds))
    .all()
  const productMap = new Map(products.map(p => [p.id, p.title]))

  for (const item of items) {
    const variation = variations.find(v => v.id === item.variation_id)

    if (!variation || variation.is_purchasable === 0) {
      return c.json({ success: false, error: `Product variation ${item.variation_id} is invalid or unavailable` }, 400)
    }

    const reservedQuantity = reservationMap.get(item.variation_id) || 0
    const availableStock = variation.stock - reservedQuantity

    if (availableStock < item.quantity) {
      return c.json({
        success: false,
        error: `Product variation ${item.variation_id} is out of stock (Available: ${availableStock})`,
      }, 400)
    }

    const price = variation.sale_price ?? variation.regular_price
    subTotal += price * item.quantity

    validItems.push({
      variation_id: item.variation_id,
      quantity: item.quantity,
      price,
      name: productMap.get(variation.product_id) ?? `Product ${item.variation_id.slice(0, 8)}`,
    })
  }

  // BUG-002 FIX: Both subTotal and shippingFeeCents are in cents → totalAmount in cents ✅
  const totalAmount = subTotal + shippingFeeCents

  console.log(`[Checkout] Starting order: customer=${customer_id || 'guest'} email=${email || 'N/A'} items=${validItems.length} subtotal=${subTotal}c shipping=${shippingFeeCents}c total=${totalAmount}c`)

  // BƯỚC 3: Stripe Customer attribution (logged-in user)
  let stripeCustomerId: string | undefined
  if (customer_id) {
    const customer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, customer_id))
      .get()

    if (customer) {
      stripeCustomerId = customer.stripe_customer_id ?? undefined

      // First purchase attribution update
      const shouldUpdateAttribution =
        !customer.signup_utm_source &&
        !customer.signup_utm_medium &&
        !customer.signup_utm_campaign &&
        !customer.signup_affiliate_id

      if (shouldUpdateAttribution && (utm_source || utm_medium || utm_campaign || affiliate_id)) {
        await db
          .update(schema.customers)
          .set({
            signup_utm_source: utm_source || null,
            signup_utm_medium: utm_medium || null,
            signup_utm_campaign: utm_campaign || null,
            signup_affiliate_id: affiliate_id || null,
          })
          .where(eq(schema.customers.id, customer_id))
      }

      // Update GDPR marketing consent if provided at checkout
      if (accepts_marketing !== undefined) {
        await db
          .update(schema.customers)
          .set({ accepts_marketing: accepts_marketing ? 1 : 0 })
          .where(eq(schema.customers.id, customer_id))
      }
    }
  }

  // BƯỚC 4: Tạo Order + Soft-lock tồn kho
  const orderId = crypto.randomUUID()
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60 // 30 phút

  await db.insert(schema.orders).values({
    id: orderId,
    customer_id: customer_id || null,
    guest_email: customer_id ? null : email,
    status: 'pending_payment',
    total_amount: totalAmount,   // BUG-002 FIX: stored in cents ✅
    shipping_fee: shippingFeeCents, // BUG-002 FIX: stored in cents ✅
    affiliate_id: affiliate_id || null,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    shipping_address_json: shipping_address_json
      ? JSON.stringify(shipping_address_json)
      : address
        ? JSON.stringify(address)
        : null,
    billing_address_json: billing_address_json ? JSON.stringify(billing_address_json) : null,
  })

  for (const item of validItems) {
    await db.insert(schema.orderItems).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price_at_purchase: item.price,
    })

    // Soft-lock inventory
    await db.insert(schema.inventoryReservations).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      variation_id: item.variation_id,
      quantity: item.quantity,
      expires_at: expiresAt,
    })
  }

  console.log(`[Checkout] Order ${orderId} committed to DB (pending_payment). Creating Stripe session...`)

  // BƯỚC 5: Tạo Stripe Checkout Session thật
  // BUG-001 FIX: Wrap Stripe session creation in try/catch.
  // If Stripe throws (network error, invalid key, outage), we roll back the order and
  // release the soft-locks so inventory is not stranded for 30 minutes.
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

  const storefrontUrl = c.env.STOREFRONT_URL || 'http://localhost:3000'

  // Build Stripe line items from server-validated prices (all in cents)
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price), // item.price is already in cents ✅
    },
    quantity: item.quantity,
  }))

  // Add shipping as a line item so it appears on the Stripe invoice
  if (shippingFeeCents > 0) {
    stripeLineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Standard Shipping' },
        unit_amount: shippingFeeCents, // already in cents — no multiplication needed ✅
      },
      quantity: 1,
    })
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: stripeLineItems,
    success_url: `${storefrontUrl}/checkout/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${storefrontUrl}/checkout?cancelled=true`,
    metadata: { order_id: orderId },
    payment_intent_data: {
      metadata: {
        order_id: orderId,
        affiliate_id: affiliate_id || '',
        utm_source: utm_source || '',
        utm_medium: utm_medium || '',
        utm_campaign: utm_campaign || '',
      },
    },
  }

  // Attach Stripe Customer if available, else set customer email for guest
  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId
  } else if (email) {
    sessionParams.customer_email = email
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams)
  } catch (stripeErr: any) {
    // BUG-001 FIX: Stripe failed — roll back the order and release inventory soft-locks
    // so stock is not stranded and the customer can retry immediately.
    console.error(`[Checkout] Stripe session creation failed for order ${orderId}:`, stripeErr.message)
    try {
      await db
        .update(schema.orders)
        .set({ status: 'failed' })
        .where(eq(schema.orders.id, orderId))
      await db
        .delete(schema.inventoryReservations)
        .where(eq(schema.inventoryReservations.order_id, orderId))
      console.log(`[Checkout] Rolled back order ${orderId} to 'failed', released soft-locks`)
    } catch (rollbackErr: any) {
      console.error(`[Checkout] Rollback failed for order ${orderId}:`, rollbackErr.message)
    }
    return c.json({
      success: false,
      error: 'Payment provider is temporarily unavailable. Please try again in a few moments.',
    }, 503)
  }

  // Link order to Stripe session ID for webhook lookup
  await db
    .update(schema.orders)
    .set({ payment_intent_id: session.id })
    .where(eq(schema.orders.id, orderId))

  console.log(`[Checkout] Order ${orderId} linked to Stripe session ${session.id}. Redirecting to ${session.url}`)

  return c.json({
    success: true,
    order_id: orderId,
    checkout_url: session.url,
    stripe_session_id: session.id,
  })
  } catch (err: any) {
    // Top-level error handler: expose the crash in dev so we can diagnose it.
    // In production this prevents the generic Cloudflare "Internal Server Error" response.
    console.error('[Checkout] Unhandled exception:', err?.message, err?.stack)
    return c.json({
      success: false,
      error: err?.message ?? 'Internal checkout error',
      stack: c.env.ENVIRONMENT === 'production' ? undefined : (err?.stack ?? null),
    }, 500)
  }
})

export default checkout
