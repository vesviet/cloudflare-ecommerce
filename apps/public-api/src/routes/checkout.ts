import { Hono } from 'hono'
import { createDb, schema } from '@ecommerce/database'
import { eq, lt, inArray } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { CheckoutSchema, DEFAULT_LOCATION_ID } from '@ecommerce/contract'
import { InventoryService, PaymentService, OrderService } from '@ecommerce/core-services'
import { rateLimit, clientIp, type RateLimiter } from '@ecommerce/shared-routes'



type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  STRIPE_SECRET_KEY: string
  STOREFRONT_URL: string
  ENVIRONMENT?: string
  CHECKOUT_RATE_LIMITER?: RateLimiter
}

// Shipping fee tiers in VNĐ — server is the single source of truth.
// Zone 7xx postcodes (e.g. Ho Chi Minh City) get discounted rate.
const SHIPPING_ZONE_7_CENTS = 3000  // 3,000 VNĐ (discounted rate for Zone 7 postcodes)
const SHIPPING_DEFAULT_CENTS = 5000 // 5,000 VNĐ (standard default shipping rate)
const FLAT_SHIPPING_FEE_CENTS = 999 // legacy Stripe path — kept for backwards-compat

const checkout = new Hono<{ Bindings: Bindings }>()

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/checkout/shipping-estimate?postcode=<code>
// Returns the authoritative shipping fee for a given postcode.
// Client MUST use this value — never hardcode shipping on the frontend.
// ─────────────────────────────────────────────────────────────────────────────
checkout.get('/shipping-estimate', (c) => {
  const postcode = (c.req.query('postcode') || '').trim()
  const feeCents = postcode.startsWith('7') ? SHIPPING_ZONE_7_CENTS : SHIPPING_DEFAULT_CENTS
  return c.json({
    success: true,
    shipping_fee_cents: feeCents,
    shipping_fee_display: `${feeCents.toLocaleString('vi-VN')} ₫`,
    zone: postcode.startsWith('7') ? 'zone-7' : 'default',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/checkout/validate-prices
// Batch price validation — replaces N+1 sequential fetches on the checkout page.
// Handles both simple products and variable products (variations).
// ─────────────────────────────────────────────────────────────────────────────
const ValidatePricesSchema = z.object({
  items: z.array(z.object({
    id: z.string(),          // variation_id or product_id (CartItem.id)
    product_id: z.string(),  // always the parent product_id
  })).min(1).max(50),
})

checkout.post('/validate-prices', zValidator('json', ValidatePricesSchema), async (c) => {
  try {
    const { items } = c.req.valid('json')
    const db = createDb(c.env.DB)

    // Collect all variation_ids and product_ids to query in one batch
    const allIds = [...new Set(items.flatMap(i => [i.id, i.product_id]))]

    // Batch fetch prices from price_list_items
    const priceRows = await db
      .select({
        product_id: schema.priceListItems.product_id,
        price: schema.priceListItems.price,
      })
      .from(schema.priceListItems)
      .where(inArray(schema.priceListItems.product_id, allIds))
      .all()

    const priceMap = new Map(priceRows.map(r => [r.product_id, r.price]))

    const updates: Array<{ id: string; price: number; changed: boolean }> = []
    for (const item of items) {
      // Look up variation_id first, then fall back to product_id (simple products)
      const serverPrice = priceMap.get(item.id) ?? priceMap.get(item.product_id)
      if (serverPrice !== undefined && serverPrice !== null) {
        updates.push({ id: item.id, price: serverPrice, changed: false })
      }
    }

    return c.json({ success: true, updates })
  } catch (err: any) {
    console.error('[Checkout] validate-prices error:', err)
    return c.json({ success: false, error: 'Price validation failed' }, 500)
  }
})

// Runs after zValidator so the identity comes from the already-validated payload.
const limitCheckout = rateLimit({
  binding: 'CHECKOUT_RATE_LIMITER',
  scope: 'checkout-create',
  key: (c) => {
    const body = c.req.valid('json' as never) as { customer_id?: string; email?: string } | undefined
    return body?.customer_id || body?.email || clientIp(c)
  },
  message: 'Too many checkout attempts. Please wait a moment and try again.',
})

checkout.post('/', zValidator('json', CheckoutSchema), limitCheckout, async (c) => {
  try {
    const body = c.req.valid('json')
    const {
      items, affiliate_id, address, shipping_address_json, billing_address_json,
      customer_id, email, utm_source, utm_medium, utm_campaign,
      accepts_marketing, coupon_code, location_id
    } = body
    const locationId = location_id || DEFAULT_LOCATION_ID;

    const db = createDb(c.env.DB)

    const rawIdempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key')
    const idempotencyKey = rawIdempotencyKey ? rawIdempotencyKey.trim() : null
    const nowUnix = Math.floor(Date.now() / 1000)
    const ttlSeconds = 86400

    if (idempotencyKey) {
      await db.delete(schema.checkoutIdempotency)
        .where(lt(schema.checkoutIdempotency.expires_at, nowUnix))

      const existingRecord = await db.select()
        .from(schema.checkoutIdempotency)
        .where(eq(schema.checkoutIdempotency.key, idempotencyKey))
        .get()

      if (existingRecord) {
        if (existingRecord.status === 'completed' && existingRecord.response_json) {
          return c.json(JSON.parse(existingRecord.response_json), 200)
        }
        if (existingRecord.status === 'processing') {
          return c.json({
            success: false,
            error: 'A checkout operation with this Idempotency-Key is currently processing.'
          }, 409)
        }
      }

      const orderIdForClaim = crypto.randomUUID()
      const insertResult = await db.insert(schema.checkoutIdempotency)
        .values({
          key: idempotencyKey,
          order_id: orderIdForClaim,
          status: 'processing',
          expires_at: nowUnix + ttlSeconds,
        })
        .onConflictDoNothing()

      const changes = (insertResult as any)?.meta?.changes ?? (insertResult as any)?.changes
      if (changes === 0) {
        const recheckRecord = await db.select()
          .from(schema.checkoutIdempotency)
          .where(eq(schema.checkoutIdempotency.key, idempotencyKey))
          .get()

        if (recheckRecord?.status === 'completed' && recheckRecord.response_json) {
          return c.json(JSON.parse(recheckRecord.response_json), 200)
        }

        return c.json({
          success: false,
          error: 'A checkout operation with this Idempotency-Key is currently processing.'
        }, 409)
      }
    }

    // Feature flag 'checkout-v2' check removed; V2 checkout pipeline is permanent.

    if (!items || items.length === 0) {
      if (idempotencyKey) {
        await db.delete(schema.checkoutIdempotency).where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }
      return c.json({ success: false, error: 'Cart is empty' }, 400)
    }

    if (!customer_id && (!email || !email.includes('@'))) {
      if (idempotencyKey) {
        await db.delete(schema.checkoutIdempotency).where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }
      return c.json({ success: false, error: 'A valid email address is required for guest checkout' }, 400)
    }

    let baseShippingCents = FLAT_SHIPPING_FEE_CENTS
    if (address?.zipcode) {
      const cacheKey = `ship_${address.zipcode}`
      const cachedRate = await c.env.CACHE_KV.get(cacheKey)
      if (cachedRate) {
        baseShippingCents = parseInt(cachedRate, 10)
      } else {
        await c.env.CACHE_KV.put(cacheKey, baseShippingCents.toString(), { expirationTtl: 600 })
      }
    }

    // We no longer soft-lock. We still use validateAndReserveInventory to validate prices and compute subTotal.
    // The name `validateAndReserveInventory` might be old, but we will ignore the soft-lock part since we don't execute those queries anymore.
    let validItems: any[] = [];
    let subTotal = 0;
    let discountAmount = 0;
    let appliedCouponId: string | null | undefined;
    let shippingFeeCents = baseShippingCents;
    let taxAmountCents = 0;
    let totalAmountCents = 0;

    try {
      const normalizedItems = (items || []).map((item: any) => ({
        ...item,
        variation_id: item.variation_id || item.id,
        id: item.id || item.variation_id,
      }));
      const invRes = await InventoryService.validateAndReserveInventory(db, normalizedItems, locationId);
      validItems = invRes.validItems;
      subTotal = invRes.subTotal;

      const pricingRes = await PaymentService.calculatePricing(
        db, subTotal, customer_id, coupon_code, baseShippingCents
      );
      discountAmount = pricingRes.discountAmount;
      appliedCouponId = pricingRes.appliedCouponId;
      shippingFeeCents = pricingRes.shippingFeeCents;
      taxAmountCents = pricingRes.taxAmountCents;
      totalAmountCents = pricingRes.totalAmountCents;
    } catch (valErr: any) {
      console.error(`[Checkout] Validation/Pricing failed:`, valErr.message);
      if (idempotencyKey) {
        await db.delete(schema.checkoutIdempotency).where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }
      return c.json({ success: false, error: valErr.message || 'Inventory allocation failed.' }, 400);
    }
    
    let stripeCustomerId: string | undefined
    let customer: any = null;
    
    if (customer_id) {
      customer = await db.select().from(schema.customers).where(eq(schema.customers.id, customer_id)).get()
      if (customer) stripeCustomerId = customer.stripe_customer_id ?? undefined
    }

    let orderId = crypto.randomUUID()
    if (idempotencyKey) {
      const claimedRecord = await db.select()
        .from(schema.checkoutIdempotency)
        .where(eq(schema.checkoutIdempotency.key, idempotencyKey))
        .get()
      if (!claimedRecord?.order_id) {
        throw new Error('Checkout idempotency claim is unavailable')
      }
      orderId = claimedRecord.order_id
    }

    const attributionQueries = OrderService.getUpdateCustomerAttributionQueries(
      db, customer, customer_id as string, utm_source, utm_medium, utm_campaign, affiliate_id, accepts_marketing
    );
    if (attributionQueries.length > 0) {
      await db.batch(attributionQueries as any);
    }

    // Process Checkout via Two-Phase Commit Orchestrator
    try {
      await OrderService.processCheckout(db, c.env.DB, {
        orderId,
        customerId: customer_id,
        email,
        totalAmount: totalAmountCents,
        shippingFeeCents,
        affiliateId: affiliate_id,
        utmSource: utm_source,
        utmMedium: utm_medium,
        utmCampaign: utm_campaign,
        shippingAddressJson: shipping_address_json || address,
        billingAddressJson: billing_address_json,
        validItems,
        discountAmount,
        appliedCouponId,
        locationId
      });
    } catch (orderErr: any) {
      console.error(`[Checkout] Order creation/inventory failed for ${orderId}:`, orderErr.message);
      if (idempotencyKey) {
        await db.delete(schema.checkoutIdempotency).where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }
      return c.json({ success: false, error: orderErr.message || 'Inventory allocation failed.' }, 400);
    }

    // Inventory is successfully locked. Create Stripe Session.
    try {
      const session = await PaymentService.createStripeSession(
        c.env.STRIPE_SECRET_KEY,
        c.env.STOREFRONT_URL || 'http://localhost:3000',
        orderId,
        validItems,
        subTotal,
        discountAmount,
        shippingFeeCents,
        taxAmountCents || 0,
        email,
        stripeCustomerId,
        {
          affiliate_id: affiliate_id || '',
          utm_source: utm_source || '',
          utm_medium: utm_medium || '',
          utm_campaign: utm_campaign || ''
        }
      );

      await db
        .update(schema.orders)
        .set({ session_id: session.id })
        .where(eq(schema.orders.id, orderId))

      const responsePayload = { success: true, order_id: orderId, checkout_url: session.url }

      if (idempotencyKey) {
        await db.update(schema.checkoutIdempotency)
          .set({
            status: 'completed',
            response_json: JSON.stringify(responsePayload),
          })
          .where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }

      return c.json(responsePayload)
    } catch (stripeErr: any) {
      console.error(`[Checkout] Stripe session creation failed for order ${orderId}:`, stripeErr.message)
      
      // If Stripe fails, we must rollback the order and inventory
      // We can use the orchestrator's cancellation method
      c.executionCtx.waitUntil(OrderService.cancelOrderAndRestock(db, c.env.DB, orderId));

      if (idempotencyKey) {
        await db.delete(schema.checkoutIdempotency).where(eq(schema.checkoutIdempotency.key, idempotencyKey))
      }

      return c.json({ success: false, error: 'Payment gateway error. Please try again.' }, 500)
    }
  } catch (err: any) {
    console.error('[Checkout Error]', err)
    return c.json({ success: false, error: 'Internal checkout error' }, 500)
  }
})

export default checkout
