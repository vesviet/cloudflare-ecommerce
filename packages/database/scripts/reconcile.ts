import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('--- PIM DATA RECONCILIATION ---');
  // Connect to local wrangler D1 or remote
  const url = process.env.DB_URL || 'file:../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite';
  const client = createClient({ url });
  const db = drizzle(client, { schema });

  try {
    // 1. Check Products
    const productsCount = await db.select({ count: sql<number>`count(*)` }).from(schema.products);
    const totalProducts = productsCount[0].count;
    console.log(`Total Products: ${totalProducts}`);

    // 2. Check Inventory Levels
    const inventoryCount = await db.select({ count: sql<number>`count(*)` }).from(schema.inventoryLevels);
    const totalInventory = inventoryCount[0].count;
    console.log(`Total Inventory Levels: ${totalInventory}`);
    
    if (totalProducts > 0 && totalInventory !== totalProducts) {
      console.warn(`⚠️ Warning: Inventory levels count (${totalInventory}) does not match products count (${totalProducts}). Some products might have been missing stock_quantity during migration.`);
    } else {
      console.log('✅ Inventory levels match product count.');
    }

    // 3. Check Price List Items
    const priceCount = await db.select({ count: sql<number>`count(*)` }).from(schema.priceListItems);
    console.log(`Total Price List Items (Base Prices): ${priceCount[0].count}`);

    // 4. Check Assets
    const assetsCount = await db.select({ count: sql<number>`count(*)` }).from(schema.assets);
    console.log(`Total Migrated Image Assets: ${assetsCount[0].count}`);
    
    // Check missing alt_text
    const missingAltText = await db.select({ count: sql<number>`count(*)` }).from(schema.assets).where(sql`alt_text = '' OR alt_text IS NULL`);
    if (missingAltText[0].count > 0) {
      console.error(`❌ Error: ${missingAltText[0].count} assets are missing alt_text (WCAG 2.2 Violation)!`);
      process.exit(1);
    } else {
      console.log('✅ All assets have alt_text (WCAG 2.2 Compliant).');
    }

    console.log('--- RECONCILIATION SUCCESSFUL ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Data Reconciliation Failed:', err);
    process.exit(1);
  }
}

main();
