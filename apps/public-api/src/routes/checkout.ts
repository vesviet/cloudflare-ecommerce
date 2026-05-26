import { Hono } from 'hono'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql } from 'drizzle-orm'

const checkout = new Hono<{ Bindings: { DB: D1Database, CACHE_KV: KVNamespace } }>()

checkout.post('/', async (c) => {
  const body = await c.req.json()
  const { 
    items, affiliate_id, address, shipping_address_json, billing_address_json,
    customer_id, email, utm_source, utm_medium, utm_campaign 
  } = body
  
  if (!items || items.length === 0) {
    return c.json({ success: false, error: 'Cart is empty' }, 400)
  }
  
  const db = createDb(c.env.DB)
  
  // BƯỚC 1: Tính toán Shipping (Fallback mechanism)
  // Flat rate mặc định
  let shippingFee = 10;
  if (address && address.zipcode) {
    // Giả lập gọi API FedEx/USPS, cache vào KV
    const cacheKey = `ship_${address.zipcode}`;
    const cachedRate = await c.env.CACHE_KV.get(cacheKey);
    if (cachedRate) {
      shippingFee = parseFloat(cachedRate);
    } else {
      // Mock lấy giá từ FedEx thời gian thực
      shippingFee = 15.5; 
      await c.env.CACHE_KV.put(cacheKey, shippingFee.toString(), { expirationTtl: 600 }); // cache 10 mins
    }
  }
  
  // BƯỚC 2: Kiểm tra tồn kho và lấy giá gốc từ D1
  let subTotal = 0;
  const validItems = [];
  
  for (const item of items) {
    const variation = await db.select().from(schema.productVariations).where(eq(schema.productVariations.id, item.variation_id)).get();
    
    if (!variation || variation.is_purchasable === 0) {
      return c.json({ success: false, error: `Product variation ${item.variation_id} is invalid` }, 400);
    }
    
    // Tính tổng stock đang bị soft-lock
    const now = Math.floor(Date.now() / 1000);
    const reservations = await db.select().from(schema.inventoryReservations)
      .where(sql`variation_id = ${item.variation_id} AND expires_at > ${now}`).all();
    
    const reservedQuantity = reservations.reduce((sum, res) => sum + res.quantity, 0);
    const availableStock = variation.stock - reservedQuantity;

    if (availableStock < item.quantity) {
      return c.json({ success: false, error: `Product variation ${item.variation_id} is out of stock (Available: ${availableStock})` }, 400);
    }
    
    const price = variation.sale_price ?? variation.regular_price;
    subTotal += price * item.quantity;
    
    validItems.push({
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: price
    });
  }
  
  const totalAmount = subTotal + shippingFee;
  
  // Stripe Customer ID & UTM/Affiliate Attribution for logged-in user
  if (customer_id) {
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, customer_id)).get();
    if (customer) {
      let stripeCustomerId = customer.stripe_customer_id;
      
      // If customer doesn't have a Stripe Customer ID, generate and update it (Mock Stripe API integration)
      if (!stripeCustomerId) {
        stripeCustomerId = `cus_mock_${crypto.randomUUID()}`;
        await db.update(schema.customers)
          .set({ stripe_customer_id: stripeCustomerId })
          .where(eq(schema.customers.id, customer_id));
      }

      // If the customer has empty signup attribution, update them with checkout params (first purchase)
      const shouldUpdateAttribution = !customer.signup_utm_source && !customer.signup_utm_medium && !customer.signup_utm_campaign && !customer.signup_affiliate_id;
      if (shouldUpdateAttribution && (utm_source || utm_medium || utm_campaign || affiliate_id)) {
        await db.update(schema.customers)
          .set({
            signup_utm_source: utm_source || null,
            signup_utm_medium: utm_medium || null,
            signup_utm_campaign: utm_campaign || null,
            signup_affiliate_id: affiliate_id || null,
          })
          .where(eq(schema.customers.id, customer_id));
      }
    }
  }

  // BƯỚC 3: Tạo đơn hàng và Soft-lock tồn kho
  const orderId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 phút soft-lock
  
  // Khởi tạo trạng thái pending_payment với thông tin đầy đủ
  await db.insert(schema.orders).values({
    id: orderId,
    customer_id: customer_id || null,
    guest_email: customer_id ? null : email,
    status: 'pending_payment',
    total_amount: totalAmount,
    shipping_fee: shippingFee,
    affiliate_id: affiliate_id || null,
    utm_source: utm_source || null,
    shipping_address_json: shipping_address_json ? JSON.stringify(shipping_address_json) : (address ? JSON.stringify(address) : null),
    billing_address_json: billing_address_json ? JSON.stringify(billing_address_json) : null,
  });
  
  for (const item of validItems) {
    await db.insert(schema.orderItems).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    });
    
    // Soft-lock trong bảng inventory_reservations
    await db.insert(schema.inventoryReservations).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      variation_id: item.variation_id,
      quantity: item.quantity,
      expires_at: expiresAt
    });
  }
  
  // BƯỚC 4: Tạo Stripe Checkout Session (Mock)
  // Thực tế sẽ dùng Stripe SDK, cấu hình automatic_tax: { enabled: true }
  const stripeSessionId = `cs_mock_${crypto.randomUUID()}`;
  const stripeCheckoutUrl = `https://checkout.stripe.com/pay/${stripeSessionId}`;
  
  // Cập nhật payment_intent_id với session_id (để webhook query ra đơn hàng)
  await db.update(schema.orders)
    .set({ payment_intent_id: stripeSessionId })
    .where(eq(schema.orders.id, orderId));

  return c.json({ 
    success: true, 
    order_id: orderId,
    checkout_url: stripeCheckoutUrl,
    stripe_session_id: stripeSessionId,
    message: 'Stripe Checkout Session Created & Inventory Soft-locked' 
  })
})

export default checkout
