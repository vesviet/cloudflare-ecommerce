import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

import { PromotionEngine } from './promotion.engine';
import { PromotionRulesEngine } from './promotion.rules.engine';

/**
 * Payment configuration and technical debt documentation.
 *
 * TECHNICAL DEBT / CURRENCY CONVERSION POLICY:
 * Stripe does not natively support VNĐ settlement for many account types,
 * so DEFAULT_CURRENCY ('usd') is used for Stripe Checkout sessions in this VNĐ business model.
 * Store prices are maintained in VNĐ (STORE_CURRENCY = 'VND').
 */
export const PAYMENT_CONFIG = {
  DEFAULT_CURRENCY: 'usd',
  STORE_CURRENCY: 'VND',
};

export class PaymentService {
  /**
   * Calculates discounts, coupons, and final pricing.
   * Pipeline (Laravel parity): automatic promotion_rules first, then the
   * legacy coupon/VIP layer on top; loyalty stacks last inside the engine.
   * VAT removed per standardization decision #3.
   */
  static async calculatePricing(
    db: any,
    subTotalCents: number,
    customer_id?: string,
    coupon_code?: string,
    baseShippingCents: number = 999,
    redeemPoints?: number,
    cartItems?: Array<{ product_id: string; quantity: number; price: number }>,
    excludeProductIds?: string[]
  ) {
    const rulesRes = await PromotionRulesEngine.evaluateCart({
      db,
      subTotal: subTotalCents,
      baseShippingFee: baseShippingCents,
      customerId: customer_id,
      cartItems: cartItems || [],
      excludeProductIds
    });

    const res = await PromotionEngine.evaluate({
      db,
      subTotalCents,
      customer_id,
      coupon_code,
      base_shipping_cents: baseShippingCents,
      redeem_points: redeemPoints
    });

    const combinedDiscount = Math.min(subTotalCents, (res.discount_amount || 0) + rulesRes.totalDiscount);
    const shippingFeeCents = Math.max(0, res.shipping_fee_cents - rulesRes.shippingSubsidy);
    const totalAmountCents = Math.max(0, subTotalCents - combinedDiscount) + shippingFeeCents;

    return {
      discountAmount: combinedDiscount,
      appliedCouponId: res.applied_coupon_id,
      shippingFeeCents,
      taxAmountCents: 0,
      totalAmountCents,
      loyaltyPointsApplied: res.loyalty_points_applied,
      couponError: res.coupon_error,
      appliedRules: rulesRes.appliedRules,
      appliedRuleIds: rulesRes.appliedRules.map(r => r.ruleId),
      gifts: rulesRes.gifts,
      discountBreakdown: [
        ...res.discount_breakdown,
        ...rulesRes.appliedRules.map(r => ({ type: 'PromotionRule', amount: r.amount, description: r.description }))
      ]
    };
  }

  /**
   * Creates a Stripe Checkout Session.
   * S3-B (I-14): Accepts optional priceRequested per item for drift detection logging.
   */
  static async createStripeSession(
    stripeSecretKey: string,
    storefrontUrl: string,
    orderId: string,
    validItems: any[],
    subTotal: number,
    discountAmount: number,
    shippingFeeCents: number,
    taxAmountCents: number,
    email?: string,
    stripeCustomerId?: string,
    metadataOverrides?: Record<string, string>
  ) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });

    const adjustedSubtotal = subTotal - discountAmount;
    const ratio = subTotal > 0 ? adjustedSubtotal / subTotal : 1;
    
    // TODO / TECHNICAL DEBT: Stripe does not natively support VNĐ settlement for many account types,
    // so PAYMENT_CONFIG.DEFAULT_CURRENCY ('usd') is used for Stripe Checkout sessions in this VNĐ business model.
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validItems.map(item => {
      // S3-B FIX (I-14): Log price drift if client sent price_requested and it differs from current price
      if (item.price_requested !== undefined && item.price_requested !== item.price) {
        const varId = item.variation_id || item.id;
        const driftPct = Math.abs(item.price - item.price_requested) / Math.max(item.price_requested, 1) * 100;
        console.warn(`[Checkout] Price drift detected: variation=${varId} requested=${item.price_requested} current=${item.price} drift=${driftPct.toFixed(1)}%`);
      }
      return {
        price_data: {
          currency: PAYMENT_CONFIG.DEFAULT_CURRENCY,
          product_data: { name: item.name },
          unit_amount: Math.max(0, Math.round(item.price * ratio)),
        },
        quantity: item.quantity,
      };
    });

    if (shippingFeeCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: PAYMENT_CONFIG.DEFAULT_CURRENCY,
          product_data: { name: 'Standard Shipping' },
          unit_amount: shippingFeeCents,
        },
        quantity: 1,
      });
    }

    if (taxAmountCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: PAYMENT_CONFIG.DEFAULT_CURRENCY,
          product_data: { name: 'Taxes' },
          unit_amount: taxAmountCents,
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
   * Resolves a stored payment reference to a PaymentIntent id.
   * Some orders store the Checkout Session id, which the Refunds API rejects.
   */
  static async resolvePaymentIntentId(stripe: Stripe, paymentReference: string): Promise<string> {
    if (!paymentReference.startsWith('cs_')) {
      return paymentReference;
    }

    const session = await stripe.checkout.sessions.retrieve(paymentReference);
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!paymentIntentId) {
      throw new Error('Checkout session has no associated payment intent');
    }

    return paymentIntentId;
  }

  /**
   * Processes a refund via Stripe. Accepts either a PaymentIntent or a
   * Checkout Session reference.
   */
  static async processRefund(
    stripeSecretKey: string,
    paymentReference: string,
    idempotencyKey?: string,
  ) {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
    const paymentIntentId = await this.resolvePaymentIntentId(stripe, paymentReference);

    return await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  }
}
