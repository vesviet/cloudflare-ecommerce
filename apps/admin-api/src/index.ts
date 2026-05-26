import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';
import customerApp from './customer';
import metricsRoutes from './routes/metrics';
import ordersRoutes from './routes/orders';
import customersRoutes from './routes/customers';
import productsRoutes from './routes/products';
import checkoutRoutes from './routes/checkout';
import categoriesRoutes from './routes/categories';

const app = new Hono<{ Bindings: Bindings }>();

// 1. Enable CORS for Frontend cross-origin requests
app.use('*', cors());

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
});

// Register routers
app.route('/', metricsRoutes);
app.route('/', ordersRoutes);
app.route('/', customersRoutes);
app.route('/', productsRoutes);
app.route('/', checkoutRoutes);
app.route('/categories', categoriesRoutes);

// Mount Customer routes
app.route('/', customerApp);

export default app;
