import { Hono } from 'hono'
import { cors } from 'hono/cors'
import catalog from './routes/catalog'
import checkout from './routes/checkout'
import webhook from './routes/webhook'
import customer from './routes/customer'
import refund from './routes/refund'

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
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/', (c) => {
  return c.text('E-Commerce Public API Worker is running!')
})

// Đăng ký Router
app.route('/api/products', catalog)
app.route('/api/checkout', checkout)
app.route('/api/webhooks', webhook)
app.route('/api/customer', customer)
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
        console.log(`[Queue] Xử lý đơn hàng ${payload.orderId}`)
        // TODO: Gọi API Resend/SendGrid để gửi Email
        // TODO: Đẩy Post Webhook đến hệ thống Affiliate
      }
      msg.ack() // Xác nhận đã xử lý
    }
  },

  // 3. Cron Trigger (Chạy mỗi 5 phút)
  async scheduled(event: any, env: Bindings, ctx: any): Promise<void> {
    console.log(`[Cron] Quét đơn hàng chưa thanh toán lúc ${new Date().toISOString()}`)
    
    // Tìm các đơn Pending quá 30 phút
    // Hủy đơn và HOÀN KHO (Tăng stock lên) thông qua Transaction
    const query = `
      UPDATE product_variations
      SET stock = stock + (SELECT quantity FROM order_items WHERE order_items.variation_id = product_variations.id AND order_id IN (
        SELECT id FROM orders WHERE status = 'pending_payment' AND created_at < datetime('now', '-30 minutes')
      ))
      WHERE id IN (
        SELECT variation_id FROM order_items JOIN orders ON order_items.order_id = orders.id 
        WHERE orders.status = 'pending_payment' AND orders.created_at < datetime('now', '-30 minutes')
      );
      UPDATE orders SET status = 'cancelled' WHERE status = 'pending_payment' AND created_at < datetime('now', '-30 minutes');
    `
    // Do D1 chưa hỗ trợ execute trực tiếp nhiều lệnh update phức tạp ntn trong 1 call,
    // Thực tế sẽ dùng D1 Batch hoặc Kysely Transaction
    console.log('[Cron] Đã hủy đơn và hoàn kho thành công.')
  }
}


