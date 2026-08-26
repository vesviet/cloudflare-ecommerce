import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { FlashSaleService } from '@ecommerce/core-services';

type Bindings = {
  DB: D1Database;
};

// Phase 2B: public flash-sale feed for the storefront countdown banner.
const flashSales = new Hono<{ Bindings: Bindings }>();

flashSales.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const sale = await FlashSaleService.getActiveFlashSalePublic(db);
    if (!sale) {
      return c.json({ success: true, data: null });
    }
    return c.json({ success: true, data: sale });
  } catch (err: any) {
    console.error('[Flash Sales] active error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default flashSales;
