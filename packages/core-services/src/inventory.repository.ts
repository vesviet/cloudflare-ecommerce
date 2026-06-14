export class InventoryRepository {
  /**
   * Atomically deducts stock for multiple items using D1 raw prepared statements.
   * Emulates a manual Two-Phase Commit / Rollback since D1 batch cannot rollback on 0-rows-affected.
   */
  static async deductStock(envDb: any, items: { productId: string; quantity: number }[]): Promise<boolean> {
    if (items.length === 0) return true;

    const succeeded: { productId: string; quantity: number }[] = [];

    for (const item of items) {
      try {
        // D1 raw SQL: UPDATE inventory_levels SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ? RETURNING id
        const result = await envDb.prepare(
          'UPDATE inventory_levels SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ? RETURNING id'
        )
        .bind(item.quantity, item.productId, item.quantity)
        .all();

        // If no rows were returned, it means the product is out of stock (condition failed)
        if (!result.results || result.results.length === 0) {
          // Rollback previously succeeded items
          if (succeeded.length > 0) {
            await this.restock(envDb, succeeded);
          }
          return false;
        }

        succeeded.push(item);
      } catch (err) {
        // Database error, rollback what we have
        if (succeeded.length > 0) {
          await this.restock(envDb, succeeded);
        }
        throw err;
      }
    }

    return true;
  }

  /**
   * Restores stock quantities atomically.
   */
  static async restock(envDb: any, items: { productId: string; quantity: number }[]): Promise<void> {
    if (items.length === 0) return;

    const stmts = items.map(item => {
      return envDb.prepare(
        'UPDATE inventory_levels SET stock_quantity = stock_quantity + ? WHERE product_id = ?'
      ).bind(item.quantity, item.productId);
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
}
