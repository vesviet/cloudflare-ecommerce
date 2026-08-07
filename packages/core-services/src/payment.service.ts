import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

import { PromotionEngine } from './promotion.engine';

export class PaymentService {
  /**
   * Calculates discounts, coupons, and final pricing.
   * Now acting as a backward-compatible facade for PromotionEngine.
   */
  static async calculatePricing(
    db: any, 
    subTotalCents: number, 
    customer_id?: string, 
    coupon_code?: string, 
    baseShippingCents: number = 999,
    redeemPoints?: number
  ) {
    const res = await PromotionEngine.evaluate({
      db,
      subTotalCents,
      customer_id,
      coupon_code,
      base_shipping_cents: baseShippingCents,
      redeem_points: redeemPoints
    });

    return {
      discountAmount: res.discount_amount,
      appliedCouponId: res.applied_coupon_id,
      shippingFeeCents: res.shipping_fee_cents,
      taxAmountCents: res.tax_amount_cents,
      totalAmountCents: res.total_amount_cents,
      loyaltyPointsApplied: res.loyalty_points_applied,
      couponError: res.coupon_error
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
    // so 'usd' currency is hardcoded for Stripe Checkout sessions in this VNĐ business model.
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validItems.map(item => {
      // S3-B FIX (I-14): Log price drift if client sent price_requested and it differs from current price
      if (item.price_requested !== undefined && item.price_requested !== item.price) {
        const varId = item.variation_id || item.id;
        const driftPct = Math.abs(item.price - item.price_requested) / Math.max(item.price_requested, 1) * 100;
        console.warn(`[Checkout] Price drift detected: variation=${varId} requested=${item.price_requested} current=${item.price} drift=${driftPct.toFixed(1)}%`);
      }
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.max(0, Math.round(item.price * ratio)),
        },
        quantity: item.quantity,
      };
    });

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

    if (taxAmountCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'usd',
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
