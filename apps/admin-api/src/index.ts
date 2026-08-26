import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';

import { createDb, schema } from '@ecommerce/database';
import metricsRoutes from './routes/metrics';
import ordersRoutes from './routes/orders';
import landingPagesRoutes from './routes/landing-pages';
import landingLeadsRoutes from './routes/landingLeads';
import customersRoutes from './routes/customers';
import productsRoutes from './routes/products';
import checkoutRoutes from './routes/checkout';
import categoriesRoutes from './routes/categories';
import cmsRoutes from './routes/cms';
import couponsRoutes from './routes/coupons';
import promotionsRoutes from './routes/promotions';
import { mediaRouter as mediaRoutes } from '@ecommerce/shared-routes';
import adminUsersRoutes from './routes/adminUsers';
import settingsRoutes from './routes/settings';

import { adminAuth, type Env } from './middleware/auth';

const app = new Hono<Env>().basePath('/api');

// 1. Enable CORS for Frontend cross-origin requests
app.use('*', cors({
  origin: (origin, c) => {
    const env = c.env as Bindings;
    const allowedList = env.ALLOWED_ADMIN_ORIGINS
      ? env.ALLOWED_ADMIN_ORIGINS.split(',')
      : ['http://localhost:5173'];
    return allowedList.includes(origin) ? origin : null;
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Local-Admin-Email', 'CF-Access-JWT-Assertion'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// 2. Middleware bảo vệ Admin: RBAC & Zero Trust
app.use('*', adminAuth);

// Endpoint to get current user info
app.get('/me', (c) => {
  const user = c.get('adminUser');
  return c.json({ success: true, data: user });
});

// Register routers
app.route('/', metricsRoutes);
app.route('/', ordersRoutes);
app.route('/', landingPagesRoutes);
app.route('/', landingLeadsRoutes);
app.route('/', customersRoutes);
app.route('/', productsRoutes);
app.route('/', checkoutRoutes);
app.route('/categories', categoriesRoutes);
app.route('/cms', cmsRoutes);
app.route('/coupons', couponsRoutes);
app.route('/promotions', promotionsRoutes);
app.route('/media', mediaRoutes);
app.route('/admin-users', adminUsersRoutes);
app.route('/settings', settingsRoutes);

export type AppType = typeof app;

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    const db = createDb(env.DB);
    
    for (const msg of batch.messages) {
      try {
        await db.insert(schema.failedJobs)
          .values({
            id: crypto.randomUUID(),
            source_message_id: msg.id,
            queue_name: batch.queue,
            payload_json: JSON.stringify(msg.body),
            error_message: "Dead Letter Queue: Max retries exceeded",
          })
          .onConflictDoNothing();

        msg.ack();
      } catch (err) {
        console.error(`[DLQ Consumer] Failed to persist DLQ message ${msg.id}:`, err);
        msg.retry();
      }
    }
  }
};
