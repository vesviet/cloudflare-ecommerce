import { createMiddleware } from 'hono/factory';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { Bindings } from '../types';

type Variables = {
  adminUser: { id: string; email: string; role: string };
  auditLogData: {
    coupon_id: string;
    action: 'created' | 'updated' | 'disabled' | 'enabled' | 'deleted' | 'bulk_generated';
    diff_json?: any;
  };
};

export const auditMiddleware = createMiddleware<{ Bindings: Bindings, Variables: Variables }>(async (c, next) => {
  await next();

  const auditData = c.get('auditLogData');
  if (auditData && c.res.status >= 200 && c.res.status < 300) {
    const user = c.get('adminUser');
    const db = createDb(c.env.DB);
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    try {
      await db.insert(localSchema.auditLogs).values({
        id: crypto.randomUUID(),
        admin_id: user?.id || null, // admin_id is nullable in schema, so null instead of 'system' if not present
        action: auditData.action,
        entity_type: 'promotion',
        entity_id: auditData.coupon_id,
        payload_json: JSON.stringify({
          diff_json: auditData.diff_json || null,
          ip_address: ipAddress
        }),
      }).execute();
    } catch (e) {
      console.error('Failed to write audit log', e);
    }
  }
});
