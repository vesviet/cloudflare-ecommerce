import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';
import { InventoryRepository } from '../inventory.repository';

// Mock cloudflare:workers for DurableObject base class
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

// Mock D1 Database interface
class MockD1 {
  public inventory: Map<string, number> = new Map(); // key: "locationId:productId", value: stock

  setStock(locationId: string, productId: string, stock: number) {
    this.inventory.set(`${locationId}:${productId}`, stock);
  }

  getStock(locationId: string, productId: string): number {
    return this.inventory.get(`${locationId}:${productId}`) ?? 0;
  }

  prepare(sqlString: string) {
    const self = this;
    let boundArgs: any[] = [];
    
    const stmt = {
      sql: sqlString,
      getBoundArgs() { return boundArgs; },
      bind(...args: any[]) {
        boundArgs = args;
        return this;
      },
      async all() {
        if (sqlString.includes('SELECT location_id, product_id, stock_quantity FROM inventory_levels')) {
          const results = Array.from(self.inventory.entries()).map(([key, stock]) => {
            const [location_id, product_id] = key.split(':');
            return { location_id, product_id, stock_quantity: stock };
          });
          return { results };
        }
        if (sqlString.includes('SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?')) {
          const [productId, locationId] = boundArgs;
          const stock = self.getStock(locationId, productId);
          return { results: [{ stock_quantity: stock }] };
        }
        return { results: [] };
      },
      async first() {
        if (sqlString.includes('SELECT stock_quantity FROM inventory_levels WHERE product_id = ? AND location_id = ?')) {
          const [productId, locationId] = boundArgs;
          const stock = self.getStock(locationId, productId);
          return { stock_quantity: stock };
        }
        return null;
      },
      async run() {
        return { meta: { changes: 1 } };
      }
    };
    return stmt;
  }

  async batch(statements: any[]) {
    for (const stmt of statements) {
      if (stmt.sql.includes('UPDATE inventory_levels SET stock_quantity = ?')) {
        const [newStock, productId, locationId] = stmt.getBoundArgs();
        this.setStock(locationId, productId, newStock);
      }
    }
    return [];
  }
}

// Mock DO's SQLite local database
class MockDoSql {
  public inventory: Map<string, number> = new Map(); // key: "locationId:productId", value: stock
  public meta: Map<string, string> = new Map();

  exec(query: string, ...args: any[]) {
    const q = query.trim();
    if (q.startsWith("SELECT value FROM meta WHERE key = 'seeded'")) {
      const val = this.meta.get('seeded');
      if (val !== undefined) {
        return [{ value: val }];
      }
      return [];
    }
    if (q.startsWith('INSERT OR REPLACE INTO meta')) {
      const key = args[0] || 'seeded';
      const val = args[1] || 'true';
      this.meta.set(key, val);
      return [];
    }
    if (q.startsWith('INSERT OR REPLACE INTO inventory_levels') || q.startsWith('UPDATE inventory_levels')) {
      if (q.startsWith('INSERT OR REPLACE INTO inventory_levels')) {
        const [locationId, productId, stock] = args;
        this.inventory.set(`${locationId}:${productId}`, stock);
      } else {
        const [stock, productId, locationId] = args;
        this.inventory.set(`${locationId}:${productId}`, stock);
      }
      return [];
    }
    if (q.startsWith('SELECT stock_quantity FROM inventory_levels')) {
      const [productId, locationId] = args;
      const stock = this.inventory.get(`${locationId}:${productId}`);
      if (stock !== undefined) {
        return [{ stock_quantity: stock }];
      }
      return [];
    }
    if (q.startsWith('DELETE FROM inventory_levels')) {
      const [productId, locationId] = args;
      this.inventory.delete(`${locationId}:${productId}`);
      return [];
    }
    return [];
  }
}

// Mock Drizzle DB client
class MockDrizzle {
  public orders: Map<string, any> = new Map();
  public orderItems: Map<string, any[]> = new Map(); // key: orderId, value: items

