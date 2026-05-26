import { Hono } from 'hono'

const catalog = new Hono<{ Bindings: { DB: D1Database } }>()

// GET: Danh sách sản phẩm
catalog.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products WHERE status = "published" ORDER BY created_at DESC LIMIT 20'
  ).all()
  return c.json({ success: true, data: results })
})

// GET: Tìm kiếm FTS5 (Full-Text Search)
catalog.get('/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ success: false, error: 'Missing query param' }, 400)
  
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM products_search WHERE products_search MATCH ? ORDER BY rank'
  ).bind(`*${q}*`).all()
  
  return c.json({ success: true, data: results })
})

// GET: Chi tiết sản phẩm kèm biến thể
catalog.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const product = await c.env.DB.prepare(
    'SELECT * FROM products WHERE slug = ? AND status = "published"'
  ).bind(slug).first()
  
  if (!product) return c.json({ success: false, error: 'Not found' }, 404)
    
  const variations = await c.env.DB.prepare(
    'SELECT * FROM product_variations WHERE product_id = ?'
  ).bind(product.id).all()
  
  return c.json({ success: true, data: { ...product, variations: variations.results } })
})

export default catalog
