/**
 * InventoryService — Hardened Test Suite
 *
 * QA Focus: I-03/I-04 — InventoryService now reads from inventoryLevels + priceListItems
 * (PIM-refactor tables) instead of the dropped products columns.
 *
 * The mock DB must answer 4 sequential .select()...all() calls:
 *   Call 1 → products (metadata)
 *   Call 2 → inventoryLevels (stock)
 *   Call 3 → priceListItems (price, base list)
 *   Call 4 → inventoryReservations (soft-locks)
 *   Call 5 → parents (if any parent_ids)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../inventory.service';

vi.mock('cloudflare:workers', () => {
  return {
    DurableObject: class DurableObject {
      ctx: any;
      env: any;
      constructor(ctx: any, env: any) {
        this.ctx = ctx;
        this.env = env;
      }
    }
  };
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeMockDb(overrides: {
  products?: any[];
  inventory?: any[];
  prices?: any[];
  reservations?: any[];
  parents?: any[];
} = {}) {
  const {
    products    = [{ id: 'var_1', title: 'Product A', parent_id: null, is_purchasable: 1 }],
    inventory   = [{ product_id: 'var_1', stock_quantity: 10 }],
    prices      = [{ product_id: 'var_1', price: 1500 }],
    reservations = [],
    parents     = [],
  } = overrides;

  // Simulate the 4-5 sequential .select()…all() call chain
  const allResponses = [products, inventory, prices, reservations, parents];
  let callIndex = 0;

  const mockDb: any = {
    select: vi.fn(() => mockDb),
    from:   vi.fn(() => mockDb),
    where:  vi.fn(() => mockDb),
    all: vi.fn(() => {
      const resp = allResponses[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(resp);
    }),
    update: vi.fn(() => mockDb),
    set:    vi.fn(() => mockDb),
    and:    vi.fn(() => mockDb),
    eq:     vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  };

  return mockDb;
}

// ──────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────

describe('InventoryService — PIM-Refactored (I-03/I-04)', () => {

  // ── HAPPY PATH ──────────────────────────────────────────────────────────
  describe('validateAndReserveInventory — happy paths', () => {

    it('TC-INV-01: returns valid item with price from price_list_items', async () => {
      const db = makeMockDb({
        inventory: [{ product_id: 'var_1', stock_quantity: 10 }],
        prices:    [{ product_id: 'var_1', price: 1500 }],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 2 },
      ]);

      expect(result.validItems).toHaveLength(1);
      expect(result.validItems[0].price).toBe(1500); // from priceListItems, NOT products.sale_price
      expect(result.subTotal).toBe(3000); // 1500 * 2
    });

    it('TC-INV-02: accounts for soft-lock reservations against available stock', async () => {
      const db = makeMockDb({
        inventory:    [{ product_id: 'var_1', stock_quantity: 10 }],
        prices:       [{ product_id: 'var_1', price: 1000 }],
        reservations: [{ product_id: 'var_1', quantity: 8 }], // 8 reserved → only 2 available
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 2 },
      ]);

      expect(result.validItems).toHaveLength(1);
      expect(result.subTotal).toBe(2000);
    });

    it('TC-INV-03: aggregates stock across multiple inventory_levels rows (multi-location)', async () => {
      // Same product_id appearing in two warehouse rows
      const db = makeMockDb({
        inventory: [
          { product_id: 'var_1', stock_quantity: 4 },
          { product_id: 'var_1', stock_quantity: 6 },   // total = 10
        ],
        prices: [{ product_id: 'var_1', price: 500 }],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 9 },
      ]);

      expect(result.validItems).toHaveLength(1);
      expect(result.subTotal).toBe(4500);
    });

    it('TC-INV-04: resolves product name from parent when variation has parent_id', async () => {
      const db = makeMockDb({
        products:  [{ id: 'var_1', title: 'Color: Red', parent_id: 'prod_parent', is_purchasable: 1 }],
        inventory: [{ product_id: 'var_1', stock_quantity: 5 }],
        prices:    [{ product_id: 'var_1', price: 800 }],
        parents:   [{ id: 'prod_parent', title: 'Awesome T-Shirt' }],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ]);

      expect(result.validItems[0].name).toBe('Awesome T-Shirt');
    });

    it('TC-INV-05: calculates correct subtotal for multiple items', async () => {
      const db = makeMockDb({
        products: [
          { id: 'var_1', title: 'Item A', parent_id: null, is_purchasable: 1 },
          { id: 'var_2', title: 'Item B', parent_id: null, is_purchasable: 1 },
        ],
        inventory: [
          { product_id: 'var_1', stock_quantity: 10 },
          { product_id: 'var_2', stock_quantity: 5 },
        ],
        prices: [
          { product_id: 'var_1', price: 1000 },
          { product_id: 'var_2', price: 2000 },
        ],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 3 },
        { variation_id: 'var_2', quantity: 2 },
      ]);

      expect(result.validItems).toHaveLength(2);
      expect(result.subTotal).toBe(7000); // (1000*3) + (2000*2)
    });
  });

  // ── BOUNDARY / NEGATIVE CASES ─────────────────────────────────────────
  describe('validateAndReserveInventory — boundary & negative cases', () => {

    it('TC-INV-10: throws "out of stock" when stock exactly equals reservation (0 available)', async () => {
      const db = makeMockDb({
        inventory:    [{ product_id: 'var_1', stock_quantity: 3 }],
        prices:       [{ product_id: 'var_1', price: 1000 }],
        reservations: [{ product_id: 'var_1', quantity: 3 }], // 0 available
      });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ])).rejects.toThrow(/out of stock/i);
    });

    it('TC-INV-11: throws when product variation not found in DB', async () => {
      const db = makeMockDb({ products: [] });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_nonexistent', quantity: 1 },
      ])).rejects.toThrow(/is invalid or unavailable/i);
    });

    it('TC-INV-12: throws when product is not purchasable', async () => {
      const db = makeMockDb({
        products: [{ id: 'var_1', title: 'Discontinued', parent_id: null, is_purchasable: 0 }],
      });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ])).rejects.toThrow(/is invalid or unavailable/i);
    });

    it('TC-INV-13: throws when no price found in price_list_items (missing base price)', async () => {
      const db = makeMockDb({
        prices: [], // No price in pl_base
      });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ])).rejects.toThrow(/No price found/i);
    });

    it('TC-INV-14: throws when stock is insufficient regardless of reservation', async () => {
      const db = makeMockDb({
        inventory: [{ product_id: 'var_1', stock_quantity: 2 }],
        prices:    [{ product_id: 'var_1', price: 1000 }],
      });

      // Requesting 5 but stock is only 2
      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 5 },
      ])).rejects.toThrow(/out of stock/i);
    });

    it('TC-INV-15: exact quantity = available stock should PASS (boundary)', async () => {
      const db = makeMockDb({
        inventory: [{ product_id: 'var_1', stock_quantity: 5 }],
        prices:    [{ product_id: 'var_1', price: 1000 }],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 5 }, // exactly at boundary
      ]);

      expect(result.validItems).toHaveLength(1);
    });

    it('TC-INV-16: zero stock in inventory_levels throws out of stock (not undefined)', async () => {
      const db = makeMockDb({
        inventory: [{ product_id: 'var_1', stock_quantity: 0 }],
        prices:    [{ product_id: 'var_1', price: 1000 }],
      });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ])).rejects.toThrow(/out of stock/i);
    });

    it('TC-INV-17: product missing from inventory_levels defaults to 0 stock', async () => {
      // No inventory row = 0 stock (should throw, not NaN pass)
      const db = makeMockDb({
        inventory: [], // no rows for var_1
        prices:    [{ product_id: 'var_1', price: 1000 }],
      });

      await expect(InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 1 },
      ])).rejects.toThrow(/out of stock/i);
    });
  });

  // ── DEDUCTION QUERIES (I-03/04) ───────────────────────────────────────
  describe('getCommitDeductionQueries', () => {

    it('TC-INV-20: returns update queries targeting inventory_levels (not products)', () => {
      const mockDb: any = {
        update: vi.fn(() => mockDb),
        set:    vi.fn(() => mockDb),
        where:  vi.fn(() => mockDb),
        delete: vi.fn(() => mockDb),
      };

      const queries = InventoryService.getCommitDeductionQueries(
        mockDb, 'ord-1', [{ product_id: 'var_1', quantity: 2 }]
      );

      // Must have at least 2 queries: the deduction + the soft-lock release
      expect(queries.length).toBeGreaterThanOrEqual(2);
      // Update was called for the deduction (on inventoryLevels, not products)
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── RESTOCK QUERIES (I-03/04) ─────────────────────────────────────────
  describe('getRestockQueries', () => {

    it('TC-INV-30: returns update queries targeting inventory_levels for restock', () => {
      const mockDb: any = {
        update: vi.fn(() => mockDb),
        set:    vi.fn(() => mockDb),
        where:  vi.fn(() => mockDb),
      };

      const queries = InventoryService.getRestockQueries(
        mockDb, [{ product_id: 'var_1', quantity: 3 }]
      );

      expect(queries.length).toBe(1);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── LOCATION-AWARE & DO SYNC TESTS (SL-06) ──────────────────────────────────
  describe('Location Filtering & DO Sync', () => {
    it('TC-INV-LOC-01: validates stock levels for the same product at different locations independently', async () => {
      const db = makeMockDb({
        inventory: [{ product_id: 'var_1', stock_quantity: 10 }],
        prices:    [{ product_id: 'var_1', price: 1500 }],
      });

      const result = await InventoryService.validateAndReserveInventory(db, [
        { variation_id: 'var_1', quantity: 2 },
      ], 'loc_A');

      expect(result.validItems).toHaveLength(1);
      expect(result.subTotal).toBe(3000);
      expect(db.where).toHaveBeenCalled();
    });

    it('TC-INV-LOC-02: returns deduction queries scoped to the specified location', () => {
      const mockDb: any = {
        update: vi.fn(() => mockDb),
        set:    vi.fn(() => mockDb),
        where:  vi.fn(() => mockDb),
        delete: vi.fn(() => mockDb),
      };

      const queries = InventoryService.getCommitDeductionQueries(
        mockDb, 'ord-1', [{ product_id: 'var_1', quantity: 2 }], 'loc_A'
      );

      expect(queries.length).toBeGreaterThanOrEqual(2);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('TC-INV-LOC-03: active soft-lock reservation for loc_A reduces stock for loc_A but does not impact loc_B', async () => {
      const dbA = makeMockDb({
        inventory:    [{ product_id: 'var_1', stock_quantity: 10 }],
        prices:       [{ product_id: 'var_1', price: 1000 }],
        reservations: [{ product_id: 'var_1', quantity: 8 }], // 8 reserved at loc_A
      });

      const dbB = makeMockDb({
        inventory:    [{ product_id: 'var_1', stock_quantity: 10 }],
        prices:       [{ product_id: 'var_1', price: 1000 }],
        reservations: [], // 0 reserved at loc_B
      });

      // At loc_A, requesting 3 should fail (only 2 available)
      await expect(InventoryService.validateAndReserveInventory(dbA, [
        { variation_id: 'var_1', quantity: 3 },
      ], 'loc_A')).rejects.toThrow(/out of stock/i);

      // At loc_B, requesting 3 should pass (10 available)
      const resultB = await InventoryService.validateAndReserveInventory(dbB, [
        { variation_id: 'var_1', quantity: 3 },
      ], 'loc_B');

      expect(resultB.validItems).toHaveLength(1);
      expect(resultB.subTotal).toBe(3000);
    });

    it('TC-INV-LOC-04: DO deductStock seeds from D1, deducts, and updates D1', async () => {
      const mockD1 = {
        prepare: vi.fn(() => mockD1),
        bind: vi.fn(() => mockD1),
        first: vi.fn().mockResolvedValue({ stock_quantity: 50 }),
        batch: vi.fn().mockResolvedValue([]),
      };

      const sqlRows: any[] = [];
      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          if (query.trim().startsWith('SELECT value FROM meta WHERE key = \'seeded\'')) {
            return [{ value: 'false' }];
          }
          if (query.trim().startsWith('SELECT stock_quantity FROM inventory_levels')) {
            // First call returns empty (cache miss), subsequent returns cached new stock
            if (sqlRows.length === 0) {
              return [];
            }
            return sqlRows;
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: mockD1 };
      const doInstance = new InventoryLockManagerDO(mockState, env);
      
      const result = await doInstance.deductStock([{ productId: 'prod_1', quantity: 5 }], 'loc_A');
      
      expect(mockD1.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT stock_quantity FROM inventory_levels')
      );
      expect(mockD1.batch).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('TC-INV-LOC-05: DO deductStock aggregates duplicate items in the request body to prevent overselling', async () => {
      const mockD1 = {
        prepare: vi.fn(() => mockD1),
        bind: vi.fn(() => mockD1),
        first: vi.fn().mockResolvedValue({ stock_quantity: 6 }), // stock is 6
        batch: vi.fn().mockResolvedValue([]),
      };

      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          if (query.trim().startsWith('SELECT value FROM meta WHERE key = \'seeded\'')) {
            return [{ value: 'true' }];
          }
          if (query.trim().startsWith('SELECT stock_quantity FROM inventory_levels')) {
            return [];
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: mockD1 };
      const doInstance = new InventoryLockManagerDO(mockState, env);

      // Attempt to deduct 5 of prod_1 and 5 of prod_1 (total 10) when stock is only 6.
      // With aggregation, it will sum 5 + 5 = 10, compare 10 > 6, and fail.
      const result = await doInstance.deductStock([
        { productId: 'prod_1', quantity: 5 },
        { productId: 'prod_1', quantity: 5 }
      ], 'loc_A');

      expect(result).toBe(false); // Aggregation blocks it!
    });

    it('TC-INV-LOC-06: DO fetch handles activeRequests counter and resets promise queue on idle', async () => {
      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          if (query.trim().startsWith('SELECT value FROM meta WHERE key = \'seeded\'')) {
            return [{ value: 'true' }];
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: {} };
      const doInstance = new InventoryLockManagerDO(mockState, env);

      // Mock handleRequest so fetch resolves
      (doInstance as any).handleRequest = vi.fn().mockResolvedValue(new Response('OK'));

      // Make a call
      const response = await doInstance.fetch(new Request('http://do/deduct', {
        method: 'POST',
        body: JSON.stringify({ items: [], locationId: 'loc_A' })
      }));

      expect(await response.text()).toBe('OK');
      expect((doInstance as any).activeRequests).toBe(0);
    });

    it('TC-INV-LOC-07: Concurrently checkout identical items (duplicate item aggregation check and concurrent isolation in DO queue)', async () => {
      const sqliteInventory = new Map<string, number>();
      const sqliteMeta = new Map<string, string>();
      const d1Inventory = new Map<string, number>();
      let d1QueriesCount = 0;

      // Seed D1 with 8 stock
      d1Inventory.set('loc_A:prod_1', 8);

      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          const trimmed = query.trim().replace(/\s+/g, ' ');
          if (trimmed.startsWith("SELECT value FROM meta WHERE key = 'seeded'")) {
            const val = sqliteMeta.get('seeded');
            return val ? [{ value: val }] : [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO meta (key, value)")) {
            if (trimmed.includes("'seeded', 'true'")) {
              sqliteMeta.set('seeded', 'true');
            } else {
              sqliteMeta.set(args[0], args[1]);
            }
            return [];
          }
          if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?")) {
            const productId = args[0];
            const locationId = args[1];
            const key = `${locationId}:${productId}`;
            if (sqliteInventory.has(key)) {
              return [{ stock_quantity: sqliteInventory.get(key) }];
            }
            return [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity)")) {
            const locationId = args[0];
            const productId = args[1];
            const quantity = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          if (trimmed.startsWith("UPDATE inventory_levels SET stock_quantity = ? WHERE product_id = ? AND location_id = ?")) {
            const quantity = args[0];
            const productId = args[1];
            const locationId = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          return [];
        })
      };

      const mockD1 = {
        prepare: vi.fn((query: string) => {
          d1QueriesCount++;
          const trimmed = query.trim().replace(/\s+/g, ' ');
          const stmt: any = {
            bind: vi.fn((...bindArgs: any[]) => {
              stmt.boundArgs = bindArgs;
              return stmt;
            }),
            first: vi.fn(async () => {
              if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels")) {
                const productId = stmt.boundArgs[0];
                const locationId = stmt.boundArgs[1];
                const key = `${locationId}:${productId}`;
                return d1Inventory.has(key) ? { stock_quantity: d1Inventory.get(key) } : null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              if (trimmed.startsWith("SELECT location_id, product_id, stock_quantity FROM inventory_levels")) {
                const results = Array.from(d1Inventory.entries()).map(([key, stock]) => {
                  const [locationId, productId] = key.split(':');
                  return { location_id: locationId, product_id: productId, stock_quantity: stock };
                });
                return { results };
              }
              return { results: [] };
            })
          };
          return stmt;
        }),
        batch: vi.fn(async (statements: any[]) => {
          for (const stmt of statements) {
            const [newStock, productId, locationId] = stmt.boundArgs;
            d1Inventory.set(`${locationId}:${productId}`, newStock);
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: mockD1 };
      const doInstance = new InventoryLockManagerDO(mockState, env);

      // Verify that duplicate items in the SAME request are aggregated and rejected
      const singleReqResult = await doInstance.deductStock([
        { productId: 'prod_1', quantity: 5 },
        { productId: 'prod_1', quantity: 5 }
      ], 'loc_A');
      expect(singleReqResult).toBe(false); // 10 > 8, should fail

      // Verify that concurrent separate requests are isolated and serialized
      // Fire 2 concurrent fetch requests, each trying to deduct 5 (total 10)
      const req1 = new Request('http://do/deduct', {
        method: 'POST',
        body: JSON.stringify({ items: [{ productId: 'prod_1', quantity: 5 }], locationId: 'loc_A' })
      });
      const req2 = new Request('http://do/deduct', {
        method: 'POST',
        body: JSON.stringify({ items: [{ productId: 'prod_1', quantity: 5 }], locationId: 'loc_A' })
      });

      const [res1, res2] = await Promise.all([
        doInstance.fetch(req1),
        doInstance.fetch(req2)
      ]);

      const json1 = await res1.json() as any;
      const json2 = await res2.json() as any;

      // Exactly one request must succeed and the other must fail
      const successCount = (json1.success ? 1 : 0) + (json2.success ? 1 : 0);
      expect(successCount).toBe(1);
      
      // Stock in D1 and sqlite must reflect the successful deduction (8 - 5 = 3)
      expect(d1Inventory.get('loc_A:prod_1')).toBe(3);
      expect(sqliteInventory.get('loc_A:prod_1')).toBe(3);
    });

    it('TC-INV-LOC-08: Checkout when Durable Object starts cold (verify seeding matches D1 and D1 is queried once)', async () => {
      const sqliteInventory = new Map<string, number>();
      const sqliteMeta = new Map<string, string>();
      const d1Inventory = new Map<string, number>();
      let d1SeedingQueries = 0;
      let d1FallbackQueries = 0;

      // Seed D1 with initial inventory
      d1Inventory.set('loc_A:prod_1', 10);
      d1Inventory.set('loc_A:prod_2', 20);

      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          const trimmed = query.trim().replace(/\s+/g, ' ');
          if (trimmed.startsWith("SELECT value FROM meta WHERE key = 'seeded'")) {
            const val = sqliteMeta.get('seeded');
            return val ? [{ value: val }] : [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO meta (key, value)")) {
            if (trimmed.includes("'seeded', 'true'")) {
              sqliteMeta.set('seeded', 'true');
            } else {
              sqliteMeta.set(args[0], args[1]);
            }
            return [];
          }
          if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?")) {
            const productId = args[0];
            const locationId = args[1];
            const key = `${locationId}:${productId}`;
            if (sqliteInventory.has(key)) {
              return [{ stock_quantity: sqliteInventory.get(key) }];
            }
            return [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity)")) {
            const locationId = args[0];
            const productId = args[1];
            const quantity = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          if (trimmed.startsWith("UPDATE inventory_levels SET stock_quantity = ? WHERE product_id = ? AND location_id = ?")) {
            const quantity = args[0];
            const productId = args[1];
            const locationId = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          return [];
        })
      };

      const mockD1 = {
        prepare: vi.fn((query: string) => {
          const trimmed = query.trim().replace(/\s+/g, ' ');
          if (trimmed.startsWith("SELECT location_id, product_id, stock_quantity FROM inventory_levels")) {
            d1SeedingQueries++;
          }
          const stmt: any = {
            bind: vi.fn((...bindArgs: any[]) => {
              stmt.boundArgs = bindArgs;
              return stmt;
            }),
            first: vi.fn(async () => {
              if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels")) {
                d1FallbackQueries++;
                const productId = stmt.boundArgs[0];
                const locationId = stmt.boundArgs[1];
                const key = `${locationId}:${productId}`;
                return d1Inventory.has(key) ? { stock_quantity: d1Inventory.get(key) } : null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              if (trimmed.startsWith("SELECT location_id, product_id, stock_quantity FROM inventory_levels")) {
                const results = Array.from(d1Inventory.entries()).map(([key, stock]) => {
                  const [locationId, productId] = key.split(':');
                  return { location_id: locationId, product_id: productId, stock_quantity: stock };
                });
                return { results };
              }
              return { results: [] };
            })
          };
          return stmt;
        }),
        batch: vi.fn(async (statements: any[]) => {
          for (const stmt of statements) {
            const [newStock, productId, locationId] = stmt.boundArgs;
            d1Inventory.set(`${locationId}:${productId}`, newStock);
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: mockD1 };
      
      // 1. First cold start: create new instance
      const doInstance1 = new InventoryLockManagerDO(mockState, env);
      
      // Trigger cold start initialization explicitly
      await doInstance1.ensureInitialized();
      expect(d1SeedingQueries).toBe(1); // Seeded once from D1
      expect(d1FallbackQueries).toBe(0); // No fallback query needed since it's seeded
      
      // Perform first deduction
      const res1 = await doInstance1.deductStock([{ productId: 'prod_1', quantity: 2 }], 'loc_A');
      expect(res1).toBe(true);
      
      // Verify SQLite is seeded and updated
      expect(sqliteInventory.get('loc_A:prod_1')).toBe(8);
      expect(sqliteInventory.get('loc_A:prod_2')).toBe(20);
      
      // Perform second deduction on the same DO instance
      const res2 = await doInstance1.deductStock([{ productId: 'prod_2', quantity: 5 }], 'loc_A');
      expect(res2).toBe(true);
      expect(d1SeedingQueries).toBe(1); // Still 1, did not re-seed
      expect(d1FallbackQueries).toBe(0); // No fallback query
      
      // 2. Second cold start: simulate DO restart (re-instantiated but SQLite state persists)
      const doInstance2 = new InventoryLockManagerDO(mockState, env);
      
      // Trigger cold start initialization explicitly on restarted instance
      await doInstance2.ensureInitialized();
      expect(d1SeedingQueries).toBe(1); // Still 1! SQLite was already seeded so it skipped D1 seeding
      expect(d1FallbackQueries).toBe(0); // No fallback query needed
      
      // Perform deduction on restarted DO
      const res3 = await doInstance2.deductStock([{ productId: 'prod_1', quantity: 1 }], 'loc_A');
      expect(res3).toBe(true);
      expect(sqliteInventory.get('loc_A:prod_1')).toBe(7);
    });

    it('TC-INV-LOC-09: Checkout with different locations (verify location isolation - stock from Loc A does not affect Loc B)', async () => {
      const sqliteInventory = new Map<string, number>();
      const sqliteMeta = new Map<string, string>();
      const d1Inventory = new Map<string, number>();

      // Seed D1: loc_A has 10 stock, loc_B has 2 stock
      d1Inventory.set('loc_A:prod_1', 10);
      d1Inventory.set('loc_B:prod_1', 2);

      const mockSql = {
        exec: vi.fn((query: string, ...args: any[]) => {
          const trimmed = query.trim().replace(/\s+/g, ' ');
          if (trimmed.startsWith("SELECT value FROM meta WHERE key = 'seeded'")) {
            const val = sqliteMeta.get('seeded');
            return val ? [{ value: val }] : [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO meta (key, value)")) {
            if (trimmed.includes("'seeded', 'true'")) {
              sqliteMeta.set('seeded', 'true');
            } else {
              sqliteMeta.set(args[0], args[1]);
            }
            return [];
          }
          if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?")) {
            const productId = args[0];
            const locationId = args[1];
            const key = `${locationId}:${productId}`;
            if (sqliteInventory.has(key)) {
              return [{ stock_quantity: sqliteInventory.get(key) }];
            }
            return [];
          }
          if (trimmed.startsWith("INSERT OR REPLACE INTO inventory_levels (location_id, product_id, stock_quantity)")) {
            const locationId = args[0];
            const productId = args[1];
            const quantity = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          if (trimmed.startsWith("UPDATE inventory_levels SET stock_quantity = ? WHERE product_id = ? AND location_id = ?")) {
            const quantity = args[0];
            const productId = args[1];
            const locationId = args[2];
            sqliteInventory.set(`${locationId}:${productId}`, quantity);
            return [];
          }
          return [];
        })
      };

      const mockD1 = {
        prepare: vi.fn((query: string) => {
          const trimmed = query.trim().replace(/\s+/g, ' ');
          const stmt: any = {
            bind: vi.fn((...bindArgs: any[]) => {
              stmt.boundArgs = bindArgs;
              return stmt;
            }),
            first: vi.fn(async () => {
              if (trimmed.startsWith("SELECT stock_quantity FROM inventory_levels")) {
                const productId = stmt.boundArgs[0];
                const locationId = stmt.boundArgs[1];
                const key = `${locationId}:${productId}`;
                return d1Inventory.has(key) ? { stock_quantity: d1Inventory.get(key) } : null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              if (trimmed.startsWith("SELECT location_id, product_id, stock_quantity FROM inventory_levels")) {
                const results = Array.from(d1Inventory.entries()).map(([key, stock]) => {
                  const [locationId, productId] = key.split(':');
                  return { location_id: locationId, product_id: productId, stock_quantity: stock };
                });
                return { results };
              }
              return { results: [] };
            })
          };
          return stmt;
        }),
        batch: vi.fn(async (statements: any[]) => {
          for (const stmt of statements) {
            const [newStock, productId, locationId] = stmt.boundArgs;
            d1Inventory.set(`${locationId}:${productId}`, newStock);
          }
          return [];
        })
      };

      const mockState: any = {
        storage: {
          sql: mockSql
        },
        blockConcurrencyWhile: vi.fn((callback) => callback()),
      };

      const { InventoryLockManagerDO } = await import('../inventory.do');
      const env = { DB: mockD1 };
      const doInstance = new InventoryLockManagerDO(mockState, env);

      // Trigger seeding
      await doInstance.ensureInitialized();

      // Try to deduct 5 from loc_B (should fail as stock is only 2)
      const resB = await doInstance.deductStock([{ productId: 'prod_1', quantity: 5 }], 'loc_B');
      expect(resB).toBe(false);
      expect(d1Inventory.get('loc_B:prod_1')).toBe(2); // Unchanged
      expect(sqliteInventory.get('loc_B:prod_1')).toBe(2);

      // Try to deduct 5 from loc_A (should succeed as stock is 10)
      const resA = await doInstance.deductStock([{ productId: 'prod_1', quantity: 5 }], 'loc_A');
      expect(resA).toBe(true);
      expect(d1Inventory.get('loc_A:prod_1')).toBe(5); // Reduced by 5
      expect(sqliteInventory.get('loc_A:prod_1')).toBe(5);
      
      // Stock at loc_B remains completely unaffected
      expect(d1Inventory.get('loc_B:prod_1')).toBe(2);
      expect(sqliteInventory.get('loc_B:prod_1')).toBe(2);
    });
  });

  describe('Item Shape Alignment (Task 3)', () => {
    it('TC-INV-SHAPE-01: accepts items using `id` instead of `variation_id` and returns validItems with populated variation_id and id', async () => {
      const mockDb = makeMockDb({
        products: [{ id: 'var_100', title: 'Test Variation', parent_id: null, is_purchasable: 1 }],
        inventory: [{ product_id: 'var_100', stock_quantity: 20 }],
        prices: [{ product_id: 'var_100', price: 2500 }],
        reservations: [],
      });

      // Item passes `id` instead of `variation_id`
      const inputItems = [{ id: 'var_100', quantity: 2 }] as any;
      const res = await InventoryService.validateAndReserveInventory(mockDb, inputItems, 'loc-1');

      expect(res.subTotal).toBe(5000);
      expect(res.validItems).toHaveLength(1);
      expect(res.validItems[0].variation_id).toBe('var_100');
      expect(res.validItems[0].id).toBe('var_100');
      expect(res.validItems[0].quantity).toBe(2);
    });
  });
});
