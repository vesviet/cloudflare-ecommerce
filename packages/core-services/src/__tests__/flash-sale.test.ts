import { describe, it, expect, vi } from 'vitest';
import { FlashSaleService } from '../flash-sale.service';

/**
 * Mock db matching FlashSaleService call patterns:
 *  - getActiveFlashPricing: select().from(innerJoin).where().all()
 *  - lockQuota:             update().set().where().run() -> meta.changes
 *  - releaseQuotaForOrder:  select(items).all + update().run()
 */
function makeFlashDb(opts: {
  pricingRows?: any[];
  lockChanges?: number;
  orderFlashItems?: any[];
} = {}) {
  const db: any = {};

  db.select = vi.fn(() => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          all: async () => opts.pricingRows || [],
        }),
      }),
      where: () => ({
        all: async () => opts.orderFlashItems || [],
        get: async () => null,
      }),
    })
  }));

  db.update = vi.fn(() => ({
    set: () => ({
      where: () => ({
        run: async () => ({ meta: { changes: opts.lockChanges ?? 1 } })
      })
    })
  }));

  return db;
}

const NOW = Math.floor(Date.now() / 1000);

describe('FlashSaleService.getActiveFlashPricing', () => {
  it('FLASH-01: returns lowest price when sales overlap on the same product', async () => {
    const db = makeFlashDb({
      pricingRows: [
        { item_id: 'i1', product_id: 'p1', price: 90000, quota: 0, sold_quantity: 0, sale_starts_at: null, sale_ends_at: null },
        { item_id: 'i2', product_id: 'p1', price: 70000, quota: 10, sold_quantity: 3, sale_starts_at: null, sale_ends_at: NOW + 3600 },
      ]
    });
    const map = await FlashSaleService.getActiveFlashPricing(db, ['p1']);
    expect(map.get('p1')?.price).toBe(70000);
    expect(map.get('p1')?.left).toBe(7);
    expect(map.get('p1')?.endsAt).toBe(NOW + 3600);
  });

  it('FLASH-02: filters out sales outside their time window', async () => {
    const db = makeFlashDb({
      pricingRows: [
        { item_id: 'future', product_id: 'p1', price: 50000, quota: 5, sold_quantity: 0, sale_starts_at: NOW + 86400, sale_ends_at: null },
        { item_id: 'past', product_id: 'p1', price: 50000, quota: 5, sold_quantity: 0, sale_starts_at: null, sale_ends_at: NOW - 86400 },
        { item_id: 'live', product_id: 'p1', price: 80000, quota: 5, sold_quantity: 0, sale_starts_at: null, sale_ends_at: null },
      ]
    });
    const map = await FlashSaleService.getActiveFlashPricing(db, ['p1']);
    expect(map.size).toBe(1);
    expect(map.get('p1')?.itemId).toBe('live');
  });

  it('FLASH-03: unlimited quota reports left=Infinity; sold-out still surfaces for UI', async () => {
    const db = makeFlashDb({
      pricingRows: [
        { item_id: 'unl', product_id: 'p1', price: 80000, quota: 0, sold_quantity: 999, sale_starts_at: null, sale_ends_at: null },
        { item_id: 'out', product_id: 'p2', price: 40000, quota: 5, sold_quantity: 5, sale_starts_at: null, sale_ends_at: null },
      ]
    });
    const map = await FlashSaleService.getActiveFlashPricing(db, ['p1', 'p2']);
    expect(map.get('p1')?.left).toBe(Number.POSITIVE_INFINITY);
    expect(map.get('p2')?.left).toBe(0);
  });
});

describe('FlashSaleService.lockQuota', () => {
  it('FLASH-04: guarded increment succeeds while quota remains', async () => {
    const db = makeFlashDb({ lockChanges: 1 });
    await expect(FlashSaleService.lockQuota(db, [{ itemId: 'i1', quantity: 2 }])).resolves.toBeUndefined();
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('FLASH-05: exhausted quota (0 rows affected) throws before order creation', async () => {
    const db = makeFlashDb({ lockChanges: 0 });
    await expect(FlashSaleService.lockQuota(db, [{ itemId: 'i1', quantity: 3 }]))
      .rejects.toThrow(/quota exhausted/i);
  });

  it('FLASH-06: skips non-positive quantities without touching the DB', async () => {
    const db = makeFlashDb({});
    await FlashSaleService.lockQuota(db, [{ itemId: 'i1', quantity: 0 }]);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe('FlashSaleService.releaseQuotaForOrder', () => {
  it('FLASH-07: decrements sold_quantity only for flash-attributed items', async () => {
    const db = makeFlashDb({
      orderFlashItems: [{ flash_sale_item_id: 'i1', quantity: 2 }],
    });
    await FlashSaleService.releaseQuotaForOrder(db, 'order-1');
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('FLASH-08: no flash items -> no writes (idempotent)', async () => {
    const db = makeFlashDb({ orderFlashItems: [] });
    await FlashSaleService.releaseQuotaForOrder(db, 'order-1');
    expect(db.update).not.toHaveBeenCalled();
  });
});
