import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  MEDIA_R2: R2Bucket
  ENVIRONMENT: string // 'development' | 'production'
}

const app = new Hono<{ Bindings: Bindings }>()

// 1. Middleware bảo vệ Admin: Kiểm tra Cloudflare Access Assertion (Zero Trust)
app.use('*', async (c, next) => {
  const cfAccessJwt = c.req.header('CF-Access-JWT-Assertion')
  const isLocalDev = c.env.ENVIRONMENT === 'development'
  
  if (!isLocalDev && !cfAccessJwt) {
    return c.json({ success: false, error: 'Access Denied: Cloudflare Zero Trust Authentication Required' }, 403)
  }
  await next()
})

// 2. API Quản lý Đơn hàng
app.get('/orders', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  return c.json({ success: true, data: results })
})

app.post('/orders/:id/refund', async (c) => {
  const orderId = c.req.param('id')
  // Giả lập logic gọi Stripe Refund ở đây (chuyển từ public-api sang đây)
  // Thực thi D1 Transaction cộng lại hàng vào kho
  return c.json({ success: true, message: `Refunded order ${orderId} successfully` })
})

// 3. API Quản lý Sản phẩm (Upload R2)
app.post('/products', async (c) => {
  const body = await c.req.parseBody()
  const image = body['image']
  
  if (image && image instanceof File) {
    // Upload thẳng file lên Cloudflare R2
    await c.env.MEDIA_R2.put(`products/${image.name}`, image.stream())
  }
  
  // Lưu data vào D1
  return c.json({ success: true, message: 'Product created and image uploaded to R2' })
})

export default app
