import type { Context, Next } from 'hono'
import { matchesAnySecret } from '../utils/secretCompare'

export const apiKeyAuth = async (c: Context, next: Next) => {
  const apiKey = c.req.header('x-api-key')

  // Lấy danh sách API Keys hợp lệ từ biến môi trường (Ví dụ: PARTNER_API_KEYS)
  // Thực tế có thể truy vấn từ KV để linh hoạt hơn
  const validKeysString = c.env.PARTNER_API_KEYS || ''

  if (!matchesAnySecret(apiKey, validKeysString)) {
    return c.json({ success: false, error: 'Unauthorized: Invalid API Key' }, 401)
  }

  await next()
}
