import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import Stripe from 'stripe';

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
      variation_id: schema.orderItems.variation_id,
      quantity: schema.orderItems.quantity,
      price_at_purchase: schema.orderItems.price_at_purchase,
      sku: schema.productVariations.sku,
      product_title: schema.products.title,
    })
      .from(schema.orderItems)
      .leftJoin(schema.productVariations, eq(schema.orderItems.variation_id, schema.productVariations.id))
      .leftJoin(schema.products, eq(schema.productVariations.product_id, schema.products.id))
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

    // Call Stripe if applicable
    if (order.payment_intent_id && c.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
        await stripe.refunds.create({
          payment_intent: order.payment_intent_id
        });
      } catch (stripeErr: any) {
        return c.json({ success: false, error: `Stripe Refund failed: ${stripeErr.message}` }, 500);
      }
    }

    const items = await db.select({
      variation_id: schema.orderItems.variation_id,
      quantity: schema.orderItems.quantity,
    })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();

    // Drizzle batch: update order status + restock all variations atomically and sync in_stock
    await db.batch([
      db.update(schema.orders)
        .set({ status: 'refunded', updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.orders.id, orderId)),
      ...items.map(item =>
        db.update(schema.productVariations)
          .set({ stock: sql`stock + ${item.quantity}`, in_stock: 1 })
          .where(eq(schema.productVariations.id, item.variation_id))
      ),
    ]);

    return c.json({ success: true, message: `Refunded order ${orderId} successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/fulfill', requireRole(['superadmin', 'manager', 'support']), async (c) => {
  const orderId = c.req.param('id');
  try {
    const { tracking_number, carrier_name } = await c.req.json();
    if (!tracking_number || !carrier_name) {
      return c.json({ success: false, error: 'Tracking number and carrier name are required' }, 400);
    }

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

    // Update order status to completed and attach tracking details
    await db.update(schema.orders)
      .set({ 
        status: 'completed', 
        tracking_number, 
        carrier_name,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(schema.orders.id, orderId));

    // Send email notification event via Queue
    if (c.env.EVENT_QUEUE) {
      await c.env.EVENT_QUEUE.send({
        type: 'ORDER_SHIPPED',
        orderId,
        trackingNumber: tracking_number,
        carrierName: carrier_name,
      });
    }

    return c.json({ success: true, message: `Order ${orderId} fulfilled successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default orders;
