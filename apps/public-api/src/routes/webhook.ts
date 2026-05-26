import { Hono } from 'hono'

const webhook = new Hono<{ Bindings: { DB: D1Database, EVENT_QUEUE: Queue } }>()

webhook.post('/stripe', async (c) => {
  // 1. Verify Stripe Signature từ Web Crypto API
  
  // 2. D1 Transaction: Chống trùng lặp (Idempotency) & Trừ kho
  // Sử dụng mệnh đề CHECK stock >= ? đã khai báo ở DB
  /*
    BEGIN TRANSACTION;
    UPDATE product_variations SET stock = stock - 1 WHERE id = 'var-1' AND stock >= 1;
    UPDATE orders SET status = 'processing' WHERE payment_intent_id = 'pi_123';
    COMMIT;
  */
  
  // 3. Đẩy vào Cloudflare Queues để Worker khác gửi Email
  await c.env.EVENT_QUEUE.send({ type: 'ORDER_SUCCESS', orderId: 'mock-order-uuid' })
  
  return c.json({ received: true })
})

export default webhook
