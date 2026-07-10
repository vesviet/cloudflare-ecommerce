import { createDb, schema } from '@ecommerce/database';
import { sql } from 'drizzle-orm';
import { Bindings } from '../types';

export const syncCategoryFiltersToKV = async (env: Bindings) => {
  try {
    const db = createDb(env.DB);
    // Aggregate distinct keys from attributes_json grouped by primary_category_id
    // SQLite doesn't natively extract all keys easily, so we fetch and aggregate in TS
    
    const results = await db.all<any>(sql`
      SELECT primary_category_id, attributes_json 
      FROM products 
      WHERE parent_id IS NOT NULL 
        AND attributes_json IS NOT NULL 
        AND attributes_json != '{}'
        AND deleted_at IS NULL
        AND is_purchasable = 1
    `);

    const filtersByCategory: Record<string, Set<string>> = {};

    for (const row of results) {
      if (!row.primary_category_id) continue;
      
      let attrs: any;
      try {
        attrs = JSON.parse(row.attributes_json);
      } catch {
        continue;
      }
      
      const categoryId = row.primary_category_id;
      if (!filtersByCategory[categoryId]) {
        filtersByCategory[categoryId] = new Set();
      }
      
      Object.keys(attrs).forEach(key => {
        filtersByCategory[categoryId].add(key);
      });
    }

    // Save to KV
    for (const [categoryId, keysSet] of Object.entries(filtersByCategory)) {
      const keysArray = Array.from(keysSet);
      await env.CATALOG_FILTERS_KV.put(`category_filters:${categoryId}`, JSON.stringify({ available_filters: keysArray }));
    }
    
    // Generate a master list
    await env.CATALOG_FILTERS_KV.put('master_filters_sync_time', new Date().toISOString());

  } catch (err) {
    console.error('Failed to sync filters to KV', err);
  }
};
