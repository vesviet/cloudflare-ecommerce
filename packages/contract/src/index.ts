import { z } from '@hono/zod-openapi'

// Schema cho Sản phẩm (Catalog)
export const ProductSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  slug: z.string().openapi({ example: 'iphone-15-pro' }),
  title: z.string().openapi({ example: 'iPhone 15 Pro' }),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).openapi('Product')

// Schema cho Khách vãng lai (Guest Checkout)
export const GuestCheckoutSchema = z.object({
  email: z.string().email().openapi({ example: 'guest@example.com' }),
  shipping_address: z.object({
    fullname: z.string(),
    address: z.string(),
    zipcode: z.string()
  }),
  items: z.array(z.object({
    variation_id: z.string().uuid(),
    quantity: z.number().int().positive()
  })),
  affiliate_id: z.string().optional()
}).openapi('GuestCheckout')

// Schema API Key Response
export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string()
}).openapi('ErrorResponse')
