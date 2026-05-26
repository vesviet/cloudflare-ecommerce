import { Hono } from 'hono'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql } from 'drizzle-orm'

const webhook = new Hono<{ Bindings: { DB: D1Database, EVENT_QUEUE: Queue } }>()

webhook.post('/stripe', async (c) => {
  // 1. Verify Stripe Signature từ Web Crypto API
  // Mock verification cho MVP
  const body = await c.req.json()
  
  // Giả lập dữ liệu Stripe event (thực tế sẽ được parse và verify từ Stripe SDK)
  const event = body.type ? body : {
    id: `evt_mock_${crypto.randomUUID()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: body.data?.object?.id || 'cs_mock_123'
      }
    }
  }
  
  const db = createDb(c.env.DB)
  
  // 2. Chống trùng lặp (Idempotency)
  const existingEvent = await db.select().from(schema.idempotencyKeys).where(eq(schema.idempotencyKeys.id, event.id)).get()
  if (existingEvent) {
    return c.json({ received: true, message: 'Event already processed' })
  }
  
  await db.insert(schema.idempotencyKeys).values({
    id: event.id,
    event_type: event.type
  })

  // 3. Xử lý sự kiện thanh toán thành công
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const sessionId = event.data.object.id
    
    // Tìm đơn hàng tương ứng
    const order = await db.select().from(schema.orders).where(eq(schema.orders.payment_intent_id, sessionId)).get()
    
    if (order && order.status === 'pending_payment') {
      const orderItems = await db.select().from(schema.orderItems).where(eq(schema.orderItems.order_id, order.id)).all()
      
      const batchQueries: any[] = [];

      // Trừ kho cứng (Hard-lock)
      for (const item of orderItems) {
        batchQueries.push(
          db.update(schema.productVariations)
            .set({ stock: sql`stock - ${item.quantity}` })
            .where(eq(schema.productVariations.id, item.variation_id))
        );
      }
      
      // Xóa bản ghi Soft-lock
      batchQueries.push(
        db.delete(schema.inventoryReservations).where(eq(schema.inventoryReservations.order_id, order.id))
      );
      
      // Chuyển trạng thái đơn hàng
      batchQueries.push(
        db.update(schema.orders)
          .set({ status: 'processing' })
          .where(eq(schema.orders.id, order.id))
      );

      // Execute in a single D1 transaction batch
      await db.batch(batchQueries as any);
      
      // Đẩy vào Cloudflare Queues để Worker khác gửi Email
      if (c.env.EVENT_QUEUE) {
        await c.env.EVENT_QUEUE.send({ 
          type: 'ORDER_SUCCESS', 
          orderId: order.id,
          emailEvent: 'order_confirmation'
        })
      }
    }
  }
  
  return c.json({ received: true })
})

export default webhook
