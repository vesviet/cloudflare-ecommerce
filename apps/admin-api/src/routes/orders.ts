import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { fulfillSchema } from '@ecommerce/contract';
import { PaymentService, InventoryService, OrderService } from '@ecommerce/core-services';

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

orders.get('/orders/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const orderId = c.req.param('id');
    
    const order = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
      
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    const items = await db.select({
      id: schema.orderItems.id,
      order_id: schema.orderItems.order_id,
      product_id: schema.orderItems.product_id,
      quantity: schema.orderItems.quantity,
      price_at_purchase: schema.orderItems.price_at_purchase,
      sku: schema.products.sku,
      product_title: schema.products.title,
    })
      .from(schema.orderItems)
      .leftJoin(schema.products, eq(schema.orderItems.product_id, schema.products.id))
      .where(eq(schema.orderItems.order_id, orderId))
      .all();

    return c.json({ success: true, data: { ...order, items } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/refund', requireRole(['superadmin', 'manager', 'support']), async (c) => {
  const orderId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);

    const order = await db.select({ status: schema.orders.status, payment_intent_id: schema.orders.payment_intent_id })
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (!order.status || !['processing', 'completed'].includes(order.status)) {
      return c.json({ success: false, error: `Order cannot be refunded from status: ${order.status}` }, 400);
    }

    if (order.payment_intent_id && c.env.STRIPE_SECRET_KEY) {
      try {
        await PaymentService.processRefund(c.env.STRIPE_SECRET_KEY, order.payment_intent_id);
      } catch (stripeErr: any) {
        return c.json({ success: false, error: `Stripe Refund failed: ${stripeErr.message}` }, 500);
      }
    }

    const items = await db.select({
      product_id: schema.orderItems.product_id,
      quantity: schema.orderItems.quantity,
    })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();

    const batchQueries = [
      ...OrderService.getAdvanceOrderStatusQueries(db, orderId, 'refunded'),
      ...InventoryService.getRestockQueries(db, items),
    ];

    await db.batch(batchQueries as any);

    return c.json({ success: true, message: `Refunded order ${orderId} successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/fulfill', requireRole(['superadmin', 'manager', 'support']), zValidator('json', fulfillSchema), async (c) => {
  const orderId = c.req.param('id');
  try {
    const { tracking_number, carrier_name, items } = c.req.valid('json');

    const db = createDb(c.env.DB);
    const order = await db.select({ status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (order.status !== 'processing') {
      return c.json({ success: false, error: `Order cannot be fulfilled from status: ${order.status}` }, 400);
    }

    const { queries, isFullyFulfilled } = await OrderService.prepareFulfillment(db, orderId, tracking_number, carrier_name, items);

    await db.batch(queries as any);

    if (c.env.EVENT_QUEUE) {
      await c.env.EVENT_QUEUE.send({
        type: 'ORDER_SHIPPED',
        orderId,
        trackingNumber: tracking_number,
        carrierName: carrier_name,
        isPartial: !isFullyFulfilled
      });
    }

    return c.json({ success: true, message: `Order ${orderId} ${isFullyFulfilled ? 'completely' : 'partially'} fulfilled successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default orders;
