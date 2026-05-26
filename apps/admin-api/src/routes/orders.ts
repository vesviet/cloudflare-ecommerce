import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';

const orders = new Hono<{ Bindings: Bindings }>();

orders.get('/orders', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const results = await db.select()
      .from(schema.orders)
      .orderBy(sql`${schema.orders.created_at} DESC`)
      .all();
    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/refund', async (c) => {
  const orderId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);

    const order = await db.select({ status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (order.status === 'refunded') {
      return c.json({ success: false, error: 'Order is already refunded' }, 400);
    }

    const items = await db.select({
      variation_id: schema.orderItems.variation_id,
      quantity: schema.orderItems.quantity,
    })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();

    // Drizzle batch: update order status + restock all variations atomically
    await db.batch([
      db.update(schema.orders)
        .set({ status: 'refunded', updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.orders.id, orderId)),
      ...items.map(item =>
        db.update(schema.productVariations)
          .set({ stock: sql`stock + ${item.quantity}` })
          .where(eq(schema.productVariations.id, item.variation_id))
      ),
    ]);

    return c.json({ success: true, message: `Refunded order ${orderId} successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default orders;
