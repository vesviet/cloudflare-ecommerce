export class InventoryRepository {
  /**
   * Atomically deducts stock for multiple items using D1 raw prepared statements.
   * Emulates a manual Two-Phase Commit / Rollback since D1 batch cannot rollback on 0-rows-affected.
   */
  static async deductStock(
    env: any, 
    items: { productId: string; quantity: number }[],
    locationId: string = 'loc-1'
  ): Promise<boolean> {
    if (items.length === 0) return true;

    if (env.INVENTORY_DO) {
      try {
        const id = env.INVENTORY_DO.idFromName('GLOBAL_INVENTORY');
        const stub = env.INVENTORY_DO.get(id);
        const res = await stub.fetch('http://do/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, locationId })
        });
        const data = await res.json() as any;
        return !!data.success;
      } catch (err) {
        console.error('[InventoryRepository] DO deductStock error:', err);
        return false;
      }
    }

    const envDb = env.DB || env;

    const succeeded: { productId: string; quantity: number }[] = [];

    for (const item of items) {
      try {
        // D1 raw SQL: UPDATE inventory_levels SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND location_id = ? AND stock_quantity >= ? RETURNING id
        const result = await envDb.prepare(
          'UPDATE inventory_levels SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND location_id = ? AND stock_quantity >= ? RETURNING id'
        )
        .bind(item.quantity, item.productId, locationId, item.quantity)
        .all();

        // If no rows were returned, it means the product is out of stock (condition failed)
        if (!result.results || result.results.length === 0) {
          // Rollback previously succeeded items
          if (succeeded.length > 0) {
            await this.restock(envDb, succeeded, locationId);
          }
          return false;
        }

        succeeded.push(item);
      } catch (err) {
        // Database error, rollback what we have
        if (succeeded.length > 0) {
          await this.restock(envDb, succeeded, locationId);
        }
        throw err;
      }
    }

    return true;
  }

  /**
   * Restores stock quantities atomically.
   */
  static async restock(
    env: any, 
    items: { productId: string; quantity: number }[],
    locationId: string = 'loc-1'
  ): Promise<void> {
    if (items.length === 0) return;

    if (env.INVENTORY_DO) {
      try {
        const id = env.INVENTORY_DO.idFromName('GLOBAL_INVENTORY');
        const stub = env.INVENTORY_DO.get(id);
        await stub.fetch('http://do/restock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, locationId })
        });
        return;
      } catch (err) {
        console.error('[InventoryRepository] DO restock error:', err);
        return;
      }
    }

    const envDb = env.DB || env;

    const stmts = items.map(item => {
      return envDb.prepare(
        'UPDATE inventory_levels SET stock_quantity = stock_quantity + ? WHERE product_id = ? AND location_id = ?'
      ).bind(item.quantity, item.productId, locationId);
    });

    if (envDb.batch) {
      await envDb.batch(stmts);
    } else {
      // Fallback for tests if db.batch is not mocked
      for (const stmt of stmts) {
        await stmt.all();
      }
    }
  }

  /**
   * Invalidates cached inventory level inside the Durable Object.
   */
  static async invalidateCache(
    env: any,
    productId: string,
    locationId: string = 'loc-1'
  ): Promise<void> {
    if (env.INVENTORY_DO) {
      try {
        const id = env.INVENTORY_DO.idFromName('GLOBAL_INVENTORY');
        const stub = env.INVENTORY_DO.get(id);
        await stub.fetch('http://do/invalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, locationId })
        });
      } catch (err) {
        console.error('[InventoryRepository] DO invalidateCache error:', err);
      }
    }
  }
}
