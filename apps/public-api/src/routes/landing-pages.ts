import { Hono } from 'hono';
import { createDb, schema } from '@ecommerce/database';
import { eq } from 'drizzle-orm';
import { CacheService } from '@ecommerce/core-services';

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
    const cacheKey = `landing_page_${slug}`;

    // 1. Try Cache
    const cached = await CacheService.getCachedItem(c.env, cacheKey);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json({ success: true, data: cached });
    }

    // 2. Fetch from D1
    const db = createDb(c.env.DB);
    const data = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).get();

    if (!data) return c.json({ success: false, error: 'Landing page not found' }, 404);

    // 3. Update Cache Async
    c.executionCtx.waitUntil(
      CacheService.setCachedItem(c.env, cacheKey, data)
    );

    c.header('X-Cache', 'MISS');
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST: /api/landing-pages/leads
landingPages.post('/leads', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      landing_page_id, customer_name, customer_phone, customer_address, 
      customer_note, selected_combo_id, selected_colors_json, selected_sizes_json, 
      total_amount, utm_source, utm_campaign, utm_content, turnstile_token 
    } = body;

    // 1. Verify Turnstile
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
    }

    // 2. Insert Lead to D1
    const db = createDb(c.env.DB);
    const leadId = crypto.randomUUID();
    
    await db.insert(schema.landingPageLeads).values({
      id: leadId,
      landing_page_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_note,
      selected_combo_id,
      selected_colors_json: selected_colors_json ? JSON.stringify(selected_colors_json) : null,
      selected_sizes_json: selected_sizes_json ? JSON.stringify(selected_sizes_json) : null,
      total_amount,
      utm_source,
      utm_campaign,
      utm_content,
      sync_status: 'pending'
    });

    // 3. Webhook Async Execution
    if (c.env.WEBHOOK_CRM_URL) {
      c.executionCtx.waitUntil(
        fetch(c.env.WEBHOOK_CRM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId,
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
            // update sync_status = synced
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

    return c.json({ success: true, message: 'Lead submitted successfully', data: { id: leadId } });
  } catch (err: any) {
    console.error("Lead submission error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default landingPages;
