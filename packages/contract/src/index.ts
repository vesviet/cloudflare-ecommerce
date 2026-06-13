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

// Schema cho Checkout (Guest & Logged In)
export const CheckoutSchema = z.object({
  email: z.string().email().optional(),
  customer_id: z.string().uuid().optional(),
  coupon_code: z.string().optional(),
  address: z.object({
    fullname: z.string().optional(),
    address: z.string().optional(),
    zipcode: z.string().optional()
  }).passthrough().optional(),
  shipping_address_json: z.record(z.any()).optional(),
  billing_address_json: z.record(z.any()).optional(),
  items: z.array(z.object({
    variation_id: z.string().uuid(),
    quantity: z.number().int().positive()
  })),
  affiliate_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  accepts_marketing: z.boolean().optional(),
}).openapi('Checkout')


// Schema API Key Response
export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string()
}).openapi('ErrorResponse')

// --- E-COMMERCE STANDARDIZATION ADDITIONS ---

export const CouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: z.enum(['percent', 'fixed', 'freeship']),
  value: z.number(),
  max_uses: z.number().int().optional(),
  uses: z.number().int().default(0),
  expires_at: z.number().int().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
}).openapi('Coupon')

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  verified_purchase: z.boolean().default(false),
  created_at: z.string().datetime(),
}).openapi('Review')

export const WishlistSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  created_at: z.string().datetime(),
}).openapi('Wishlist')

export const FulfillmentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']).default('processing'),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
  shipped_at: z.string().datetime().optional(),
  items: z.array(z.object({
    order_item_id: z.string().uuid(),
    quantity: z.number().int().positive()
  })).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).openapi('Fulfillment')

export const RMASchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  status: z.enum(['requested', 'approved', 'refunded', 'rejected']).default('requested'),
  reason: z.string(),
  refund_amount: z.number().int().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).openapi('RMA')

export * from './admin';
