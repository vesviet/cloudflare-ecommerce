import { Hono } from 'hono';
import { createDb, schema } from '@ecommerce/database';
import { eq, inArray } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

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
      productData = await db.select().from(schema.products).where(eq(schema.products.id, data.product_id)).get();
      variantsData = await db.select().from(schema.products).where(eq(schema.products.parent_id, data.product_id)).all();

      const stockedIds = variantsData.length > 0 ? variantsData.map(v => v.id) : [data.product_id];
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

      if (productData) {
        (productData as any).stock = stockByProduct.get(productData.id) ?? 0;
      }
      variantsData = variantsData.map(v => ({
        ...v,
        stock: stockByProduct.get(v.id) ?? 0
      }));
    }

    const payload = {
      ...data,
      product: productData,
      variants: variantsData,
    };

    return c.json({ success: true, data: payload });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
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
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST: /api/landing-pages/leads
landingPages.post('/leads', zValidator('json', LeadSubmissionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const { 
      landing_page_id, customer_name, customer_phone, customer_address, 
      customer_note, selected_combo_id, selected_colors_json, selected_sizes_json, 
      selected_variants_json, total_amount, utm_source, utm_campaign, utm_content, turnstile_token 
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
      
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      const outcome = await verifyRes.json() as any;
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

    // 3. Create Linked Order (Pending Status)
    const shippingAddress = {
      name: customer_name,
      phone: customer_phone,
      address: customer_address,
      note: customer_note,
    };

    await db.insert(schema.orders).values({
      id: orderId,
      status: 'pending',
      source: 'landing_page',
      landing_page_id: landing_page_id || null,
      total_amount: total_amount || 0,
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
      shipping_address_json: JSON.stringify(shippingAddress),
    });

    // Create Order Items if product_id exists
    if (lpProduct?.product_id) {
      const orderItemId = crypto.randomUUID();
      await db.insert(schema.orderItems).values({
        id: orderItemId,
        order_id: orderId,
        product_id: lpProduct.product_id,
        quantity: 1,
        price_at_purchase: total_amount || 0,
      });
    }

    // 4. Insert Lead to D1 with order_id
    await db.insert(schema.landingPageLeads).values({
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
      total_amount: total_amount || 0,
      utm_source,
      utm_campaign,
      utm_content,
      sync_status: 'pending'
    });

    // 5. Webhook Async Execution
    if (c.env.WEBHOOK_CRM_URL) {
      c.executionCtx.waitUntil(
        fetch(c.env.WEBHOOK_CRM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
            order_id: orderId,
            landing_page_id,
            customer_name,
            customer_phone,
            customer_address,
            customer_note,
            selected_combo_id,
            total_amount,
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

    return c.json({ success: true, message: 'Lead submitted successfully', data: { id: leadId, order_id: orderId } });
  } catch (err: any) {
    console.error("Lead submission error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default landingPages;
