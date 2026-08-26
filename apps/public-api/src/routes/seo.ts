import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { sql } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  STOREFRONT_URL?: string;
};

/**
 * Phase 4a (SEO-01..04): sitemap index + child sitemaps, robots.txt and the
 * blog RSS feed — Laravel FeedService parity. Every document is KV-cached for
 * one hour; production should proxy these paths from the storefront domain so
 * search engines see them same-origin.
 */

const CACHE_TTL = 3600;

const app = new Hono<{ Bindings: Bindings }>();

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry(loc: string, lastmod?: string | null): string {
  const lastmodTag = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
  return `<url><loc>${xmlEscape(loc)}</loc>${lastmodTag}</url>`;
}

async function cachedOr(c: any, key: string, producer: () => Promise<{ body: string; type: string }>): Promise<Response> {
  try {
    const hit = await c.env.CACHE_KV.get(key);
    if (hit) return new Response(hit.body, { headers: { 'Content-Type': hit.type } });
  } catch { /* cache unavailable — regenerate */ }

  const fresh = await producer();
  try {
    await c.env.CACHE_KV.put(key, fresh, { expirationTtl: CACHE_TTL });
  } catch { /* ignore */ }
  return new Response(fresh.body, { headers: { 'Content-Type': fresh.type } });
}

app.get('/robots.txt', (c) => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const body = `User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /my-account\nDisallow: /dashboard\n\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
});

app.get('/sitemap.xml', (c) => cachedOr(c, 'seo:sitemap-index', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const now = new Date().toISOString().slice(0, 10);
  const parts = ['products', 'categories', 'posts', 'pages'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    parts.map((p) => `\t<sitemap><loc>${base}/sitemap-${p}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join('\n') +
    `\n</sitemapindex>`;
  return { body, type: 'application/xml; charset=utf-8' };
}));

app.get('/sitemap-products.xml', (c) => cachedOr(c, 'seo:sitemap-products', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const db = createDb(c.env.DB);
  const rows = await db.all(sql`
    SELECT slug, updated_at FROM products
    WHERE status = 'published' AND deleted_at IS NULL AND slug IS NOT NULL
  `) as any[];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows.map((r) => `\t${urlEntry(`${base}/product/${r.slug}`, r.updated_at)}`).join('\n') +
    `\n</urlset>`;
  return { body, type: 'application/xml; charset=utf-8' };
}));

app.get('/sitemap-categories.xml', (c) => cachedOr(c, 'seo:sitemap-categories', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const db = createDb(c.env.DB);
  const rows = await db.all(sql`
    SELECT slug FROM categories WHERE slug IS NOT NULL
  `) as any[];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows.map((r) => `\t${urlEntry(`${base}/category/${r.slug}`)}`).join('\n') +
    `\n</urlset>`;
  return { body, type: 'application/xml; charset=utf-8' };
}));

app.get('/sitemap-posts.xml', (c) => cachedOr(c, 'seo:sitemap-posts', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const db = createDb(c.env.DB);
  const rows = await db.all(sql`
    SELECT slug, updated_at FROM cms_entries
    WHERE type = 'post' AND status = 'published' AND slug IS NOT NULL
  `) as any[];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows.map((r) => `\t${urlEntry(`${base}/blog/${r.slug}`, r.updated_at)}`).join('\n') +
    `\n</urlset>`;
  return { body, type: 'application/xml; charset=utf-8' };
}));

app.get('/sitemap-pages.xml', (c) => cachedOr(c, 'seo:sitemap-pages', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const db = createDb(c.env.DB);
  const rows = await db.all(sql`
    SELECT slug, updated_at FROM cms_entries
    WHERE type IN ('page', 'landing_page') AND status = 'published' AND slug IS NOT NULL
      AND slug NOT LIKE 'checkout%' AND slug NOT LIKE 'my-account%'
  `) as any[];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows.map((r) => `\t${urlEntry(`${base}/${r.slug}`, r.updated_at)}`).join('\n') +
    `\n</urlset>`;
  return { body, type: 'application/xml; charset=utf-8' };
}));

// SEO-03: RSS 2.0 feed for the blog (latest 30 published posts).
app.get('/feed', (c) => cachedOr(c, 'seo:rss-feed', async () => {
  const base = c.env.STOREFRONT_URL || 'http://localhost:3000';
  const db = createDb(c.env.DB);
  const rows = await db.all(sql`
    SELECT title, slug, excerpt, content AS content_md, updated_at
    FROM cms_entries
    WHERE type = 'post' AND status = 'published'
    ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 30
  `) as any[];

  const stripMd = (md: string | null | undefined): string =>
    (md || '').replace(/[#*_>\[\]()`~-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);

  const items = rows.map((p) => `
    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(`${base}/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${xmlEscape(`${base}/blog/${p.slug}`)}</guid>
      <pubDate>${new Date(p.updated_at).toUTCString()}</pubDate>
      <description>${xmlEscape(p.excerpt || stripMd(p.content_md))}</description>
    </item>`).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <link>${xmlEscape(base)}</link>
    <description>Latest articles</description>${items}
  </channel>
</rss>`;
  return { body, type: 'application/rss+xml; charset=utf-8' };
}));

export default app;
