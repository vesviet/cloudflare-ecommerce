import { Hono } from 'hono';
import { createDb, schema } from '@ecommerce/database';
import { eq, inArray } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rateLimit, clientIp } from '@ecommerce/shared-routes';
import { getSetting } from '../utils/settingsCache';

// Rate limit lead submissions by client IP (defence-in-depth alongside Turnstile).
const limitLeads = rateLimit({
  binding: 'LEADS_RATE_LIMITER',
  scope: 'landing-lead',
  key: clientIp,
  message: 'Too many submissions. Please wait a moment and try again.',
});

const LeadSubmissionSchema = z.object({
  landing_page_id: z.string().optional().nullable(),
  // Required by the landing_page_leads table; keep in sync or inserts fail at runtime.
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_address: z.string().optional().nullable(),
  customer_note: z.string().optional().nullable(),
  selected_combo_id: z.string().optional().nullable(),
  selected_colors_json: z.any().optional().nullable(),
  selected_sizes_json: z.any().optional().nullable(),
  selected_variants_json: z.any().optional().nullable(),
  total_amount: z.number().optional().default(0),
  utm_source: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  turnstile_token: z.string().optional().nullable(),
  // COD / payment method for landing page orders.
  // Default is 'cod' — cash on delivery confirmed at submit.
  payment_method: z.enum(['cod', 'bank_transfer']).default('cod'),
});

const landingPages = new Hono<{ 
  Bindings: { 
    DB: D1Database; 
    CACHE_KV: KVNamespace;
    TURNSTILE_SECRET_KEY: string;
    WEBHOOK_CRM_URL?: string;
  } 
}>();

