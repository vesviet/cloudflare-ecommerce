import { eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export const calculatePricing = async (
  db: any, 
  subTotalCents: number, 
  customer_id?: string, 
  coupon_code?: string, 
  baseShippingCents: number = 999
) => {
  let discountAmount = 0;
  let appliedCouponId: string | null = null;
  let shippingFeeCents = baseShippingCents;
  
  let vipDiscount = 0;
  if (customer_id) {
    const customerRecord = await db.select().from(schema.customers).where(eq(schema.customers.id, customer_id)).get();
    if (customerRecord && customerRecord.tags_json) {
      try {
        const tags = JSON.parse(customerRecord.tags_json);
        if (tags.includes('VIP')) {
          vipDiscount = Math.round(subTotalCents * 0.10);
        }
      } catch(e) {}
    }
  }
  
  let couponDiscount = 0;
  let couponRecord = null;
  if (coupon_code) {
    couponRecord = await db.select().from(schema.coupons).where(eq(schema.coupons.code, coupon_code)).get();
    if (couponRecord && couponRecord.is_active === 1) {
      if (couponRecord.type === 'percent') {
        couponDiscount = Math.round(subTotalCents * (couponRecord.value / 100));
      } else if (couponRecord.type === 'fixed') {
        couponDiscount = couponRecord.value;
      } else if (couponRecord.type === 'freeship') {
        shippingFeeCents = 0;
      }
    }
  }
  
  if (couponDiscount > vipDiscount) {
    discountAmount = couponDiscount;
    appliedCouponId = couponRecord ? couponRecord.id : null;
  } else {
    discountAmount = vipDiscount;
  }
  
  discountAmount = Math.min(discountAmount, subTotalCents);
  const totalAmountCents = subTotalCents - discountAmount + shippingFeeCents;
  
  return {
    discountAmount,
    appliedCouponId,
    shippingFeeCents,
    totalAmountCents
  };
};
