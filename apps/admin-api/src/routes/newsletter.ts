import { Hono } from 'hono';
import { Bindings } from '../types';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { desc } from 'drizzle-orm';
import { auditMiddleware } from '../middleware/audit';
import { requireRole } from '../middleware/auth';

// Phase 4b (NWS-02): newsletter subscriber management + CSV export.

const router = new Hono<{ Bindings: Bindings, Variables: any }>();
router.use('*', auditMiddleware);

router.get('/subscribers', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select()
    .from(localSchema.newsletterSubscribers)
    .orderBy(desc(localSchema.newsletterSubscribers.created_at))
    .all();
  return c.json({ success: true, data: rows });
});

function toCsv(rows: any[]): string {
  const header = 'id,email,status,source,created_at';
  const lines = rows.map((r) =>
    [r.id, r.email, r.status, r.source, r.created_at]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  return `${header}\n${lines.join('\n')}`;
}

router.get('/export.csv', requireRole(['superadmin', 'manager']), async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select()
    .from(localSchema.newsletterSubscribers)
    .orderBy(desc(localSchema.newsletterSubscribers.created_at))
    .all();
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

export default router;
