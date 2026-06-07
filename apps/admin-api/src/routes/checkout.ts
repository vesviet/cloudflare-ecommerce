import { Hono } from 'hono';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { checkoutSchema } from '@ecommerce/contract';

const checkout = new Hono<{ Bindings: Bindings }>();

checkout.post('/store/orders', requireRole(['superadmin', 'manager', 'editor']), zValidator('json', checkoutSchema), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { 
      email, items, customer_id, shipping_address_json, billing_address_json,
      utm_source, utm_medium, utm_campaign, affiliate_id 
    } = c.req.valid('json');

    // Two-Step Check 1: Select current variations from DB to prevent Price Tampering and check Stock
    const variationIds = items.map(i => i.variation_id);
    const dbVariations = await db.select({
      id: schema.productVariations.id,
      stock: schema.productVariations.stock,
      sale_price: schema.productVariations.sale_price,
      regular_price: schema.productVariations.regular_price,
    })
      .from(schema.productVariations)
      .where(and(
        inArray(schema.productVariations.id, variationIds),
        eq(schema.productVariations.is_purchasable, 1)
      ))
      .all();

    // Fetch active reservations for soft-locks
    const now = Math.floor(Date.now() / 1000);
    const allReservations = await db
      .select()
      .from(schema.inventoryReservations)
      .where(sql`variation_id IN (${sql.join(variationIds, sql`, `)}) AND expires_at > ${now}`)
      .all();

    const reservationMap = new Map<string, number>();
    for (const res of allReservations) {
      reservationMap.set(res.variation_id, (reservationMap.get(res.variation_id) || 0) + res.quantity);
    }

    let totalAmount = 0;
    const batchQueries: any[] = [];
    const orderId = crypto.randomUUID();
    const expiresAt = now + 30 * 60; // 30 minutes soft-lock

    for (const item of items) {
      if (item.quantity <= 0) {
        return c.json({ success: false, error: `Invalid quantity for variation ${item.variation_id}` }, 400);
      }
      
      const dbVar = dbVariations.find(r => r.id === item.variation_id);
      if (!dbVar) {
        return c.json({ success: false, error: `Variation ${item.variation_id} not found or not purchasable` }, 400);
      }

      const reservedQuantity = reservationMap.get(item.variation_id) || 0;
      const availableStock = dbVar.stock - reservedQuantity;

      if (availableStock < item.quantity) {
        return c.json({ success: false, error: `Insufficient stock for variation ${item.variation_id}. Available: ${availableStock}` }, 400);
      }

      // Zero-Trust Pricing: Calculate total purely on Server Side
      const finalPrice = dbVar.sale_price !== null ? dbVar.sale_price : dbVar.regular_price;
      totalAmount += finalPrice * item.quantity;

      // Soft-lock inventory instead of hard-decrementing, since this mimics the public flow for COD/POS
      batchQueries.push(
        db.insert(schema.inventoryReservations).values({
          id: crypto.randomUUID(),
          order_id: orderId,
          variation_id: item.variation_id,
          quantity: item.quantity,
          expires_at: expiresAt,
        })
      );
      
      batchQueries.push(
        db.insert(schema.orderItems).values({
          id: crypto.randomUUID(),
          order_id: orderId,
          variation_id: item.variation_id,
          quantity: item.quantity,
          price_at_purchase: finalPrice,
        })
      );
    }

    // Flat shipping fee similar to public checkout
    const shippingFeeCents = 999;
    totalAmount += shippingFeeCents;

    // Stripe Customer ID & UTM/Affiliate Attribution for logged-in user
    if (customer_id) {
      const customer = await db.select({
        stripe_customer_id: schema.customers.stripe_customer_id,
        signup_utm_source: schema.customers.signup_utm_source,
        signup_utm_medium: schema.customers.signup_utm_medium,
        signup_utm_campaign: schema.customers.signup_utm_campaign,
        signup_affiliate_id: schema.customers.signup_affiliate_id,
      })
        .from(schema.customers)
        .where(eq(schema.customers.id, customer_id))
        .get();

      if (customer) {
        const shouldUpdateAttribution = !customer.signup_utm_source && !customer.signup_utm_medium && !customer.signup_utm_campaign && !customer.signup_affiliate_id;
        if (shouldUpdateAttribution && (utm_source || utm_medium || utm_campaign || affiliate_id)) {
          batchQueries.push(
            db.update(schema.customers)
              .set({
                signup_utm_source: utm_source || null,
                signup_utm_medium: utm_medium || null,
                signup_utm_campaign: utm_campaign || null,
                signup_affiliate_id: affiliate_id || null,
              })
              .where(eq(schema.customers.id, customer_id))
          );
        }
      }
    }

    // Add Order Insert at the beginning of the batch
    batchQueries.unshift(
      db.insert(schema.orders).values({
        id: orderId,
        customer_id: customer_id || null,
        guest_email: customer_id ? null : email,
        status: 'pending_payment',
        total_amount: totalAmount,
        shipping_fee: shippingFeeCents,
        affiliate_id: affiliate_id || null,
        utm_source: utm_source || null,
        shipping_address_json: shipping_address_json ? JSON.stringify(shipping_address_json) : null,
        billing_address_json: billing_address_json ? JSON.stringify(billing_address_json) : null,
      })
    );

    // Execute Batch
    await db.batch(batchQueries as any);

    return c.json({ success: true, message: 'Order created successfully', orderId, totalAmount });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default checkout;
