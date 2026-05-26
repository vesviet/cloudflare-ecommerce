import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb, schema } from '@ecommerce/database'
import { eq, sql } from 'drizzle-orm'
import catalog from './routes/catalog'
import checkout from './routes/checkout'
import webhook from './routes/webhook'
import customer from './routes/customer'
import refund from './routes/refund'
import categories from './routes/categories'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_R2: R2Bucket
  EVENT_QUEUE: Queue
  JWT_SECRET: string
  PARTNER_API_KEYS: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS Middleware (cho phép Storefront & Admin UI gọi API local)
app.use('/*', cors({
  origin: [
    'http://localhost:3000',  // storefront-ui (Next.js)
    'http://localhost:5173',  // admin-ui (Vite)
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('E-Commerce Public API Worker is running!')
})

// Đăng ký Router
app.route('/api/products', catalog)
app.route('/api/categories', categories)
app.route('/api/checkout', checkout)
app.route('/api/webhooks', webhook)
app.route('/api', customer)
app.route('/api/refund', refund)

// Export mặc định kiểu Cloudflare Workers để hỗ trợ Queue & Cron
export default {
  // 1. Phục vụ HTTP Requests (Hono)
  fetch: app.fetch,

  // 2. Queue Consumer (Nhận Message từ Stripe Webhook)
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    for (const msg of batch.messages) {
      const payload = msg.body
      if (payload.type === 'ORDER_SUCCESS') {
        console.log(`[Queue Mock Email] Bắt đầu gửi email xác nhận cho đơn hàng: ${payload.orderId}`)
        // TODO: Gọi API Resend/SendGrid để gửi Email
        console.log(`[Queue Mock Email] Gửi thành công email đến khách hàng của đơn: ${payload.orderId}`)
      }
      msg.ack() // Xác nhận đã xử lý
    }
  },

  // 3. Cron Trigger (Chạy mỗi 5 phút)
  async scheduled(event: any, env: Bindings, ctx: any): Promise<void> {
    console.log(`[Cron] Quét đơn hàng hết hạn Soft-lock lúc ${new Date().toISOString()}`)
    const db = createDb(env.DB)
    
    const now = Math.floor(Date.now() / 1000)
    // Lấy các bản ghi soft-lock đã hết hạn
    const expiredReservations = await db.select().from(schema.inventoryReservations).where(sql`expires_at < ${now}`).all()
    
    for (const res of expiredReservations) {
      // Vì là soft-lock, tồn kho cứng chưa bị trừ. 
      // Ta xóa soft-lock và cập nhật đơn hàng thành cancelled.
      await db.update(schema.orders).set({ status: 'cancelled' }).where(eq(schema.orders.id, res.order_id))
      await db.delete(schema.inventoryReservations).where(eq(schema.inventoryReservations.id, res.id))
      console.log(`[Cron] Đã hủy đơn ${res.order_id} và giải phóng soft-lock (Variation: ${res.variation_id}, Qty: ${res.quantity})`)
    }
  }
}


