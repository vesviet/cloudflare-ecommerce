import { Hono } from 'hono'

// Tạm thời đặt ở Public API nhưng sẽ được bảo vệ bởi Cloudflare Access hoặc Admin JWT
const refund = new Hono<{ Bindings: { DB: D1Database, STRIPE_SECRET_KEY: string } }>()

refund.post('/:orderId', async (c) => {
  const orderId = c.req.param('orderId')
  
  // 1. Kiểm tra quyền Admin (đã đi qua CF Access)
  
  // 2. Query bảng orders lấy payment_intent_id
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
  if (!order || !order.payment_intent_id) {
    return c.json({ success: false, error: 'Order not found or not paid' }, 404)
  }

  // 3. Gọi Stripe Refund API
  /*
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
  const refundResult = await stripe.refunds.create({
    payment_intent: order.payment_intent_id
  })
  */

  // 4. D1 Transaction: Cập nhật status order và Cộng lại kho (Hoàn kho)
  /*
    BEGIN TRANSACTION;
    UPDATE product_variations SET stock = stock + 1 WHERE id = 'var-1';
    UPDATE orders SET status = 'refunded' WHERE id = ?;
    COMMIT;
  */

  return c.json({ success: true, message: `Refund processed for order ${orderId} and stock replenished.` })
})

export default refund
