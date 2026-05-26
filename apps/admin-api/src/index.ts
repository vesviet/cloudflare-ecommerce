import { Hono } from 'hono'
import { cors } from 'hono/cors'
import customerApp from './customer'
import { hashPassword } from './auth'

type Bindings = {
  DB: D1Database
  MEDIA_R2: R2Bucket
  ENVIRONMENT: string // 'development' | 'production'
}

const app = new Hono<{ Bindings: Bindings }>()

// 1. Enable CORS for Frontend cross-origin requests
app.use('*', cors())

// 2. Middleware bảo vệ Admin: Kiểm tra Cloudflare Access Assertion (Zero Trust)
app.use('*', async (c, next) => {
  const path = c.req.path;
  // Bỏ qua kiểm tra Zero Trust cho các API của Storefront
  if (path.startsWith('/store') || path.startsWith('/auth') || path.startsWith('/customer')) {
    return next();
  }

  const cfAccessJwt = c.req.header('CF-Access-JWT-Assertion');
  const isLocalDev = c.env.ENVIRONMENT === 'development';
  
  if (!isLocalDev && !cfAccessJwt) {
    return c.json({ success: false, error: 'Access Denied: Cloudflare Zero Trust Authentication Required' }, 403);
  }
  await next();
})

// 3. API Dashboard Metrics
app.get('/metrics', async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status IN ('processing', 'completed') THEN total_amount ELSE 0 END), 0) as totalSales,
        COUNT(*) as totalOrders,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END), 0) as refundedOrders
      FROM orders
    `).first<{ totalSales: number; totalOrders: number; refundedOrders: number }>()

    const lowStock = await c.env.DB.prepare(`
      SELECT COUNT(*) as lowStockCount FROM product_variations WHERE stock < 5
    `).first<{ lowStockCount: number }>()

    const totalOrders = stats?.totalOrders || 0
    const refundedOrders = stats?.refundedOrders || 0
    const refundRate = totalOrders > 0 ? parseFloat(((refundedOrders / totalOrders) * 100).toFixed(1)) : 0

    return c.json({
      success: true,
      data: {
        totalSales: stats?.totalSales || 0,
        totalOrders: totalOrders,
        refundRate: refundRate,
        lowStockCount: lowStock?.lowStockCount || 0
      }
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// 4. API Quản lý Đơn hàng
app.get('/orders', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
    return c.json({ success: true, data: results })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.post('/orders/:id/refund', async (c) => {
  const orderId = c.req.param('id')
  try {
    const order = await c.env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(orderId).first<{ status: string }>()
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    if (order.status === 'refunded') {
      return c.json({ success: false, error: 'Order is already refunded' }, 400)
    }

    const items = await c.env.DB.prepare('SELECT variation_id, quantity FROM order_items WHERE order_id = ?').bind(orderId).all<{ variation_id: string; quantity: number }>()

    const queries = [
      c.env.DB.prepare('UPDATE orders SET status = "refunded", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(orderId)
    ]

    if (items.results && items.results.length > 0) {
      for (const item of items.results) {
        queries.push(
          c.env.DB.prepare('UPDATE product_variations SET stock = stock + ? WHERE id = ?').bind(item.quantity, item.variation_id)
        )
      }
    }

    await c.env.DB.batch(queries)

    return c.json({ success: true, message: `Refunded order ${orderId} successfully` })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})
// 4.5 API Quản lý Khách hàng (CRM)
app.get('/customers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(o.id) as total_orders
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'refunded'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();
    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/customers/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const customer = await c.env.DB.prepare('SELECT id, email, first_name, last_name, phone, created_at FROM customers WHERE id = ?').bind(customerId).first();
    
    if (!customer) return c.json({ success: false, error: 'Customer not found' }, 404);
    
    const { results: orders } = await c.env.DB.prepare('SELECT id, status, total_amount, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC').bind(customerId).all();
    const { results: addresses } = await c.env.DB.prepare('SELECT * FROM customer_addresses WHERE customer_id = ?').bind(customerId).all();
    
    return c.json({ success: true, data: { customer, orders, addresses } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/customers/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const { first_name, last_name, phone } = await c.req.json();
    
    await c.env.DB.prepare('UPDATE customers SET first_name = ?, last_name = ?, phone = ? WHERE id = ?')
      .bind(first_name, last_name, phone, customerId).run();
      
    return c.json({ success: true, message: 'Customer updated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/customers', async (c) => {
  try {
    const { email, password, first_name, last_name, phone } = await c.req.json();

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }
    if (!email.includes('@')) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    if (password && password.length < 8) {
      return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
    }

    const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ success: false, error: 'Email is already registered' }, 400);
    }

    const customerId = crypto.randomUUID();
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    await c.env.DB.prepare(
      'INSERT INTO customers (id, email, password_hash, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(customerId, email, hashedPassword, first_name || null, last_name || null, phone || null).run();

    return c.json({
      success: true,
      message: 'Customer created successfully',
      data: { id: customerId, email, first_name, last_name, phone }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 5. API Quản lý Sản phẩm
app.get('/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        p.*,
        json_group_array(json_object(
          'id', v.id, 'sku', v.sku, 'regular_price', v.regular_price, 
          'sale_price', v.sale_price, 'stock', v.stock, 'is_purchasable', v.is_purchasable,
          'attributes', v.attributes_json
        )) as variations
      FROM products p
      LEFT JOIN product_variations v ON p.id = v.product_id AND v.is_purchasable = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all()
    
    // Parse variations JSON strings
    const formattedData = results.map((row: any) => ({
      ...row,
      variations: row.variations ? JSON.parse(row.variations).filter((v: any) => v.id !== null) : []
    }))
    
    return c.json({ success: true, data: formattedData })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Storefront API - WooCommerce Format
app.get('/store/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, 
             json_group_array(json_object(
               'id', v.id, 'sku', v.sku, 'regular_price', v.regular_price, 
               'sale_price', v.sale_price, 'stock', v.stock, 'in_stock', v.in_stock,
               'attributes', v.attributes_json
             )) as variations
      FROM products p
      LEFT JOIN product_variations v ON p.id = v.product_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all()

    const formattedProducts = results.map((row: any) => {
      const vars = JSON.parse(row.variations || '[]');
      const minPrice = vars.length > 0 ? Math.min(...vars.map((v: any) => v.sale_price || v.regular_price || 0)) : row.sale_price || row.regular_price;
      const maxPrice = vars.length > 0 ? Math.max(...vars.map((v: any) => v.regular_price || 0)) : row.regular_price;

      return {
        id: row.id,
        name: row.title,
        slug: row.slug,
        type: row.type,
        description: row.description,
        is_purchasable: !!row.is_purchasable,
        in_stock: !!row.in_stock,
        prices: {
          currency_code: 'USD',
          currency_symbol: '$',
          currency_minor_unit: 2,
          currency_decimal_separator: '.',
          currency_thousand_separator: ',',
          currency_prefix: '$',
          currency_suffix: '',
          price: (row.sale_price || row.regular_price || 0).toString(),
          regular_price: (row.regular_price || 0).toString(),
          sale_price: row.sale_price ? row.sale_price.toString() : row.regular_price?.toString(),
          price_range: row.type === 'variable' && vars.length > 0 ? {
            min_amount: minPrice.toString(),
            max_amount: maxPrice.toString()
          } : null
        },
        attributes: JSON.parse(row.attributes || '[]'),
        variations: vars
      }
    });

    // Caching headers
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(formattedProducts);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.post('/products', async (c) => {
  try {
    const body = await c.req.parseBody()
    const name = body['name'] as string
    const type = (body['type'] as string) || 'simple'
    const regular_price = parseInt((body['regular_price'] as string) || '0', 10)
    const sale_price = body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null
    const stock = parseInt((body['stock'] as string) || '0', 10)
    const image = body['image']
    
    // Parse variations JSON if provided
    let variations: any[] = []
    if (body['variations']) {
      try {
        variations = JSON.parse(body['variations'] as string)
      } catch (e) {
        return c.json({ success: false, error: 'Invalid variations JSON' }, 400)
      }
    }
    
    if (!name) {
      return c.json({ success: false, error: 'Missing product name' }, 400)
    }

    let imageUrl = ''
    if (image && image instanceof File) {
      if (image.size > 5 * 1024 * 1024) {
        return c.json({ success: false, error: 'Image size exceeds 5MB limit' }, 400)
      }
      if (!image.type.startsWith('image/')) {
        return c.json({ success: false, error: 'Only image files are allowed' }, 400)
      }
      
      const filename = `${Date.now()}-${image.name}`
      await c.env.MEDIA_R2.put(`products/${filename}`, image.stream(), {
        httpMetadata: { contentType: image.type }
      })
      imageUrl = `/media/products/${filename}`
    }

    const productId = crypto.randomUUID()
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4)

    const queries = [
      c.env.DB.prepare('INSERT INTO products (id, slug, title, description, status, type, regular_price, sale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(
        productId,
        slug,
        name,
        imageUrl,
        'published',
        type,
        regular_price,
        sale_price
      )
    ]

    if (type === 'simple' || variations.length === 0) {
      const variationId = crypto.randomUUID()
      const sku = `SKU-${slug.toUpperCase()}`
      queries.push(
        c.env.DB.prepare('INSERT INTO product_variations (id, product_id, sku, regular_price, sale_price, stock, attributes_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
          variationId,
          productId,
          sku,
          regular_price,
          sale_price,
          stock,
          JSON.stringify({ image: imageUrl })
        )
      )
    } else {
      variations.forEach((v: any, index: number) => {
        const variationId = crypto.randomUUID()
        const sku = v.sku || `SKU-${slug.toUpperCase()}-${index + 1}`
        queries.push(
          c.env.DB.prepare('INSERT INTO product_variations (id, product_id, sku, regular_price, sale_price, stock, attributes_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
            variationId,
            productId,
            sku,
            v.regular_price || 0,
            v.sale_price || null,
            v.stock || 0,
            JSON.stringify(v.attributes || {})
          )
        )
      })
    }

    await c.env.DB.batch(queries)

    return c.json({ success: true, message: 'Product created successfully', data: { id: productId, slug } })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

app.put('/products/:id', async (c) => {
  const productId = c.req.param('id')
  try {
    const body = await c.req.parseBody()
    const name = body['name'] as string
    const type = (body['type'] as string) || 'simple'
    const regular_price = parseInt((body['regular_price'] as string) || '0', 10)
    const sale_price = body['sale_price'] ? parseInt(body['sale_price'] as string, 10) : null
    const stock = parseInt((body['stock'] as string) || '0', 10)
    
    let variations: any[] = []
    if (body['variations']) {
      try {
        variations = JSON.parse(body['variations'] as string)
      } catch (e) {
        return c.json({ success: false, error: 'Invalid variations JSON' }, 400)
      }
    }

    const existingProduct = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first()
    if (!existingProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }

    const queries = [
      c.env.DB.prepare('UPDATE products SET title = ?, type = ?, regular_price = ?, sale_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(
        name,
        type,
        regular_price,
        sale_price,
        productId
      )
    ]

    // Handle Variations UPSERT / Soft Delete
    if (type === 'variable' && variations.length > 0) {
      // 1. Mark all existing variations as unpurchasable (soft delete)
      queries.push(
        c.env.DB.prepare('UPDATE product_variations SET is_purchasable = 0 WHERE product_id = ?').bind(productId)
      )

      // 2. Upsert incoming variations
      variations.forEach((v: any) => {
        if (v.id) {
          // Update existing and restore purchasable state
          queries.push(
            c.env.DB.prepare('UPDATE product_variations SET sku = ?, regular_price = ?, sale_price = ?, stock = ?, attributes_json = ?, is_purchasable = 1 WHERE id = ? AND product_id = ?').bind(
              v.sku, v.regular_price, v.sale_price, v.stock, JSON.stringify(v.attributes || {}), v.id, productId
            )
          )
        } else {
          // Insert new
          const variationId = crypto.randomUUID()
          const sku = v.sku || `SKU-${productId.substring(0,6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
          queries.push(
            c.env.DB.prepare('INSERT INTO product_variations (id, product_id, sku, regular_price, sale_price, stock, attributes_json, is_purchasable) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').bind(
              variationId, productId, sku, v.regular_price || 0, v.sale_price || null, v.stock || 0, JSON.stringify(v.attributes || {})
            )
          )
        }
      })
    } else if (type === 'simple') {
      // For simple products, we just update the first variation or insert one if it doesn't exist
      // Since it's complex to upsert without knowing the variation ID, we'll just update all variations of this product to match
      queries.push(
        c.env.DB.prepare('UPDATE product_variations SET regular_price = ?, sale_price = ?, stock = ? WHERE product_id = ?').bind(
          regular_price, sale_price, stock, productId
        )
      )
    }

    await c.env.DB.batch(queries)

    return c.json({ success: true, message: 'Product updated successfully' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// 6. Storefront Checkout API
app.post('/store/orders', async (c) => {
  try {
    const body = await c.req.json();
    const { email, items, customer_id, shipping_address_json } = body as { email: string, items: { variation_id: string, quantity: number }[], customer_id?: string, shipping_address_json?: any };

    if (!email || !items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Invalid payload: email and items are required' }, 400);
    }

    // Two-Step Check 1: Select current variations from DB to prevent Price Tampering and check Stock
    const variationIds = items.map(i => i.variation_id);
    const placeholders = variationIds.map(() => '?').join(',');
    
    // Using D1 API to bind an array of arguments
    const stmt = c.env.DB.prepare(`SELECT id, stock, sale_price, regular_price FROM product_variations WHERE id IN (${placeholders}) AND is_purchasable = 1`).bind(...variationIds);
    const { results } = await stmt.all<{ id: string, stock: number, sale_price: number, regular_price: number }>();

    let totalAmount = 0;
    const queries = [];
    const orderId = crypto.randomUUID();

    for (const item of items) {
      if (item.quantity <= 0) {
        return c.json({ success: false, error: `Invalid quantity for variation ${item.variation_id}` }, 400);
      }
      
      const dbVar = results.find(r => r.id === item.variation_id);
      if (!dbVar) {
        return c.json({ success: false, error: `Variation ${item.variation_id} not found or not purchasable` }, 400);
      }

      if (dbVar.stock < item.quantity) {
        return c.json({ success: false, error: `Insufficient stock for variation ${item.variation_id}. Available: ${dbVar.stock}` }, 400);
      }

      // Zero-Trust Pricing: Calculate total purely on Server Side
      const finalPrice = dbVar.sale_price !== null ? dbVar.sale_price : dbVar.regular_price;
      totalAmount += finalPrice * item.quantity;

      // Queue UPDATE and INSERT
      queries.push(
        c.env.DB.prepare('UPDATE product_variations SET stock = stock - ? WHERE id = ? AND stock >= ?').bind(item.quantity, item.variation_id, item.quantity)
      );
      
      queries.push(
        c.env.DB.prepare('INSERT INTO order_items (id, order_id, variation_id, quantity, price) VALUES (?, ?, ?, ?, ?)').bind(
          crypto.randomUUID(), orderId, item.variation_id, item.quantity, finalPrice
        )
      );
    }

    // Add Order Insert Query at the beginning
    queries.unshift(
      c.env.DB.prepare('INSERT INTO orders (id, customer_id, guest_email, status, total_amount, shipping_fee, shipping_address_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
        orderId, customer_id || null, email, 'processing', totalAmount, 0, shipping_address_json ? JSON.stringify(shipping_address_json) : null
      )
    );

    // Execute Batch
    await c.env.DB.batch(queries);

    return c.json({ success: true, message: 'Order created successfully', orderId, totalAmount });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Mount Customer routes
app.route('/', customerApp)

export default app
