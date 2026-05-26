import { Hono } from 'hono'
import { jwtAuth } from '../middlewares/jwtAuth'

const customer = new Hono<{ Bindings: { DB: D1Database, JWT_SECRET: string } }>()

// Đăng nhập / Sinh Token
customer.post('/login', async (c) => {
  // Xử lý xác thực hash mật khẩu với D1
  // Sinh JWT
  return c.json({ success: true, token: 'mock-jwt-token-123' })
})

// Các API bên dưới bị khóa bởi jwtAuth Middleware
customer.use('/*', jwtAuth)

// Lấy thông tin cá nhân
customer.get('/profile', async (c) => {
  const payload = c.get('jwtPayload') // Hono tự động gán payload sau khi giải mã
  return c.json({ success: true, user: payload })
})

// Lấy lịch sử mua hàng
customer.get('/orders', async (c) => {
  const payload = c.get('jwtPayload')
  // Query bảng orders WHERE customer_id = payload.id (Chống IDOR)
  return c.json({ success: true, data: [] })
})

export default customer
