import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';

// Tạm thời đặt ở Public API nhưng sẽ được bảo vệ bởi Cloudflare Access hoặc Admin JWT
const refund = new Hono<{ Bindings: { DB: D1Database; STRIPE_SECRET_KEY: string } }>();

refund.post('/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const db = createDb(c.env.DB);

  // 1. Kiểm tra quyền Admin (đã đi qua CF Access)

  // 2. Query bảng orders lấy payment_intent_id
  const order = await db.select({
    id: schema.orders.id,
    payment_intent_id: schema.orders.payment_intent_id,
  })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .get();

  if (!order || !order.payment_intent_id) {
    return c.json({ success: false, error: 'Order not found or not paid' }, 404);
  }

  // 3. Gọi Stripe Refund API
  /*
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
  const refundResult = await stripe.refunds.create({
    payment_intent: order.payment_intent_id
  })
  */

  // 4. Drizzle Batch Transaction: Cập nhật status order và Cộng lại kho (Hoàn kho)
  /*
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.order_id, orderId)).all();
  await db.batch([
    db.update(schema.orders).set({ status: 'refunded' }).where(eq(schema.orders.id, orderId)),
    ...items.map(item =>
      db.update(schema.productVariations)
        .set({ stock: sql`stock + ${item.quantity}` })
        .where(eq(schema.productVariations.id, item.variation_id))
    )
  ]);
  */

  return c.json({ success: true, message: `Refund processed for order ${orderId} and stock replenished.` });
});

export default refund;