// GET: /api/landing-pages/:slug
landingPages.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = createDb(c.env.DB);
    const data = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).get();

    if (!data) return c.json({ success: false, error: 'Landing page not found' }, 404);

    let productData = null;
    let variantsData: any[] = [];

    if (data.product_id) {
      const [productRes, variantsRes, priceRow] = await Promise.all([
        db.select().from(schema.products).where(eq(schema.products.id, data.product_id)).get(),
        db.select().from(schema.products).where(eq(schema.products.parent_id, data.product_id)).all(),
        db.select({ price: schema.priceListItems.price }).from(schema.priceListItems).where(eq(schema.priceListItems.product_id, data.product_id)).get(),
      ]);

      productData = productRes ?? null;
      variantsData = variantsRes ?? [];
      const productPrice = priceRow ? priceRow.price : null;

      const stockedIds = variantsData.length > 0 ? variantsData.map(v => v.id) : [data.product_id];
      
      const [stockRows, assetRows] = await Promise.all([
        db
          .select({
            product_id: schema.inventoryLevels.product_id,
            stock_quantity: schema.inventoryLevels.stock_quantity,
          })
          .from(schema.inventoryLevels)
          .where(inArray(schema.inventoryLevels.product_id, stockedIds))
          .all(),
        db
          .select({
            product_id: schema.productAssets.product_id,
            url: schema.assets.url,
            alt_text: schema.assets.alt_text,
            position: schema.productAssets.position,
          })
          .from(schema.productAssets)
          .innerJoin(schema.assets, eq(schema.productAssets.asset_id, schema.assets.id))
          .where(inArray(schema.productAssets.product_id, stockedIds))
          .orderBy(schema.productAssets.position)
          .all(),
      ]);

      const stockByProduct = new Map<string, number>();
      for (const row of stockRows) {
        stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + (row.stock_quantity ?? 0));
      }

      const imagesByProduct = new Map<string, any[]>();
      for (const row of assetRows) {
        if (!imagesByProduct.has(row.product_id)) {
          imagesByProduct.set(row.product_id, []);
        }
        imagesByProduct.get(row.product_id)!.push({ url: row.url, alt_text: row.alt_text });
      }

      if (productData) {
        (productData as any).stock = stockByProduct.get(productData.id) ?? 0;
        (productData as any).images = imagesByProduct.get(productData.id) ?? [];
        (productData as any).regular_price = productPrice;
      }
      variantsData = variantsData.map(v => ({
        ...v,
        stock: stockByProduct.get(v.id) ?? 0,
        images: imagesByProduct.get(v.id) ?? []
      }));
    }

    const payload = {
      ...data,
      product: productData,
      variants: variantsData,
    };

    return c.json({ success: true, data: payload });
  } catch (err: any) {
    console.error('[public-api] landing-pages error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET: /api/landing-pages/:slug/stock
landingPages.get('/:slug/stock', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = createDb(c.env.DB);
    const lp = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).get();

    if (!lp || !lp.product_id) {
      return c.json({ success: true, is_out_of_stock: false, variants: [] });
    }

    const product = await db.select().from(schema.products).where(eq(schema.products.id, lp.product_id)).get();
    const variants = await db.select().from(schema.products).where(eq(schema.products.parent_id, lp.product_id)).all();

    const isProductActive = product?.status === 'active' || product?.status === 'published';

    // Stock lives in inventory_levels, not on products. Sum across locations so a
    // product is only out of stock when no location can fulfil it.
    const stockedIds = variants.length > 0 ? variants.map(v => v.id) : [lp.product_id];
    const stockRows = await db
      .select({
        product_id: schema.inventoryLevels.product_id,
        stock_quantity: schema.inventoryLevels.stock_quantity,
      })
      .from(schema.inventoryLevels)
      .where(inArray(schema.inventoryLevels.product_id, stockedIds))
      .all();

    const stockByProduct = new Map<string, number>();
    for (const row of stockRows) {
      stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + (row.stock_quantity ?? 0));
    }

    const totalStock = stockedIds.reduce((sum, id) => sum + (stockByProduct.get(id) ?? 0), 0);
    const isOutOfStock = !isProductActive || totalStock <= 0;

    return c.json({
      success: true,
      product_id: lp.product_id,
      is_out_of_stock: isOutOfStock,
      variants: variants.map(v => ({ id: v.id, sku: v.sku, stock: stockByProduct.get(v.id) ?? 0 })),
    });
  } catch (err: any) {
    console.error('[public-api] landing-pages error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST: /api/landing-pages/leads
landingPages.post('/leads', limitLeads, zValidator('json', LeadSubmissionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const { 
      landing_page_id, customer_name, customer_phone, customer_address, 
      customer_note, selected_combo_id, selected_colors_json, selected_sizes_json, 
      selected_variants_json, total_amount, utm_source, utm_campaign, utm_content,
      turnstile_token, payment_method,
    } = body;

    // 1. Verify Turnstile.
    // Every token is verified against siteverify. Local and QA environments use
    // Cloudflare's always-passing testing secret rather than a trusted token value,
    // because any token value a client can send is a value an attacker can send.
    if (c.env.TURNSTILE_SECRET_KEY) {
      if (!turnstile_token) {
        return c.json({ success: false, error: 'Missing turnstile token' }, 403);
      }
      const formData = new FormData();
      formData.append('secret', c.env.TURNSTILE_SECRET_KEY);
      formData.append('response', turnstile_token);

      // DEF-007 FIX: Add 5s timeout on siteverify — CF Worker default is 30s which
      // is too long; a slow Cloudflare response would block the lead submission.
      const tsController = new AbortController();
      const tsTimeout = setTimeout(() => tsController.abort(), 5000);
      let outcome: any;
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
          signal: tsController.signal,
        });
        outcome = await verifyRes.json();
      } catch (e: any) {
        clearTimeout(tsTimeout);
        if (e?.name === 'AbortError') {
          console.error('[Landing Pages] Turnstile siteverify timed out');
          return c.json({ success: false, error: 'Security check timed out. Please try again.' }, 503);
        }
        throw e; // unexpected — let outer catch handle
      }
      clearTimeout(tsTimeout);

      if (!outcome.success) {
        return c.json({ success: false, error: 'Turnstile verification failed' }, 403);
      }
    } else {
      console.warn('[Landing Pages] TURNSTILE_SECRET_KEY is not set — lead submissions are unprotected');
    }

    const db = createDb(c.env.DB);
    const leadId = crypto.randomUUID();
    const orderId = crypto.randomUUID();

    // 2. Fetch Landing Page details for product mapping
    let lpProduct: any = null;
    if (landing_page_id) {
      lpProduct = await db.select().from(schema.landingPages).where(eq(schema.landingPages.id, landing_page_id)).get();
    }

    // DEF-003 FIX: Re-validate stock at submit time before setting status='confirmed'.
    // Page-load stock check is stale by the time user submits (form fill can take minutes).
    if (lpProduct?.product_id && payment_method === 'cod') {
      const stockRows = await db
        .select({ stock_quantity: schema.inventoryLevels.stock_quantity })
        .from(schema.inventoryLevels)
        .where(eq(schema.inventoryLevels.product_id, lpProduct.product_id))
        .all();
      const totalStock = stockRows.reduce((sum: number, r: any) => sum + (r.stock_quantity ?? 0), 0);
      if (totalStock <= 0) {
        return c.json({ success: false, error: 'Sản phẩm hiện đã hết hàng. Vui lòng thử lại sau.' }, 409);
      }
    }

    // 2b. Server-side COD amount: recompute from the base price list so the
    // order total never trusts the client payload. When the landing page maps
    // to a known product we own the price; fall back to the client value only
    // for unmapped (combo) pages, and log drift in that case.
    let serverTotalAmount: number | null = null;
    if (lpProduct?.product_id) {
      let qty = 1;
      if (selected_variants_json) {
        try {
          const selected = Array.isArray(selected_variants_json)
            ? selected_variants_json
            : JSON.parse(selected_variants_json as any);
          const sum = (selected as any[]).reduce((s, v) => s + (Number(v?.quantity) || 0), 0);
          if (sum > 0) qty = sum;
        } catch { /* keep qty = 1 */ }
      }

      const targetIds = new Set<string>([lpProduct.product_id]);
      if (selected_variants_json) {
        try {
          const selected = Array.isArray(selected_variants_json)
            ? selected_variants_json
            : JSON.parse(selected_variants_json as any);
          for (const v of selected as any[]) {
            if (v?.variation_id) targetIds.add(v.variation_id);
            if (v?.product_id) targetIds.add(v.product_id);
          }
        } catch { /* ignore */ }
      }

      const priceRows = await db
        .select({ product_id: schema.priceListItems.product_id, price: schema.priceListItems.price })
        .from(schema.priceListItems)
        .where(inArray(schema.priceListItems.product_id, [...targetIds]))
        .all();

      if (priceRows.length > 0) {
        // Prefer the variant price when variants were selected, else the page product price.
        const selectedPrice =
          priceRows.find((r: any) => r.product_id !== lpProduct.product_id)?.price ??
          priceRows.find((r: any) => r.product_id === lpProduct.product_id)?.price;
        if (selectedPrice !== undefined) {
          serverTotalAmount = selectedPrice * qty;
        }
      }
    }

    const finalTotalAmount = serverTotalAmount ?? (total_amount || 0);
    if (serverTotalAmount !== null && total_amount && Math.abs(serverTotalAmount - total_amount) > 0) {
      console.warn(
        `[Landing Pages] COD amount drift: client=${total_amount} server=${serverTotalAmount} lp=${landing_page_id}`
      );
    }

    // 3. Create Linked Order
    // DEBT-013 FIX: Feature flag 'enable-cod-orders' (D1 settings table, default: true).
    // When false, COD submissions are still accepted but land as 'pending' — staff reviews
    // before confirming. Disable via: UPDATE settings SET value='false' WHERE key='enable-cod-orders'
    // or via Admin UI. No code deploy required to kill COD flow in production.
    const isCodEnabled = await getSetting(db, 'enable-cod-orders', true);
    const orderStatus =
      payment_method === 'cod' && isCodEnabled ? 'confirmed' :
      payment_method === 'cod' && !isCodEnabled ? 'pending' : // COD disabled → staff reviews
      'pending'; // bank_transfer always pending until proof

    const shippingAddress = {
      name: customer_name,
      phone: customer_phone,
      address: customer_address,
      note: customer_note,
    };

    // Generate a short human-readable reference (8 uppercase hex chars)
    const orderReference = orderId.replace(/-/g, '').slice(0, 8).toUpperCase();

    // DEBT-009 FIX: Wrap all 3 DB inserts in a single transaction.
    // Previously: orders insert + orderItems insert were separate calls — if orderItems
    // failed after orders succeeded, a confirmed order with no items would be orphaned.
    // drizzle-orm/d1 wraps SQLite BEGIN/COMMIT so partial failure rolls back atomically.
    const batchStmts = [];
    batchStmts.push(db.insert(schema.orders).values({
      id: orderId,
      status: orderStatus,
      source: 'landing_page',
      landing_page_id: landing_page_id || null,
      total_amount: finalTotalAmount,
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
      shipping_address_json: JSON.stringify(shippingAddress),
    }));

    // Insert order items if the landing page maps to a product
    if (lpProduct?.product_id) {
      const orderItemId = crypto.randomUUID();
      batchStmts.push(db.insert(schema.orderItems).values({
        id: orderItemId,
        order_id: orderId,
        product_id: lpProduct.product_id,
        quantity: 1,
        price_at_purchase: finalTotalAmount,
      }));
    }

    // Lead row linked to the same order — all three rows commit or all roll back
    batchStmts.push(db.insert(schema.landingPageLeads).values({
      id: leadId,
      landing_page_id,
      order_id: orderId,
      customer_name,
      customer_phone,
      customer_address,
      customer_note,
      selected_combo_id,
      selected_colors_json: selected_colors_json ? JSON.stringify(selected_colors_json) : null,
      selected_sizes_json: selected_sizes_json ? JSON.stringify(selected_sizes_json) : null,
      selected_variants_json: selected_variants_json ? JSON.stringify(selected_variants_json) : null,
      total_amount: finalTotalAmount,
      utm_source,
      utm_campaign,
      utm_content,
      sync_status: 'pending',
    }));

    await db.batch(batchStmts as any);

    // DEBT-012 FIX: Structured observability log — visible in CF Worker real-time logs
    // and queryable via wrangler tail. Use this to build a COD dashboard metric.
    // Query pattern: wrangler tail --format json | jq 'select(.logs[].message | contains("[COD Order]"))'
    console.log(JSON.stringify({
      event: '[COD Order]',
      order_id: orderId,
      order_reference: orderReference,
      order_status: orderStatus,
      payment_method,
      landing_page_id: landing_page_id || null,
      total_amount_cents: finalTotalAmount,
      cod_flag_enabled: isCodEnabled,
      has_product: !!lpProduct?.product_id,
      ts: new Date().toISOString(),
    }));

    // 5. Webhook Async Execution
    if (c.env.WEBHOOK_CRM_URL) {
      c.executionCtx.waitUntil(
        fetch(c.env.WEBHOOK_CRM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            order_id: orderId,
            order_reference: orderReference,
            landing_page_id,
            customer_name,
            customer_phone,
            customer_address,
            customer_note,
            selected_combo_id,
            total_amount: finalTotalAmount,
            payment_method,
            order_status: orderStatus,
            utm_source,
            utm_campaign
          })
        }).then(async (res) => {
          if (res.ok) {
            await db.update(schema.landingPageLeads)
              .set({ sync_status: 'synced' })
              .where(eq(schema.landingPageLeads.id, leadId));
          } else {
             await db.update(schema.landingPageLeads)
              .set({ sync_status: 'failed' })
              .where(eq(schema.landingPageLeads.id, leadId));
          }
        }).catch(async (e) => {
            console.error("Webhook failed:", e);
            await db.update(schema.landingPageLeads)
              .set({ sync_status: 'failed' })
              .where(eq(schema.landingPageLeads.id, leadId));
        })
      );
    }

    return c.json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: {
        id: leadId,
        order_id: orderId,
        order_reference: orderReference,
        payment_method,
        order_status: orderStatus,
        estimated_delivery: payment_method === 'cod' ? '2-3 ngày làm việc' : 'Sau khi xác nhận thanh toán',
      }
    });
  } catch (err: any) {
    console.error('[public-api] landing-pages lead submission error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default landingPages;
