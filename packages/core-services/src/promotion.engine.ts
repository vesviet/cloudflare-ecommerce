import { eq, and, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';
import { PromotionContext, PromotionResult, CouponErrorCode } from './promotion.types';

export class PromotionEngine {
  static async evaluate(ctx: PromotionContext): Promise<PromotionResult> {
    let discount_amount = 0;
    let shipping_fee_cents = ctx.base_shipping_cents;
    let applied_coupon_id: string | null = null;
    let coupon_error: CouponErrorCode | undefined;
    const discount_breakdown: Array<{ type: string; amount: number; description: string }> = [];

    // VIP Discount evaluation
    let vipDiscount = 0;
    let loyaltyBalance = 0;
    if (ctx.customer_id) {
      const customerRecord = await ctx.db.select().from(localSchema.customers).where(eq(localSchema.customers.id, ctx.customer_id)).get();
      if (customerRecord) {
        if (customerRecord.metafields_json) {
          try {
            const metafields = JSON.parse(customerRecord.metafields_json);
            loyaltyBalance = metafields.loyalty_points_balance || 0;
          } catch(e) {}
        }
        if (customerRecord.loyalty_points_balance !== undefined) {
          loyaltyBalance = customerRecord.loyalty_points_balance;
        }
        if (customerRecord.tags_json) {
          try {
            const tags = JSON.parse(customerRecord.tags_json);
            if (tags.includes('VIP')) {
              vipDiscount = Math.round(ctx.subTotalCents * 0.10);
            }
          } catch(e) {}
        }
      }
    }

    // Loyalty evaluation
    let loyaltyDiscount = 0;
    let appliedLoyaltyPoints = 0;
    if (ctx.redeem_points && ctx.redeem_points > 0) {
      if (!ctx.customer_id) {
        coupon_error = 'LOYALTY_INSUFFICIENT_BALANCE';
      } else if (loyaltyBalance < ctx.redeem_points) {
        coupon_error = 'LOYALTY_INSUFFICIENT_BALANCE';
      } else {
        appliedLoyaltyPoints = ctx.redeem_points;
        // 1 point = 1 VND (mapped directly to subTotalCents since it is in VND)
        loyaltyDiscount = appliedLoyaltyPoints; 
      }
    }

    // Promotion (Coupon) evaluation
    let couponDiscount = 0;
    let couponRecord: any = null;
    let isFreeShipCoupon = false;
    let couponValid = false;

    if (ctx.coupon_code) {
      const code = ctx.coupon_code.toUpperCase();
      couponRecord = await ctx.db.select().from(localSchema.promotions).where(eq(localSchema.promotions.code, code)).get();

      
      if (!couponRecord) {
        coupon_error = 'COUPON_NOT_FOUND';
      } else {
        const isActive = couponRecord.is_active !== undefined ? couponRecord.is_active : (couponRecord.status === 'active' ? 1 : 0);
        const expiresAt = couponRecord.expires_at !== undefined ? couponRecord.expires_at : couponRecord.ends_at;
        const maxUses = couponRecord.max_uses !== undefined ? couponRecord.max_uses : couponRecord.usage_limit;
        const uses = couponRecord.uses !== undefined ? couponRecord.uses : couponRecord.times_used;
        const startsAt = couponRecord.starts_at;
        const minOrderAmount = couponRecord.min_order_amount;

        if (isActive !== 1) {
          coupon_error = 'COUPON_INACTIVE';
        } else {
          const nowUnix = Math.floor(Date.now() / 1000);
          
          if (startsAt && nowUnix < startsAt) {
            coupon_error = 'COUPON_NOT_STARTED';
          } else if (expiresAt && nowUnix > expiresAt) {
            coupon_error = 'COUPON_EXPIRED';
          } else if (minOrderAmount && ctx.subTotalCents < minOrderAmount) {
            coupon_error = 'COUPON_MIN_ORDER';
          } else if (maxUses !== null && maxUses !== undefined && uses >= maxUses) {
            coupon_error = 'COUPON_EXHAUSTED';
          } else {
            couponValid = true;
          }
        }
      }

      // (Tracking per-customer usage is deferred unless usage tracking per-user is added to schema)
      if (couponValid) {
        if (couponRecord.type === 'freeship' || couponRecord.type === 'free_shipping') {
          isFreeShipCoupon = true;
        } else if (couponRecord.type === 'percent' || couponRecord.type === 'percentage') {
          couponDiscount = Math.round(ctx.subTotalCents * (couponRecord.value / 100));
        } else if (couponRecord.type === 'fixed') {
          couponDiscount = couponRecord.value;
        }
      }
    }

    // Applying discounts
    // D5 Stacking rules
    // - individual_use == 1: only coupon applies, no VIP. (If coupon invalid, VIP can apply)
    // - freeship: stacks with VIP %.
    // - other: max(coupon, VIP) wins, unless stacked but we only allow 1 code input.
    // - Loyalty: always stacks with anything (treated as cash payment equivalent).

    if (isFreeShipCoupon) {
        shipping_fee_cents = 0;
        applied_coupon_id = couponRecord!.id;
        discount_breakdown.push({ type: 'Promotion', amount: ctx.base_shipping_cents, description: 'Free Shipping' });
        
        // VIP still applies on subtotal
        if (vipDiscount > 0) {
            discount_amount = vipDiscount;
            discount_breakdown.push({ type: 'VIP', amount: vipDiscount, description: 'VIP 10% Discount' });
        }
    } else {
        // Percent/Fixed coupon vs VIP
        if (couponValid && couponDiscount > vipDiscount) {
            discount_amount = couponDiscount;
            applied_coupon_id = couponRecord!.id;
            discount_breakdown.push({ type: 'Promotion', amount: couponDiscount, description: `${couponRecord.code} Applied` });
        } else if (vipDiscount > 0) {
            discount_amount = vipDiscount;
            discount_breakdown.push({ type: 'VIP', amount: vipDiscount, description: 'VIP 10% Discount' });
        }
    }

    // Apply loyalty discount on top of everything
    if (loyaltyDiscount > 0) {
        // Ensure loyalty discount doesn't exceed the remaining subtotal after other discounts
        const remainingSubtotal = ctx.subTotalCents - discount_amount;
        const actualLoyaltyDiscount = Math.min(loyaltyDiscount, remainingSubtotal);
        
        discount_amount += actualLoyaltyDiscount;
        discount_breakdown.push({ type: 'Loyalty', amount: actualLoyaltyDiscount, description: `Redeemed ${appliedLoyaltyPoints} Points` });
        
        // If they requested more points than needed to cover the subtotal, adjust applied points
        // Assuming 1 point = 1 VND
        appliedLoyaltyPoints = actualLoyaltyDiscount;
    }

    discount_amount = Math.min(discount_amount, ctx.subTotalCents);
    const taxable_amount = ctx.subTotalCents - discount_amount;
    // Decision #3 (standardization): VAT removed — Laravel baseline carries no
    // tax line. Field kept at 0 for response-shape compatibility.
    const tax_amount_cents = 0;
    const total_amount_cents = taxable_amount + shipping_fee_cents;

    return {
      discount_amount,
      shipping_fee_cents,
      tax_amount_cents,
      total_amount_cents,
      applied_coupon_id,
      coupon_error,
      discount_breakdown,
      loyalty_points_applied: appliedLoyaltyPoints > 0 ? appliedLoyaltyPoints : undefined
    };
  }
}
