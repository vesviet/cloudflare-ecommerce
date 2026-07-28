import { sql, eq } from 'drizzle-orm';
import { localSchema as schema } from '@ecommerce/core-services';

export const runCartCleanup = async (db: any) => {
  // 30 days ago in seconds
  const thirtyDaysAgoSeconds = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  
  const MAX_ITERATIONS = 5;
  let iterations = 0;
  let deletedCount = 0;

  while (iterations < MAX_ITERATIONS) {
    const staleCarts = await db.select({ id: schema.carts.id })
      .from(schema.carts)
      .where(sql`${schema.carts.last_active_at} < ${thirtyDaysAgoSeconds}`)
      .limit(100)
      .all();

    if (!staleCarts || staleCarts.length === 0) break;

    const cartIds = staleCarts.map((c: any) => c.id);
    
    // cartItems has ON DELETE CASCADE, so we only need to delete carts
    const deleteBatch = cartIds.map((id: string) => db.delete(schema.carts).where(eq(schema.carts.id, id)));
    await db.batch(deleteBatch as any);
    
    deletedCount += cartIds.length;
    iterations++;
  }
  
  if (deletedCount > 0) {
    console.log(`[Cron Admin] Deleted ${deletedCount} abandoned carts older than 30 days.`);
  } else {
    console.log(`[Cron Admin] No abandoned carts older than 30 days found.`);
  }
};