  select(...args: any[]) {
    const self = this;
    return {
      from(table: any) {
        return this;
      },
      where(cond: any) {
        return this;
      },
      get() {
        const order = self.orders.get(self.lastOrderId);
        return { 
          id: 'cust_1', 
          loyalty_points_balance: 100, 
          location_id: 'loc_1', 
          status: order ? order.status : 'pending_payment',
          applied_promotions_json: '[]' 
        };
      },
      all() {
        return self.getLastOrderItems() || [];
      }
    };
  }

  private lastOrderId: string = '';
  getLastOrderItems() {
    return this.orderItems.get(this.lastOrderId);
  }

  insert(table: any) {
    const self = this;
    return {
      values(data: any) {
        if (data.status) {
          self.orders.set(data.id, data);
          self.lastOrderId = data.id;
        } else if (data.order_id) {
          const list = self.orderItems.get(data.order_id) || [];
          list.push(data);
          self.orderItems.set(data.order_id, list);
        }
        return {
          async run() {
            return { meta: { changes: 1 } };
          }
        };
      }
    };
  }

  update(table: any) {
    const self = this;
    return {
      set(data: any) {
        if (data.status) {
          const order = self.orders.get(self.lastOrderId);
          if (order) {
            order.status = data.status;
            self.orders.set(self.lastOrderId, order);
          }
        }
        return this;
      },
      where(cond: any) {
        return this;
      },
      run() {
        return { meta: { changes: 1 } };
      }
    };
  }

  async batch(queries: any[]) {
    return [];
  }
}

