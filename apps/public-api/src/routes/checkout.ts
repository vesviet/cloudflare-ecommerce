import { Hono } from 'hono'

const checkout = new Hono<{ Bindings: { DB: D1Database, CACHE_KV: KVNamespace } }>()

checkout.post('/', async (c) => {
  const body = await c.req.json()
  const { items, affiliate_id } = body
  
  if (!items || items.length === 0) {
    return c.json({ success: false, error: 'Cart is empty' }, 400)
  }
  
  // BƯỚC 1: Tính toán Shipping (Sử dụng KV Cache để tránh gọi API FedEx liên tục)
  // const cachedRate = await c.env.CACHE_KV.get(`ship_${body.zipcode}`)
  
  // BƯỚC 2: Kiểm tra tồn kho và lấy giá gốc từ D1 (Tránh việc User sửa giá trên Frontend)
  
  // BƯỚC 3: Tạo Stripe Payment Intent (lưu Affiliate ID vào metadata)
  // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
  // const paymentIntent = await stripe.paymentIntents.create({
  //   amount: totalAmount * 100,
  //   currency: 'usd',
  //   metadata: { 
  //       order_id: 'ord_123',
  //       affiliate_id: affiliate_id || null // Lưu dấu vết hoa hồng
  //   }
  // })

  return c.json({ 
    success: true, 
    clientSecret: 'pi_mock_secret_123',
    message: 'Mock Stripe Payment Intent Created' 
  })
})

export default checkout
