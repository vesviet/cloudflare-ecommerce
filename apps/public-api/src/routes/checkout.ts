import { Hono } from 'hono'
import { createDb, schema } from '@ecommerce/database'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { CheckoutSchema } from '@ecommerce/contract'
import { InventoryService, PaymentService, OrderService } from '@ecommerce/core-services'

import { getSetting } from '../utils/settingsCache'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  STRIPE_SECRET_KEY: string
  STOREFRONT_URL: string
  ENVIRONMENT?: string
}

const FLAT_SHIPPING_FEE_CENTS = 999 

const checkout = new Hono<{ Bindings: Bindings }>()

checkout.post('/', zValidator('json', CheckoutSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const {
      items, affiliate_id, address, shipping_address_json, billing_address_json,
      customer_id, email, utm_source, utm_medium, utm_campaign,
      accepts_marketing, coupon_code, location_id
    } = body
    const locationId = location_id || 'loc-1';

    const db = createDb(c.env.DB)

    // Progressive Delivery: Feature Flag
    const isCheckoutV2Enabled = await getSetting(db, 'checkout-v2', true)

    if (!isCheckoutV2Enabled) {
      // NOTE: Fallback to old checkout behavior if needed.
      // For now, we will proceed but log a warning or execute V1 logic if it differs.
      console.log('[Checkout] Using V1 Logic (V2 disabled)')
    } else {
      console.log('[Checkout] Using V2 Logic')
    }

    if (!items || items.length === 0) {
      return c.json({ success: false, error: 'Cart is empty' }, 400)
    }

    if (!customer_id && (!email || !email.includes('@'))) {
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
      const invRes = await InventoryService.validateAndReserveInventory(db, items, locationId);
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
      return c.json({ success: false, error: valErr.message || 'Inventory allocation failed.' }, 400);
    }
    
    let stripeCustomerId: string | undefined
    let customer: any = null;
    
    if (customer_id) {
      customer = await db.select().from(schema.customers).where(eq(schema.customers.id, customer_id)).get()
      if (customer) stripeCustomerId = customer.stripe_customer_id ?? undefined
    }

    const orderId = crypto.randomUUID()

    const attributionQueries = OrderService.getUpdateCustomerAttributionQueries(
      db, customer, customer_id as string, utm_source, utm_medium, utm_campaign, affiliate_id, accepts_marketing
    );
    if (attributionQueries.length > 0) {
      await db.batch(attributionQueries as any);
    }

    // Process Checkout via Two-Phase Commit Orchestrator
    try {
      await OrderService.processCheckout(db, c.env, {
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

      return c.json({ success: true, order_id: orderId, checkout_url: session.url })
    } catch (stripeErr: any) {
      console.error(`[Checkout] Stripe session creation failed for order ${orderId}:`, stripeErr.message)
      
      // If Stripe fails, we must rollback the order and inventory
      // We can use the orchestrator's cancellation method
      c.executionCtx.waitUntil(OrderService.cancelOrderAndRestock(db, c.env, orderId));

      return c.json({ success: false, error: 'Payment gateway error. Please try again.' }, 500)
    }
  } catch (err: any) {
    console.error('[Checkout Error]', err)
    return c.json({ success: false, error: err.message || 'Internal checkout error' }, 500)
  }
})

export default checkout
