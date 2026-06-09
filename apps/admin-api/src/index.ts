import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { createDb, schema } from '@ecommerce/database';
import metricsRoutes from './routes/metrics';
import ordersRoutes from './routes/orders';
import customersRoutes from './routes/customers';
import productsRoutes from './routes/products';
import checkoutRoutes from './routes/checkout';
import categoriesRoutes from './routes/categories';
import cmsRoutes from './routes/cms';
import { mediaRouter as mediaRoutes } from '@ecommerce/shared-routes';
import adminUsersRoutes from './routes/adminUsers';

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
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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
app.route('/', customersRoutes);
app.route('/', productsRoutes);
app.route('/', checkoutRoutes);
app.route('/categories', categoriesRoutes);
app.route('/cms', cmsRoutes);
app.route('/media', mediaRoutes);
app.route('/admin-users', adminUsersRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    const db = createDb(env.DB);
    const now = Math.floor(Date.now() / 1000);
    
    // Find expired orders (pending_payment orders older than 30 mins)
    const expiredReservations = await db.select({ order_id: schema.inventoryReservations.order_id })
      .from(schema.inventoryReservations)
      .where(sql`expires_at < ${now}`)
      .all();
      
    if (expiredReservations.length > 0) {
      const orderIds = Array.from(new Set(expiredReservations.map(r => r.order_id)));
      
      const batchQueries: any[] = [];
      // Mark orders as failed
      batchQueries.push(
        db.update(schema.orders)
          .set({ status: 'failed' })
          .where(and(
            inArray(schema.orders.id, orderIds),
            eq(schema.orders.status, 'pending_payment')
          ))
      );
      
      // Delete reservations
      batchQueries.push(
        db.delete(schema.inventoryReservations)
          .where(sql`expires_at < ${now}`)
      );
      
      await db.batch(batchQueries as any);
      console.log(`[Cron] Cleaned up ${expiredReservations.length} expired reservations for ${orderIds.length} orders.`);
    }
  }
};
