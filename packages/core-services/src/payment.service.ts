import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class PaymentService {
  /**
   * Calculates discounts, coupons, and final pricing.
   */
  static async calculatePricing(
    db: any, 
    subTotalCents: number, 
    customer_id?: string, 
    coupon_code?: string, 
    baseShippingCents: number = 999
  ) {
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
  }

  /**
   * Creates a Stripe Checkout Session.
   */
  static async createStripeSession(
    stripeSecretKey: string,
    storefrontUrl: string,
    orderId: string,
    validItems: any[],
    subTotal: number,
    discountAmount: number,
    shippingFeeCents: number,
    email?: string,
    stripeCustomerId?: string,
    metadataOverrides?: Record<string, string>
  ) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });

    const adjustedSubtotal = subTotal - discountAmount;
    const ratio = subTotal > 0 ? adjustedSubtotal / subTotal : 1;
    
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.max(0, Math.round(item.price * ratio)),
      },
      quantity: item.quantity,
    }));

    if (shippingFeeCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Standard Shipping' },
          unit_amount: shippingFeeCents,
        },
        quantity: 1,
      });
    }

    const metadata: Record<string, string> = { order_id: orderId, ...metadataOverrides };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: stripeLineItems,
      success_url: `${storefrontUrl}/checkout/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storefrontUrl}/checkout?cancelled=true`,
      metadata: { order_id: orderId },
      payment_intent_data: { metadata },
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Processes a refund via Stripe.
   */
  static async processRefund(stripeSecretKey: string, paymentIntentId: string) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
    return await stripe.refunds.create({
      payment_intent: paymentIntentId
    });
  }
}
