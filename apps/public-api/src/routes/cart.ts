import { Hono } from 'hono'
import { createDb } from '@ecommerce/database'
import { localSchema as schema } from '@ecommerce/core-services'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { PromotionEngine } from '@ecommerce/core-services'

type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
}

const cart = new Hono<{ Bindings: Bindings }>()

const ApplyCouponSchema = z.object({
  cart_id: z.string().min(1),
  coupon_code: z.string().min(1),
  subTotalCents: z.number().optional().default(0)
})

cart.post('/coupon', zValidator('json', ApplyCouponSchema), async (c) => {
  try {
    const { coupon_code, subTotalCents } = c.req.valid('json')
    const db = createDb(c.env.DB)

    // Using PromotionEngine to validate coupon (GAP-05 Fix)
    const preview = await PromotionEngine.evaluate({
      db,
      subTotalCents: subTotalCents || 0,
      coupon_code,
      base_shipping_cents: 999
    });

    if (preview.coupon_error) {
      // Return specific error message based on the error code
      const errorMap: Record<string, string> = {
        'COUPON_NOT_FOUND': 'Invalid coupon code',
        'COUPON_INACTIVE': 'Coupon is not active',
        'COUPON_NOT_STARTED': 'Coupon has not started yet',
        'COUPON_EXPIRED': 'Coupon has expired',
        'COUPON_MIN_ORDER': 'Minimum order amount not met',
        'COUPON_EXHAUSTED': 'Coupon usage limit reached',
        'COUPON_PER_CUSTOMER_LIMIT': 'You have already used this coupon'
      };
      return c.json({ success: false, error: errorMap[preview.coupon_error] || 'Invalid coupon code', code: preview.coupon_error }, 400);
    }

    const coupon = await db.select().from(schema.promotions).where(eq(schema.promotions.code, coupon_code.toUpperCase())).get();

    return c.json({
      success: true,
      coupon: {
        id: coupon!.id,
        code: coupon!.code,
        type: coupon!.type === 'percentage' ? 'percent' : (coupon!.type === 'free_shipping' ? 'freeship' : coupon!.type),
        value: coupon!.value
      },
      preview: {
        discount_amount: preview.discount_amount,
        shipping_fee_cents: preview.shipping_fee_cents,
        total_amount_cents: preview.total_amount_cents,
        breakdown: preview.discount_breakdown
      }
    })
  } catch (err: any) {
    console.error('[Cart Coupon Error]', err)
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
})

const SyncCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1)
  })),
  guestSessionId: z.string().optional()
})

cart.post('/sync', zValidator('json', SyncCartSchema), async (c) => {
  try {
    const { items, guestSessionId } = c.req.valid('json')
    const db = createDb(c.env.DB)

    let customerId: string | undefined = undefined;
    
    const { getCookie } = await import('hono/cookie');
    const token = getCookie(c, 'aura_token');
    
    if (token) {
      if (!c.env.JWT_SECRET) {
        // Never fall back to a hardcoded secret: treat the request as a guest instead.
        console.error('[Cart Sync] JWT_SECRET is not set — falling back to guest cart')
      } else {
        try {
          const { verifyJWT } = await import('@ecommerce/database');
          const payload = await verifyJWT(token, c.env.JWT_SECRET);
          customerId = payload.customer_id as string;
        } catch (e) {
          console.error('Cart sync token verify error:', e);
        }
      }
    }

    const { CartService } = await import('@ecommerce/core-services');

    const result = await CartService.syncCart(db, items, customerId, guestSessionId);

    return c.json(result);
  } catch (err: any) {
    console.error('[Cart Sync Error]', err)
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
})

export default cart
