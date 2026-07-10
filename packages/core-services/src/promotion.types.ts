import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@ecommerce/database';

export interface PromotionContext {
  db: any; // DrizzleD1Database<typeof schema>
  subTotalCents: number;
  customer_id?: string;
  customer_email?: string;
  coupon_code?: string;
  cart_items?: Array<{ product_id: string; quantity: number; price: number }>;
  base_shipping_cents: number;
  redeem_points?: number; // Loyalty points user wants to use
}

export type CouponErrorCode =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_NOT_STARTED'
  | 'COUPON_EXHAUSTED'
  | 'COUPON_MIN_ORDER'    // NEW — triggers "Minimum order $X required"
  | 'COUPON_PER_CUSTOMER_LIMIT' // NEW
  | 'COUPON_INACTIVE'
  | 'LOYALTY_INSUFFICIENT_BALANCE';

export interface PromotionResult {
  discount_amount: number;
  shipping_fee_cents: number;
  tax_amount_cents: number;
  total_amount_cents: number;
  applied_coupon_id: string | null;
  coupon_error?: CouponErrorCode; // NEW — specific error for FE display
  discount_breakdown: Array<{ type: string; amount: number; description: string }>;
  loyalty_points_applied?: number;
}
