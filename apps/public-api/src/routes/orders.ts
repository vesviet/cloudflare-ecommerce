import { Hono } from 'hono';
import { createDb, verifyJWT } from '@ecommerce/database';
import { OrderService, localSchema } from '@ecommerce/core-services';
import { TrackOrderSchema } from '@ecommerce/contract';
import { zValidator } from '@hono/zod-validator';
import { rateLimit, clientIp, type RateLimiter } from '@ecommerce/shared-routes';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  AUTH_RATE_LIMITER?: RateLimiter;
};

// T1.2/T1.4: public order endpoints that do NOT require login.
// - POST /track      : guest tracking by order id + email (generic miss error).
// - GET /:id/receipt : guarded receipt for the signed token issued at checkout.
const orders = new Hono<{ Bindings: Bindings }>();

const limitTrack = rateLimit({
  binding: 'AUTH_RATE_LIMITER',
  scope: 'order-track',
  key: clientIp,
  message: 'Too many lookup attempts. Please wait a minute and try again.',
});

orders.post('/track', limitTrack, zValidator('json', TrackOrderSchema), async (c) => {
  try {
    const { order_id, email } = c.req.valid('json');
    const db = createDb(c.env.DB);

    const result = await OrderService.findTrackableOrder(db, order_id, email);
    if (!result) {
      // Deliberately generic: identical response whether the order id or the
      // email is wrong, so the endpoint cannot be used to enumerate orders.
      return c.json({ success: false, error: 'We could not find an order matching those details.' }, 404);
    }
    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Orders] track error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

orders.get('/:id/receipt', async (c) => {
  try {
    const orderId = c.req.param('id');
    const token = c.req.query('token');
    if (!token || !c.env.JWT_SECRET) {
      return c.json({ success: false, error: 'Invalid or expired order link.' }, 403);
    }

    let payload: any;
    try {
      payload = await verifyJWT(token, c.env.JWT_SECRET);
    } catch {
      return c.json({ success: false, error: 'Invalid or expired order link.' }, 403);
    }
    if (payload?.scope !== 'order-receipt' || payload?.order_id !== orderId) {
      return c.json({ success: false, error: 'Invalid or expired order link.' }, 403);
    }

    const db = createDb(c.env.DB);
    const result = await OrderService.getPublicOrderById(db, orderId);
    if (!result) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Orders] receipt error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default orders;
