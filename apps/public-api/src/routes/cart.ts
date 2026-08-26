import { Hono } from 'hono'
import { createDb } from '@ecommerce/database'
import { localSchema as schema } from '@ecommerce/core-services'
import { schema as dbSchema, verifyJWT } from '@ecommerce/database'
import { eq, inArray, asc } from 'drizzle-orm'
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

// T2.7 (CART-05): "available coupons" tray — lists active coupons with an
// eligibility verdict and a human reason so the storefront can render
// eligible/ineligible states like the Laravel CartDrawer.
cart.get('/coupons/available', async (c) => {
  try {
    const db = createDb(c.env.DB)
    const subtotal = Math.max(0, parseInt(c.req.query('subtotal') || '0', 10) || 0)

    const rows = await db.select().from(schema.promotions).where(eq(schema.promotions.status, 'active')).all()
    const nowUnix = Math.floor(Date.now() / 1000)

    // Per-customer usage counts for per-user limits (best-effort; guests pass).
    let customerId: string | undefined
    let customerEmail: string | undefined
    const token = (await import('hono/cookie')).getCookie(c, 'aura_token')
    if (token && c.env.JWT_SECRET) {
      try {
        const payload = await verifyJWT(token, c.env.JWT_SECRET)
        customerId = payload.customer_id as string
      } catch { /* guest */ }
    }

    let usedCouponIds = new Set<string>()
    if (customerId && rows.length > 0) {
      const usages = await db.select({ promotion_id: schema.promotionUsages.promotion_id })
        .from(schema.promotionUsages)
        .where(eq(schema.promotionUsages.customer_id, customerId))
        .all()
      usedCouponIds = new Set(usages.map((u: any) => u.promotion_id))
    }

    const coupons = rows
      .filter((cpn: any) => !cpn.starts_at || nowUnix >= cpn.starts_at)
      .filter((cpn: any) => !cpn.ends_at || nowUnix <= cpn.ends_at)
      .map((cpn: any) => {
        let eligible = true
        let reason: string | undefined

        if (subtotal < Number(cpn.min_order_amount || 0)) {
          eligible = false
          reason = `Đơn tối thiểu ${Number(cpn.min_order_amount).toLocaleString('vi-VN')}₫`
        } else if (cpn.usage_limit != null && Number(cpn.times_used || 0) >= cpn.usage_limit) {
          eligible = false
          reason = 'Mã đã hết lượt sử dụng'
        } else if (customerId && usedCouponIds.has(cpn.id)) {
          eligible = false
          reason = 'Bạn đã dùng mã này'
        }

        return {
          id: cpn.id,
          code: cpn.code,
          type: cpn.type === 'percentage' ? 'percent' : (cpn.type === 'free_shipping' ? 'freeship' : cpn.type),
          value: cpn.value,
          min_order_amount: cpn.min_order_amount || 0,
          eligible,
          reason,
        }
      })

    return c.json({ success: true, data: { coupons, subtotal } })
  } catch (err: any) {
    console.error('[Cart Coupons Available Error]', err)
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
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

const RecoverCartSchema = z.object({
  token: z.string().min(1)
})

// Recovery links are signed JWTs (scope: 'cart-recovery', 7d TTL) issued by the
// hourly abandoned-cart cron. Prices are always re-read from the base price list;
// the cart snapshot only carries product ids and quantities.
cart.post('/recover', zValidator('json', RecoverCartSchema), async (c) => {
  try {
    const { token } = c.req.valid('json')

    if (!c.env.JWT_SECRET) {
      console.error('[Cart Recover] JWT_SECRET is not configured')
      return c.json({ success: false, error: 'Recovery is unavailable' }, 500)
    }

    let payload: any
    try {
      payload = await verifyJWT(token, c.env.JWT_SECRET)
    } catch {
      return c.json({ success: false, error: 'Recovery link is invalid or has expired' }, 404)
    }

    if (payload?.scope !== 'cart-recovery' || typeof payload?.cart_id !== 'string') {
      return c.json({ success: false, error: 'Recovery link is invalid' }, 404)
    }

    const db = createDb(c.env.DB)

    const cart = await db.select().from(dbSchema.carts)
      .where(eq(dbSchema.carts.id, payload.cart_id))
      .get()

    if (!cart || cart.status !== 'active') {
      return c.json({ success: false, error: 'Cart no longer exists' }, 404)
    }

    const cartItems = await db.select().from(dbSchema.cartItems)
      .where(eq(dbSchema.cartItems.cart_id, cart.id))
      .all()

    if (cartItems.length === 0) {
      return c.json({ success: true, data: { items: [] } })
    }

    const productIds = cartItems.map((i: any) => i.product_id)

    const variations = await db
      .select({
        id: dbSchema.products.id,
        title: dbSchema.products.title,
        parent_id: dbSchema.products.parent_id,
        is_purchasable: dbSchema.products.is_purchasable,
      })
      .from(dbSchema.products)
      .where(inArray(dbSchema.products.id, productIds))
      .all()

    const priceRows = await db
      .select({
        product_id: dbSchema.priceListItems.product_id,
        price: dbSchema.priceListItems.price,
      })
      .from(dbSchema.priceListItems)
      .where(inArray(dbSchema.priceListItems.product_id, productIds))
      .all()

    const assetRows = await db
      .select({
        product_id: dbSchema.productAssets.product_id,
        url: dbSchema.assets.url,
      })
      .from(dbSchema.productAssets)
      .innerJoin(dbSchema.assets, eq(dbSchema.productAssets.asset_id, dbSchema.assets.id))
      .where(inArray(dbSchema.productAssets.product_id, productIds))
      .orderBy(asc(dbSchema.productAssets.position))
      .all()

    const variationMap = new Map(variations.map((v: any) => [v.id, v]))
    const priceMap = new Map(priceRows.map((p: any) => [p.product_id, p.price]))
    const imageMap = new Map<string, string>()
    for (const row of assetRows) {
      if (!imageMap.has(row.product_id)) imageMap.set(row.product_id, row.url)
    }

    const items = []
    for (const item of cartItems) {
      const variation: any = variationMap.get(item.product_id)
      const price = priceMap.get(item.product_id)
      // Skip items that can no longer be purchased or priced — checkout would reject them anyway.
      if (!variation || variation.is_purchasable === 0 || price === undefined) continue

      items.push({
        variation_id: variation.id,
        product_id: variation.id,
        name: variation.title,
        price,
        quantity: item.quantity,
        image: imageMap.get(item.product_id) || '',
      })
    }

    return c.json({ success: true, data: { items } })
  } catch (err: any) {
    console.error('[Cart Recover Error]', err)
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
})

export default cart
