import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';
import { customerRouter as customerApp } from '@ecommerce/shared-routes';
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
  origin: '*',
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

// Mount Customer routes
app.route('/', customerApp);

export default app;
