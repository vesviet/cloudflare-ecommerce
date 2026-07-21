import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';

import { createDb, schema } from '@ecommerce/database';
import metricsRoutes from './routes/metrics';
import ordersRoutes from './routes/orders';
import landingPagesRoutes from './routes/landing-pages';
import customersRoutes from './routes/customers';
import productsRoutes from './routes/products';
import checkoutRoutes from './routes/checkout';
import categoriesRoutes from './routes/categories';
import cmsRoutes from './routes/cms';
import couponsRoutes from './routes/coupons';
import { mediaRouter as mediaRoutes } from '@ecommerce/shared-routes';
import adminUsersRoutes from './routes/adminUsers';
import settingsRoutes from './routes/settings';

import { adminAuth, type Env } from './middleware/auth';
import { runCartCleanup } from './workers/cart-cleanup.cron';

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
app.route('/', customersRoutes);
app.route('/', productsRoutes);
app.route('/', checkoutRoutes);
app.route('/categories', categoriesRoutes);
app.route('/cms', cmsRoutes);
app.route('/coupons', couponsRoutes);
app.route('/media', mediaRoutes);
app.route('/admin-users', adminUsersRoutes);
app.route('/settings', settingsRoutes);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    const db = createDb(env.DB);
    const queries = [];
    
    for (const msg of batch.messages) {
      queries.push(
        db.insert(schema.failedJobs).values({
          id: crypto.randomUUID(),
          queue_name: batch.queue,
          payload_json: JSON.stringify(msg.body),
          error_message: "Dead Letter Queue: Max retries exceeded in public-api",
        })
      );
      msg.ack();
    }
    
    if (queries.length > 0) {
      await db.batch(queries as any);
      console.log(`[DLQ Consumer] Logged ${queries.length} failed jobs to D1.`);
    }
  },
  async scheduled(event: any, env: Bindings, _ctx: any): Promise<void> {
    console.log(`[Cron Admin] Triggered cron=${event.cron} at ${new Date().toISOString()}`);
    const db = createDb(env.DB);
    
    if (event.cron === '0 0 * * *') {
      await runCartCleanup(db);
    }
  }
};
