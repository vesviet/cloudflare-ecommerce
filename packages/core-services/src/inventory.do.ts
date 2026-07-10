import { DurableObject } from 'cloudflare:workers';
import { D1Database } from '@cloudflare/workers-types';

export class InventoryLockManagerDO extends DurableObject<{ DB: D1Database }> {
  private initPromise: Promise<void> | null = null;
  private activeRequests = 0;
  private queue = Promise.resolve();

  private runInTx(cb: () => void): void {
    const storage = this.ctx.storage as any;
    if (typeof storage.transactionSync === 'function') {
      storage.transactionSync(cb);
    } else {
      cb();
    }
  }

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    
    // Initialize the SQLite tables synchronously during constructor blockConcurrencyWhile
    this.ctx.blockConcurrencyWhile(async () => {
      const sql = this.ctx.storage.sql;
      sql.exec(`
        CREATE TABLE IF NOT EXISTS inventory_levels (
          location_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (location_id, product_id)
        );
      `);
      sql.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
    });
  }

  /**
   * Ensures the Durable Object SQLite database schema is initialized and seeded from D1.
   */
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      await this.runInitialization();
    })();
    return this.initPromise;
  }

  private async runInitialization(): Promise<void> {
    const sql = this.ctx.storage.sql;
    
    // Check if database was already seeded
    const seedCheck = [...sql.exec("SELECT value FROM meta WHERE key = 'seeded'")];
    const isSeeded = seedCheck.length > 0 && seedCheck[0].value === 'true';

    if (!isSeeded) {
      console.log('[InventoryLockManagerDO] Seeding stock from D1 database...');
      if (!this.env.DB) {
        throw new Error('D1 Database binding (DB) is missing in Durable Object environment.');
      }

      try {
        const d1Result = await this.env.DB.prepare(
          'SELECT location_id, product_id, stock_quantity FROM inventory_levels'
        ).all();

        if (d1Result.results && d1Result.results.length > 0) {
          this.runInTx(() => {
            for (const row of d1Result.results as any[]) {
              sql.exec(
                'INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity) VALUES (?, ?, ?)',
                row.location_id,
                row.product_id,
                row.stock_quantity
              );
            }
            sql.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', 'true')");
          });
          console.log(`[InventoryLockManagerDO] Successfully seeded ${d1Result.results.length} rows.`);
        } else {
          sql.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', 'true')");
          console.log('[InventoryLockManagerDO] D1 inventory levels is empty. Seeding finished.');
        }
      } catch (err) {
        console.error('[InventoryLockManagerDO] Failed to seed from D1:', err);
        this.initPromise = null; // Allow retry on next request
        throw err;
      }
    }
  }

  /**
   * Cache-miss fallback helper. Attempts to retrieve stock from local SQLite.
   * If not found, falls back to querying D1 database.
   */
  private async getStockRow(productId: string, locationId: string): Promise<{ stock_quantity: number } | null> {
    const sql = this.ctx.storage.sql;
    
    // Try querying local DO SQLite
    const localRows = [...sql.exec(
      'SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?',
      productId,
      locationId
    )];

    if (localRows.length > 0) {
      return { stock_quantity: localRows[0].stock_quantity as number };
    }

    // Cache miss fallback: Query D1 database dynamically
    console.log(`[InventoryLockManagerDO] Cache miss. Fetching product=${productId} location=${locationId} from D1...`);
    if (!this.env.DB) {
      return null;
    }

    try {
      const d1Row = await this.env.DB.prepare(
        'SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?'
      )
      .bind(productId, locationId)
      .first<{ stock_quantity: number }>();

      if (d1Row !== null && d1Row !== undefined) {
        // Insert into local DO SQLite cache
        sql.exec(
          'INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity) VALUES (?, ?, ?)',
          locationId,
          productId,
          d1Row.stock_quantity
        );
        return { stock_quantity: d1Row.stock_quantity };
      }
    } catch (err) {
      console.error('[InventoryLockManagerDO] D1 fallback query failed:', err);
    }

    return null;
  }

  /**
   * Deducts stock for multiple items atomically with location isolation.
   */
  async deductStock(items: { productId: string; quantity: number }[], locationId: string): Promise<boolean> {
    const sql = this.ctx.storage.sql;
    
    // Aggregate duplicate items
    const aggregatedItemsMap = new Map<string, number>();
    for (const item of items) {
      aggregatedItemsMap.set(item.productId, (aggregatedItemsMap.get(item.productId) || 0) + item.quantity);
    }
    const aggregatedItems = Array.from(aggregatedItemsMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    // 1. Optimistic check: Ensure stock is available for all items
    for (const item of aggregatedItems) {
      const row = await this.getStockRow(item.productId, locationId);
      if (!row || row.stock_quantity < item.quantity) {
        return false;
      }
    }

    // 2. Prepare write-through D1 statements and calculate new stock levels
    const newStocks: Record<string, number> = {};
    const d1Statements = [];

    for (const item of aggregatedItems) {
      const row = await this.getStockRow(item.productId, locationId);
      if (!row) return false;
      
      const newStock = row.stock_quantity - item.quantity;
      newStocks[item.productId] = newStock;

      d1Statements.push(
        this.env.DB.prepare(
          'UPDATE inventory_levels SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?'
        ).bind(newStock, item.productId, locationId)
      );
    }

    try {
      // 3. Write-through to D1 (strong consistency)
      if (d1Statements.length > 0 && this.env.DB) {
        await this.env.DB.batch(d1Statements);
      }

      // 4. Update local DO SQLite
      this.runInTx(() => {
        for (const item of aggregatedItems) {
          sql.exec(
            'UPDATE inventory_levels SET stock_quantity = ? WHERE product_id = ? AND location_id = ?',
            newStocks[item.productId],
            item.productId,
            locationId
          );
        }
      });
      return true;
    } catch (err) {
      console.error('[InventoryLockManagerDO] Sync to D1 failed during deduction:', err);
      return false;
    }
  }

  /**
   * Restocks items with location isolation.
   */
  async restock(items: { productId: string; quantity: number }[], locationId: string): Promise<void> {
    const sql = this.ctx.storage.sql;

    // Aggregate duplicate items
    const aggregatedItemsMap = new Map<string, number>();
    for (const item of items) {
      aggregatedItemsMap.set(item.productId, (aggregatedItemsMap.get(item.productId) || 0) + item.quantity);
    }
    const aggregatedItems = Array.from(aggregatedItemsMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    const newStocks: Record<string, number> = {};
    const d1Statements = [];

    for (const item of aggregatedItems) {
      const row = await this.getStockRow(item.productId, locationId);
      const currentStock = row ? row.stock_quantity : 0;
      const newStock = currentStock + item.quantity;
      newStocks[item.productId] = newStock;

      d1Statements.push(
        this.env.DB.prepare(
          'UPDATE inventory_levels SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?'
        ).bind(newStock, item.productId, locationId)
      );
    }

    try {
      // Write-through to D1
      if (d1Statements.length > 0 && this.env.DB) {
        await this.env.DB.batch(d1Statements);
      }

      // Update local DO SQLite
      this.runInTx(() => {
        for (const item of aggregatedItems) {
          sql.exec(
            'INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity) VALUES (?, ?, ?)',
            locationId,
            item.productId,
            newStocks[item.productId]
          );
        }
      });
    } catch (err) {
      console.error('[InventoryLockManagerDO] Sync to D1 failed during restock:', err);
      throw err;
    }
  }

  invalidate(productId?: string, locationId?: string): void {
    const sql = this.ctx.storage.sql;
    if (!productId) {
      sql.exec('DELETE FROM inventory_levels');
      sql.exec("DELETE FROM meta WHERE key = 'seeded'");
      this.initPromise = null;
    } else {
      sql.exec(
        'DELETE FROM inventory_levels WHERE product_id = ? AND location_id = ?',
        productId,
        locationId || 'loc-1'
      );
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Wrap requests inside a promise queue to serialize execution and prevent race conditions
    this.activeRequests++;
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await this.handleRequest(request);
          resolve(res);
        } catch (err) {
          reject(err);
        } finally {
          this.activeRequests--;
          if (this.activeRequests === 0) {
            this.queue = Promise.resolve();
          }
        }
      });
    });
  }

  private async handleRequest(request: Request): Promise<Response> {
    await this.ensureInitialized();

    const url = new URL(request.url);
    const body = await request.json() as any;
    const locationId = body.locationId || 'loc-1';

    if (url.pathname === '/deduct') {
      const success = await this.deductStock(body.items, locationId);
      return Response.json({ success });
    } else if (url.pathname === '/restock') {
      await this.restock(body.items, locationId);
      return Response.json({ success: true });
    } else if (url.pathname === '/invalidate') {
      const { productId, locationId: locId } = body;
      this.invalidate(productId, locId || locationId);
      return Response.json({ success: true });
    }

    return new Response('Not found', { status: 404 });
  }
}
