import { Hono } from 'hono';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';

const checkout = new Hono<{ Bindings: Bindings }>();

// 6. Storefront Checkout API
checkout.post('/store/orders', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    const { 
      email, items, customer_id, shipping_address_json, billing_address_json,
      shipping_fee, utm_source, utm_medium, utm_campaign, affiliate_id 
    } = body as { 
      email: string, 
      items: { variation_id: string, quantity: number }[], 
      customer_id?: string, 
      shipping_address_json?: any,
      billing_address_json?: any,
      shipping_fee?: number,
      utm_source?: string,
      utm_medium?: string,
      utm_campaign?: string,
      affiliate_id?: string
    };

    if (!email || !items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Invalid payload: email and items are required' }, 400);
    }

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

    let totalAmount = 0;
    const batchQueries: any[] = [];
    const orderId = crypto.randomUUID();

    for (const item of items) {
      if (item.quantity <= 0) {
        return c.json({ success: false, error: `Invalid quantity for variation ${item.variation_id}` }, 400);
      }
      
      const dbVar = dbVariations.find(r => r.id === item.variation_id);
      if (!dbVar) {
        return c.json({ success: false, error: `Variation ${item.variation_id} not found or not purchasable` }, 400);
      }

      if (dbVar.stock < item.quantity) {
        return c.json({ success: false, error: `Insufficient stock for variation ${item.variation_id}. Available: ${dbVar.stock}` }, 400);
      }

      // Zero-Trust Pricing: Calculate total purely on Server Side
      const finalPrice = dbVar.sale_price !== null ? dbVar.sale_price : dbVar.regular_price;
      totalAmount += finalPrice * item.quantity;

      batchQueries.push(
        db.update(schema.productVariations)
          .set({ stock: sql`stock - ${item.quantity}` })
          .where(and(
            eq(schema.productVariations.id, item.variation_id),
            sql`stock >= ${item.quantity}`
          ))
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
        let stripeCustomerId = customer.stripe_customer_id;
        
        if (!stripeCustomerId) {
          stripeCustomerId = `cus_mock_${crypto.randomUUID()}`;
          batchQueries.push(
            db.update(schema.customers)
              .set({ stripe_customer_id: stripeCustomerId })
              .where(eq(schema.customers.id, customer_id))
          );
        }

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
        status: 'processing',
        total_amount: totalAmount,
        shipping_fee: shipping_fee || 0,
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