describe('Durable Object and D1 Integration Sync', () => {
  let mockD1: MockD1;
  let mockDoSql: MockDoSql;
  let mockDrizzle: MockDrizzle;
  let doInstance: any;
  let mockEnv: any;

  beforeEach(async () => {
    mockD1 = new MockD1();
    mockDoSql = new MockDoSql();
    mockDrizzle = new MockDrizzle();

    // Seed initial stock in D1 database
    mockD1.setStock('loc_1', 'p_1', 50);

    const mockState: any = {
      storage: {
        sql: mockDoSql
      },
      blockConcurrencyWhile: vi.fn((callback) => callback()),
    };

    const { InventoryLockManagerDO } = await import('../inventory.do');
    mockEnv = { DB: mockD1 };
    doInstance = new InventoryLockManagerDO(mockState, mockEnv);

    // Mock DO binding so InventoryRepository calls this instance directly
    mockEnv.INVENTORY_DO = {
      idFromName: vi.fn().mockReturnValue('GLOBAL_INVENTORY_ID'),
      get: vi.fn().mockReturnValue({
        fetch: async (urlStr: string, options?: RequestInit) => {
          const url = new URL(urlStr);
          const body = options?.body ? JSON.parse(options.body as string) : {};
          
          // Construct Request object and call DO's fetch
          const request = new Request(urlStr, {
            method: options?.method,
            body: options?.body
          });
          
          return doInstance.fetch(request);
        }
      })
    };
  });

  it('TC-INT-01: Perform checkout and confirm D1 stock is decremented immediately', async () => {
    // 1. Initial State: D1 has 50 stock, DO has not cached it yet.
    expect(mockD1.getStock('loc_1', 'p_1')).toBe(50);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBeUndefined();

    // 2. Perform Checkout
    const orderData = {
      orderId: 'order-123',
      validItems: [{ variation_id: 'p_1', quantity: 3, price: 1000 }],
      totalAmount: 3000,
      shippingFeeCents: 0,
      discountAmount: 0,
      locationId: 'loc_1'
    };

    const checkoutResult = await OrderService.processCheckout(mockDrizzle, mockEnv, orderData);
    expect(checkoutResult.success).toBe(true);

    // 3. Confirm D1 stock is decremented immediately to 47
    expect(mockD1.getStock('loc_1', 'p_1')).toBe(47);

    // 4. Confirm DO local SQLite is updated to 47 as well
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(47);
  });

  it('TC-INT-02: Perform cancel/refund and confirm D1 stock is restocked immediately', async () => {
    // 1. Perform Checkout of 5 items
    const orderData = {
      orderId: 'order-456',
      customerId: 'cust_1',
      validItems: [{ variation_id: 'p_1', quantity: 5, price: 1000 }],
      totalAmount: 5000,
      shippingFeeCents: 0,
      discountAmount: 0,
      locationId: 'loc_1'
    };
    await OrderService.processCheckout(mockDrizzle, mockEnv, orderData);
    
    // D1 and DO stock should now be 45
    expect(mockD1.getStock('loc_1', 'p_1')).toBe(45);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(45);

    // Mock orderItems in Drizzle so order-456 items are resolved during cancellation
    mockDrizzle.orderItems.set('order-456', [{ product_id: 'p_1', quantity: 5 }]);

    // 2. Perform Cancellation and confirm stock is restocked immediately to 50
    const cancelSuccess = await OrderService.cancelOrderAndRestock(mockDrizzle, mockEnv, 'order-456');
    expect(cancelSuccess).toBe(true);

    expect(mockD1.getStock('loc_1', 'p_1')).toBe(50);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(50);

    // 3. Perform Checkout again of 10 items
    const orderData2 = {
      orderId: 'order-789',
      customerId: 'cust_1',
      validItems: [{ variation_id: 'p_1', quantity: 10, price: 1000 }],
      totalAmount: 10000,
      shippingFeeCents: 0,
      discountAmount: 0,
      locationId: 'loc_1'
    };
    await OrderService.processCheckout(mockDrizzle, mockEnv, orderData2);
    expect(mockD1.getStock('loc_1', 'p_1')).toBe(40);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(40);

    // Mock orderItems for order-789 refund
    mockDrizzle.orderItems.set('order-789', [{ product_id: 'p_1', quantity: 10 }]);

    // 4. Perform Refund and confirm stock is restocked immediately to 50
    const refundSuccess = await OrderService.refundOrderAndRestock(mockDrizzle, mockEnv, 'order-789', 'processing');
    expect(refundSuccess).toBe(true);

    expect(mockD1.getStock('loc_1', 'p_1')).toBe(50);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(50);
  });

  it('TC-INT-03: Perform admin-side update and verify cache invalidation propagates and DO is updated', async () => {
    // 1. Perform checkout to populate cache in DO
    const orderData = {
      orderId: 'order-abc',
      validItems: [{ variation_id: 'p_1', quantity: 10, price: 1000 }],
      totalAmount: 10000,
      shippingFeeCents: 0,
      discountAmount: 0,
      locationId: 'loc_1'
    };
    await OrderService.processCheckout(mockDrizzle, mockEnv, orderData);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(40);

    // 2. Perform admin-side direct update to D1 (bypassing DO, e.g., via migrations, batch syncs)
    mockD1.setStock('loc_1', 'p_1', 100);

    // 3. Verify DO cache is still stale (40)
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(40);

    // 4. Invalidate DO cache
    await InventoryRepository.invalidateCache(mockEnv, 'p_1', 'loc_1');

    // 5. Verify the cached row is removed from DO local storage
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBeUndefined();

    // 6. Perform a new checkout which causes a cache miss fallback to fetch 100 from D1
    const orderDataNew = {
      orderId: 'order-xyz',
      validItems: [{ variation_id: 'p_1', quantity: 20, price: 1000 }],
      totalAmount: 20000,
      shippingFeeCents: 0,
      discountAmount: 0,
      locationId: 'loc_1'
    };
    const checkoutResult = await OrderService.processCheckout(mockDrizzle, mockEnv, orderDataNew);
    expect(checkoutResult.success).toBe(true);

    // 7. Verify stock was correctly fetched as 100, decremented by 20, and written back to D1 and DO as 80
    expect(mockD1.getStock('loc_1', 'p_1')).toBe(80);
    expect(mockDoSql.inventory.get('loc_1:p_1')).toBe(80);
  });
});
