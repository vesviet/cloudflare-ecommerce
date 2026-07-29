import { z } from '@hono/zod-openapi'
import {
  adminUserSchema,
  adminUserStatusSchema,
  categorySchema,
  updateCategorySchema,
  cmsSchema,
  updateCmsSchema,
  customerSchema,
  resetPasswordSchema,
  fulfillSchema,
  productFormSchema,
  couponSchema,
  updateCouponSchema,
} from './admin'

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
  location_id: z.string().optional(),
  address: z.object({
    fullname: z.string().optional(),
    address: z.string().optional(),
    zipcode: z.string().optional()
  }).passthrough().optional(),
  shipping_address_json: z.record(z.any()).optional(),
  billing_address_json: z.record(z.any()).optional(),
  items: z.array(z.object({
    variation_id: z.string(),
    quantity: z.number().int().positive()
  })),
  affiliate_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  accepts_marketing: z.union([z.boolean(), z.number().transform(v => Boolean(v))]).optional(),
  turnstileToken: z.string().optional(),
  redeem_points: z.number().int().nonnegative().optional(),
  b2b_company: z.string().optional(),
  b2b_vat_id: z.string().optional(),
}).openapi('Checkout')

// Alias checkoutSchema to CheckoutSchema for compatibility
export const checkoutSchema = CheckoutSchema

// Schema API Key Response
export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string()
}).openapi('ErrorResponse')

// --- E-COMMERCE STANDARDIZATION ADDITIONS ---

export const CouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: z.enum(['percent', 'fixed', 'freeship', 'percentage', 'free_shipping']),
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

export const PostReviewSchema = z.object({
  product_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

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

// --- CART SCHEMAS ---
export const CartItemSchema = z.object({
  id: z.string().optional(),
  variation_id: z.string(),
  product_id: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().optional(),
  title: z.string().optional(),
})

export const CartSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().optional(),
  items: z.array(CartItemSchema),
  updated_at: z.string().optional(),
})

export const AddToCartSchema = z.object({
  variation_id: z.string(),
  quantity: z.number().int().positive().default(1),
})

// --- WISHLIST INPUT SCHEMAS ---
export const WishlistAddSchema = z.object({
  productId: z.string().min(1).max(64),
})

export const WishlistMergeSchema = z.object({
  productIds: z.array(z.string().min(1).max(64)).max(200),
})

// --- SHARED ROUTE SCHEMAS ---
export const CustomerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  vatTaxId: z.string().optional().nullable(),
  acceptsMarketing: z.union([z.boolean(), z.number().transform(v => Boolean(v))]).optional(),
  signupUtmSource: z.string().optional().nullable(),
  signupUtmMedium: z.string().optional().nullable(),
  signupUtmCampaign: z.string().optional().nullable(),
  signupAffiliateId: z.string().optional().nullable(),
})

export const CustomerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const CustomerAddressSchema = z.object({
  alias: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  company: z.string().optional().nullable(),
  address_1: z.string().min(1),
  address_2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().optional().nullable(),
  postcode: z.string().min(1),
  country: z.string().optional(),
  phone: z.string().optional().nullable(),
  vat_id: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  delivery_instructions: z.string().optional().nullable(),
})

// Profile self-service update (PUT /customer/me). All fields optional so partial
// updates are allowed; unknown keys are stripped by Zod's default object behavior.
export const CustomerProfileUpdateSchema = z.object({
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().max(30).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  vat_tax_id: z.string().max(50).optional().nullable(),
  accepts_marketing: z.union([z.boolean(), z.number().transform(v => Boolean(v))]).optional(),
})

// Re-export admin schemas
export * from './admin'
// Export Inferred Types
export type Product = z.infer<typeof ProductSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type Coupon = z.infer<typeof CouponSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type PostReviewInput = z.infer<typeof PostReviewSchema>;
export type Wishlist = z.infer<typeof WishlistSchema>;
export type Fulfillment = z.infer<typeof FulfillmentSchema>;
export type FulfillInput = z.infer<typeof fulfillSchema>;
export type RMA = z.infer<typeof RMASchema>;

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type Category = z.infer<typeof categorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type CMSItem = z.infer<typeof cmsSchema>;
export type UpdateCMSItem = z.infer<typeof updateCmsSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ProductForm = z.infer<typeof productFormSchema>;

export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type WishlistAddInput = z.infer<typeof WishlistAddSchema>;
export type WishlistMergeInput = z.infer<typeof WishlistMergeSchema>;
export type CustomerRegisterInput = z.infer<typeof CustomerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof CustomerLoginSchema>;
export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
export type CustomerProfileUpdateInput = z.infer<typeof CustomerProfileUpdateSchema>;
