import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { createDb } from '@ecommerce/database';
import { Bindings } from '../types';

const metrics = new Hono<{ Bindings: Bindings }>();

metrics.get('/metrics', async (c) => {
  try {
    const db = createDb(c.env.DB);

    // Aggregate sales, orders, and refund count in one raw sql expression (Drizzle sql helper)
    const stats = await db.get<{ totalSales: number; totalOrders: number; refundedOrders: number }>(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status IN ('processing', 'completed') THEN total_amount ELSE 0 END), 0) as totalSales,
        COUNT(*) as totalOrders,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END), 0) as refundedOrders
      FROM orders
    `);

    const lowStock = await db.get<{ lowStockCount: number }>(sql`
      SELECT COUNT(DISTINCT product_id) as lowStockCount FROM inventory_levels WHERE stock_quantity < 5
    `);

    const totalOrders = stats?.totalOrders || 0;
    const refundedOrders = stats?.refundedOrders || 0;
    const refundRate = totalOrders > 0 ? parseFloat(((refundedOrders / totalOrders) * 100).toFixed(1)) : 0;

    return c.json({
      success: true,
      data: {
        totalSales: stats?.totalSales || 0,
        totalOrders: totalOrders,
        refundRate: refundRate,
        lowStockCount: lowStock?.lowStockCount || 0,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default metrics;
