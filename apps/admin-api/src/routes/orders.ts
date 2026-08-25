import { Hono } from 'hono';
import { and, eq, like, or, sql } from 'drizzle-orm';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { Bindings } from '../types';
import { requireRole } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { fulfillSchema, canTransitionOrder } from '@ecommerce/contract';
import { PaymentService, OrderService, FulfillmentService } from '@ecommerce/core-services';

const orders = new Hono<{ Bindings: Bindings }>();

orders.get('/orders', requireRole(['superadmin', 'manager', 'support', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);
    const status = c.req.query('status');
    const search = c.req.query('search') || c.req.query('q');

    const conditions: any[] = [];
    if (status) {
      conditions.push(eq(localSchema.orders.status, status));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(localSchema.orders.id, searchPattern),
          like(localSchema.orders.guest_email, searchPattern),
          like(localSchema.orders.customer_id, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countRows] = await Promise.all([
      db.select()
        .from(localSchema.orders)
        .where(whereClause)
        .orderBy(sql`${localSchema.orders.created_at} DESC`)
        .limit(limit)
        .offset(offset)
        .all(),
      db.select({ total: sql<number>`count(*)` })
        .from(localSchema.orders)
        .where(whereClause)
        .all(),
    ]);
    const total = countRows[0]?.total ?? 0;
    return c.json({ success: true, data: results, pagination: { total, limit, offset } });
  } catch (err: any) {
    console.error('Admin list orders error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

orders.get('/orders/:id', requireRole(['superadmin', 'manager', 'support', 'editor']), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const orderId = c.req.param('id');
    
    const order = await db.select()
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
      
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    const items = await db.select({
      id: localSchema.orderItems.id,
      order_id: localSchema.orderItems.order_id,
      product_id: localSchema.orderItems.product_id,
      quantity: localSchema.orderItems.quantity,
      price_at_purchase: localSchema.orderItems.price_at_purchase,
      sku: localSchema.products.sku,
      product_title: localSchema.products.title,
    })
      .from(localSchema.orderItems)
      .leftJoin(localSchema.products, eq(localSchema.orderItems.product_id, localSchema.products.id))
      .where(eq(localSchema.orderItems.order_id, orderId))
      .all();

    let discounts: any[] = [];
    if (order.applied_promotions_json) {
      try {
        const parsed = JSON.parse(order.applied_promotions_json);
        if (Array.isArray(parsed)) {
          discounts = parsed.map((p: any) => ({
            id: p.id || p.coupon_id || "",
            coupon_id: p.coupon_id || p.id || "",
            discount_amount: p.discount_amount || 0,
            coupon_code: p.coupon_code || p.code || "",
          }));
        }
      } catch (e) {
        console.error('Failed to parse applied_promotions_json', e);
      }
    }

    return c.json({ success: true, data: { ...order, items, discounts } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/refund', requireRole(['superadmin', 'manager', 'support']), async (c) => {
  const orderId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);

    const order = await db.select({ status: localSchema.orders.status, payment_intent_id: localSchema.orders.payment_intent_id })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (!order.status || !canTransitionOrder(order.status, 'refunded')) {
      return c.json({ success: false, error: `Order cannot be refunded from status: ${order.status}` }, 400);
    }

    if (order.payment_intent_id && c.env.STRIPE_SECRET_KEY) {
      try {
        await PaymentService.processRefund(
          c.env.STRIPE_SECRET_KEY,
          order.payment_intent_id,
          `admin-refund:${orderId}`,
        );
      } catch (stripeErr: any) {
        return c.json({ success: false, error: `Stripe Refund failed: ${stripeErr.message}` }, 500);
      }
    }

    const success = await OrderService.refundOrderAndRestock(db, c.env.DB, orderId, order.status);
    if (!success) {
      return c.json({ success: false, error: 'Failed to refund and restock order' }, 500);
    }

    return c.json({ success: true, message: `Refunded order ${orderId} successfully` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.post('/orders/:id/fulfill', requireRole(['superadmin', 'manager', 'support']), zValidator('json', fulfillSchema), async (c) => {
  const orderId = c.req.param('id');
  try {
    const { tracking_number, carrier_name, items } = c.req.valid('json');

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Fulfillment must contain at least one item' }, 400);
    }

    const db = createDb(c.env.DB);
    const order = await db.select({ 
      status: localSchema.orders.status,
      guest_email: localSchema.orders.guest_email
    })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const allowedStatuses = ['processing', 'shipped'];

    if (!allowedStatuses.includes(order.status || "")) {
      return c.json({ success: false, error: `Order cannot be fulfilled from status: ${order.status}` }, 400);
    }
    const aggregatedMap = new Map<string, number>();
    for (const item of items) {
      const orderItemId = item.order_item_id;
      const quantity = item.quantity;
      aggregatedMap.set(orderItemId, (aggregatedMap.get(orderItemId) || 0) + quantity);
    }

    const mappedItems: { orderItemId: string; quantity: number }[] = [];
    for (const [orderItemId, quantity] of aggregatedMap.entries()) {
      mappedItems.push({ orderItemId, quantity });
    }

    // Fetch all database orderItems for the orderId
    const dbOrderItems = await db.select()
      .from(localSchema.orderItems)
      .where(eq(localSchema.orderItems.order_id, orderId))
      .all();

    // Build a map of these items
    const orderItemsMap = new Map<string, any>();
    for (const item of dbOrderItems) {
      orderItemsMap.set(item.id, item);
    }

    // Verify that every item in the incoming payload exists and belongs to the order
    for (const item of mappedItems) {
      if (!orderItemsMap.has(item.orderItemId)) {
        return c.json({ success: false, error: `Item ${item.orderItemId} does not exist or does not belong to this order` }, 400);
      }
    }

    // Fetch already fulfilled quantities for these items from the database
    const shipmentItems = await db.select({
      orderItemId: localSchema.shipmentItems.order_item_id,
      fulfilledQuantity: sql<number>`coalesce(sum(${localSchema.shipmentItems.quantity}), 0)`
    })
      .from(localSchema.shipmentItems)
      .innerJoin(localSchema.shipments, eq(localSchema.shipmentItems.shipment_id, localSchema.shipments.id))
      .where(eq(localSchema.shipments.order_id, orderId))
      .groupBy(localSchema.shipmentItems.order_item_id)
      .all();

    const fulfilledMap = new Map<string, number>();
    for (const item of shipmentItems) {
      fulfilledMap.set(item.orderItemId, Number(item.fulfilledQuantity));
    }

    // Check if incoming_payload_quantity > ordered_quantity - already_fulfilled_quantity
    for (const item of mappedItems) {
      const dbItem = orderItemsMap.get(item.orderItemId);
      const orderedQty = dbItem.quantity;
      const alreadyFulfilledQty = fulfilledMap.get(item.orderItemId) || 0;

      if (item.quantity > orderedQty - alreadyFulfilledQty) {
        return c.json({ success: false, error: 'Requested quantity exceeds remaining quantity to fulfill' }, 400);
      }
    }

    // Only a fully fulfilled order moves to shipped. Marking a partial shipment as
    // shipped lets the carrier webhook complete an order that still owes items.
    const totalOrderedQty = dbOrderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const previouslyFulfilledQty = Array.from(fulfilledMap.values()).reduce((sum, qty) => sum + qty, 0);
    const newlyFulfilledQty = mappedItems.reduce((sum, item) => sum + item.quantity, 0);
    const isFullyFulfilled = previouslyFulfilledQty + newlyFulfilledQty >= totalOrderedQty;

    const shipmentId = await FulfillmentService.createFulfillment(
      db,
      orderId,
      mappedItems,
      tracking_number,
      carrier_name
    );

    await FulfillmentService.updateStatus(db, shipmentId, 'shipped');

    if (isFullyFulfilled) {
      await db.update(localSchema.orders)
        .set({ status: 'shipped', updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(localSchema.orders.id, orderId))
        .run();
    }

    if (c.env.EVENT_QUEUE) {
      await c.env.EVENT_QUEUE.send({
        type: 'ORDER_SHIPPED',
        orderId,
        trackingNumber: tracking_number,
        carrierName: carrier_name,
        isPartial: !isFullyFulfilled
      });
    }

    return c.json({
      success: true,
      is_partial: !isFullyFulfilled,
      message: isFullyFulfilled
        ? `Order ${orderId} fully fulfilled`
        : `Order ${orderId} partially fulfilled`
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

orders.get('/shipments/:id/label', requireRole(['superadmin', 'manager', 'support']), async (c) => {
  try {
    const shipmentId = c.req.param('id');
    const db = createDb(c.env.DB);
    
    const shipment = await db.select({ label_r2_key: localSchema.shipments.label_r2_key })
      .from(localSchema.shipments)
      .where(eq(localSchema.shipments.id, shipmentId))
      .get();
      
    if (!shipment || !shipment.label_r2_key) {
      return c.json({ success: false, error: 'Label not found' }, 404);
    }

    // Proxy the R2 object directly through the worker (authenticated)
    // @ts-expect-error - R2 bucket type mismatch in bindings
    const object = await c.env.SHIPPING_LABELS_R2.get(shipment.label_r2_key);
    
    if (object === null) {
      return c.json({ success: false, error: 'Object not found in R2' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    return new Response(object.body, { headers });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});


// POST: /api/orders/:id/approve (Telesale confirms order)
orders.post('/orders/:id/approve', requireRole(['superadmin', 'manager', 'support', 'editor']), async (c) => {
  const orderId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);

    // Guard the state machine via the shared transition map (T1.1): never
    // re-open an order that cannot legally move to processing.
    const current = await db.select({ status: localSchema.orders.status })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
    if (!current) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (!canTransitionOrder(current.status, 'processing')) {
      return c.json({ success: false, error: `Order cannot be approved from status: ${current.status}` }, 400);
    }

    await db.update(localSchema.orders)
      .set({ status: 'processing', updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(localSchema.orders.id, orderId));

    await db.update(localSchema.landingPageLeads)
      .set({ sync_status: 'synced' })
      .where(eq(localSchema.landingPageLeads.order_id, orderId));

    return c.json({ success: true, message: `Order ${orderId} approved and set to processing` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST: /api/orders/:id/cancel (Telesale cancels order)
orders.post('/orders/:id/cancel', requireRole(['superadmin', 'manager', 'support', 'editor']), async (c) => {
  const orderId = c.req.param('id');
  try {
    const db = createDb(c.env.DB);

    // Guard the state machine via the shared transition map (T1.1): shipped,
    // completed, cancelled and refunded orders are not cancellable.
    const current = await db.select({ status: localSchema.orders.status })
      .from(localSchema.orders)
      .where(eq(localSchema.orders.id, orderId))
      .get();
    if (!current) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (!canTransitionOrder(current.status, 'cancelled')) {
      return c.json({ success: false, error: `Order cannot be cancelled from status: ${current.status}` }, 400);
    }

    await db.update(localSchema.orders)
      .set({ status: 'cancelled', updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(localSchema.orders.id, orderId));

    await db.update(localSchema.landingPageLeads)
      .set({ sync_status: 'cancelled' })
      .where(eq(localSchema.landingPageLeads.order_id, orderId));

    return c.json({ success: true, message: `Order ${orderId} cancelled` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default orders;
