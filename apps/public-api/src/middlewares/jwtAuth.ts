import { jwt } from 'hono/jwt'
import type { Context, Next } from 'hono'

export const jwtAuth = async (c: Context, next: Next) => {
  // Lấy JWT_SECRET từ biến môi trường của Cloudflare Worker
  const secret = c.env.JWT_SECRET

  if (!secret) {
    return c.json({ success: false, error: 'Internal Server Error: Missing JWT_SECRET' }, 500)
  }

  const jwtMiddleware = jwt({
    secret,
    alg: 'HS256'
  })

  // Gọi middleware jwt của hono
  return jwtMiddleware(c, next)
}
