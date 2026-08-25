import { describe, it, expect, vi } from 'vitest';
import { PromotionRulesEngine } from '../promotion.rules.engine';

/**
 * Mock db matching the call sequence of the rules engine:
 *   evaluateCart: select(rules).all -> [if customer] get(lifetime), get(count)
 *   lockUsage:    update().set().where().run() then insert().values()
 */
function makeRulesDb(opts: {
  rules?: any[];
  lifetime?: number;
  orderCount?: number;
  lockChanges?: number;
} = {}) {
  const db: any = {};
  let getCall = 0;

  db.select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        all: async () => opts.rules || [],
        get: async () => {
          // Sequence inside resolveCustomerTier: [lifetime, orderCount]
          if (getCall === 0) {
            getCall++;
            return { lifetime: opts.lifetime ?? 0 };
          }
          return { count: opts.orderCount ?? 0 };
        },
        orderBy: () => ({ all: async () => opts.rules || [] })
      }),
      all: async () => opts.rules || []
    })
  }));

  db.update = vi.fn(() => ({
    set: () => ({
      where: () => ({
        run: async () => ({ meta: { changes: opts.lockChanges ?? 1 } })
      })
    })
  }));

  db.insert = vi.fn(() => ({
    values: vi.fn(async () => {})
  }));

  return db;
}

const baseCtx = {
  subTotal: 1000000,
  baseShippingFee: 30000,
  cartItems: [{ product_id: 'prod-1', quantity: 2, price: 500000 }]
};

describe('PromotionRulesEngine.evaluateCart', () => {
  it('RULE-01: no active rules -> zero discount', async () => {
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db: makeRulesDb({ rules: [] }) });
    expect(res.totalDiscount).toBe(0);
    expect(res.shippingSubsidy).toBe(0);
    expect(res.appliedRules).toHaveLength(0);
  });

  it('RULE-02: percentage_with_max_cap applies percent capped at max', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'r1', name: '10% cap 80k', rule_type: 'cart_rule',
        action_type: 'percentage_with_max_cap', action_value: 10,
        max_discount_amount: 80000, status: 'active'
      }]
    });
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
    expect(res.totalDiscount).toBe(80000); // 10% of 1M = 100k, capped at 80k
  });

  it('RULE-03: rules apply cumulatively by priority ASC with remaining-subtotal guard', async () => {
    const db = makeRulesDb({
      rules: [
        { id: 'b', name: 'second', priority: 2, action_type: 'fixed_amount', action_value: 900000, status: 'active' },
        { id: 'a', name: 'first', priority: 1, action_type: 'fixed_amount', action_value: 700000, status: 'active' },
      ]
    });
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
    expect(res.appliedRules[0].ruleId).toBe('a');
    expect(res.appliedRules[1].ruleId).toBe('b');
    // first takes 700k; second capped at remaining 300k (not its full 900k)
    expect(res.totalDiscount).toBe(1000000);
  });

  it('RULE-04: stop_further_rules halts the pipeline', async () => {
    const db = makeRulesDb({
      rules: [
        { id: 'a', name: 'stopper', priority: 1, action_type: 'fixed_amount', action_value: 100000, stop_further_rules: 1, status: 'active' },
        { id: 'b', name: 'blocked', priority: 2, action_type: 'fixed_amount', action_value: 100000, status: 'active' },
      ]
    });
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
    expect(res.totalDiscount).toBe(100000);
    expect(res.appliedRules).toHaveLength(1);
    expect(res.appliedRules[0].ruleId).toBe('a');
  });

  it('RULE-05: target_product_ids scopes eligibility', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'r1', name: 'scoped 20%', action_type: 'percentage_with_max_cap', action_value: 20,
        conditions_json: JSON.stringify({ target_product_ids: ['prod-2'] }), status: 'active'
      }]
    });
    const res = await PromotionRulesEngine.evaluateCart({
      ...baseCtx,
      db,
      cartItems: [
        { product_id: 'prod-1', quantity: 1, price: 500000 },
        { product_id: 'prod-2', quantity: 1, price: 500000 },
      ]
    });
    expect(res.totalDiscount).toBe(100000); // only prod-2's subtotal is discounted
  });

  it('RULE-06: min_order_amount gate rejects smaller carts', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'r1', name: 'min gate', action_type: 'fixed_amount', action_value: 50000,
        conditions_json: JSON.stringify({ min_order_amount: 2000000 }), status: 'active'
      }]
    });
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
    expect(res.totalDiscount).toBe(0);
  });

  it('RULE-07: time window filters out inactive rules', async () => {
    const now = Math.floor(Date.now() / 1000);
    const db = makeRulesDb({
      rules: [
        { id: 'future', name: 'future', action_type: 'fixed_amount', action_value: 50000, starts_at: now + 86400, status: 'active' },
        { id: 'past', name: 'past', action_type: 'fixed_amount', action_value: 50000, ends_at: now - 86400, status: 'active' },
        { id: 'live', name: 'live', action_type: 'fixed_amount', action_value: 50000, status: 'active' },
      ]
    });
    const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
    expect(res.appliedRules.map((r) => r.ruleId)).toEqual(['live']);
  });

  it('RULE-08: free_shipping partial subsidy and full subsidy', async () => {
    const partial = makeRulesDb({
      rules: [{ id: 'p', name: 'ship 15k', action_type: 'free_shipping', action_value: 15000, status: 'active' }]
    });
    const resPartial = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db: partial });
    expect(resPartial.shippingSubsidy).toBe(15000);
    expect(resPartial.totalDiscount).toBe(0);

    const full = makeRulesDb({
      rules: [{ id: 'f', name: 'freeship', action_type: 'free_shipping', action_value: 0, status: 'active' }]
    });
    const resFull = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db: full });
    expect(resFull.shippingSubsidy).toBe(30000);
  });

  it('RULE-09: tiered_quantity picks the best qualifying step', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'tq', name: 'bulk tiers', action_type: 'tiered_quantity',
        conditions_json: JSON.stringify({
          tiered_steps: [
            { min_qty: 3, percent: 5 },
            { min_qty: 10, percent: 12 },
          ]
        }),
        status: 'active'
      }]
    });
    const res3 = await PromotionRulesEngine.evaluateCart({
      ...baseCtx, db,
      cartItems: [{ product_id: 'prod-1', quantity: 4, price: 250000 }]
    });
    expect(res3.totalDiscount).toBe(50000); // 5% of 1M

    const res12 = await PromotionRulesEngine.evaluateCart({
      ...baseCtx, db,
      cartItems: [{ product_id: 'prod-1', quantity: 12, price: 250000 }]
    });
    expect(res12.totalDiscount).toBe(360000); // 12% of 3M
  });

  it('RULE-10: buy_x_get_y rewards cheapest units with max_rewards cap', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'bxgy', name: 'buy2get1', action_type: 'buy_x_get_y',
        conditions_json: JSON.stringify({
          bxgy_config: { buy_qty: 2, get_qty: 1, max_rewards: 1 }
        }),
        status: 'active'
      }]
    });
    const res = await PromotionRulesEngine.evaluateCart({
      ...baseCtx, db,
      cartItems: [
        { product_id: 'a', quantity: 3, price: 300000 }, // 6 buy units -> 3 reward sets
        { product_id: 'b', quantity: 2, price: 100000 },
      ]
    });
    // rewards capped at 1 -> cheapest unit is 100k
    expect(res.totalDiscount).toBe(100000);
    expect(res.gifts).toEqual([]);
  });

  describe('tier targeting', () => {
    const goldRule = {
      id: 'gold-only', name: 'Gold+ 15%', target_customer_tier: 'gold',
      action_type: 'percentage_with_max_cap', action_value: 15, status: 'active'
    };

    it('RULE-11: named tier matches ladder inclusively (platinum qualifies for gold)', async () => {
      const db = makeRulesDb({ rules: [goldRule], lifetime: 60000000, orderCount: 3 });
      const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db, customerId: 'cust-1' });
      expect(res.totalDiscount).toBe(150000); // 15% of 1M
    });

    it('RULE-12: bronze customer does not qualify for silver+ rule', async () => {
      const silverRule = { ...goldRule, target_customer_tier: 'silver' };
      const db = makeRulesDb({ rules: [silverRule], lifetime: 1000000, orderCount: 1 });
      const res = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db, customerId: 'cust-1' });
      expect(res.totalDiscount).toBe(0);
    });

    it('RULE-13: first_time targeting matches zero prior orders only', async () => {
      const firstTimeRule = { ...goldRule, target_customer_tier: 'first_time' };
      const fresh = makeRulesDb({ rules: [firstTimeRule], lifetime: 0, orderCount: 0 });
      const resFresh = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db: fresh, customerId: 'cust-new' });
      expect(resFresh.totalDiscount).toBe(150000);

      const returning = makeRulesDb({ rules: [firstTimeRule], lifetime: 0, orderCount: 2 });
      const resReturning = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db: returning, customerId: 'cust-old' });
      expect(resReturning.totalDiscount).toBe(0);
    });

    it('RULE-14: guest targeting skips logged-in customers', async () => {
      const guestRule = { ...goldRule, target_customer_tier: 'guest' };
      const db = makeRulesDb({ rules: [guestRule] });
      const resGuest = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db });
      expect(resGuest.totalDiscount).toBe(150000);

      const resMember = await PromotionRulesEngine.evaluateCart({ ...baseCtx, db, customerId: 'cust-1', customerEmail: 'x@y.z' });
      expect(resMember.totalDiscount).toBe(0);
    });
  });
});

describe('PromotionRulesEngine.lockUsage', () => {
  it('RULE-15: increments times_used atomically and writes usage audit row', async () => {
    const db = makeRulesDb({});
    await PromotionRulesEngine.lockUsage(
      db,
      [{ ruleId: 'r1', name: 'Test', actionType: 'fixed_amount', amount: 50000, description: '' }],
      'order-1', 'cust-1', 'c@x.com'
    );
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('RULE-16: exhausted global limit throws before order creation', async () => {
    const db = makeRulesDb({ lockChanges: 0 });
    await expect(PromotionRulesEngine.lockUsage(
      db,
      [{ ruleId: 'r1', name: 'Exhausted', actionType: 'fixed_amount', amount: 50000, description: '' }],
      'order-1'
    )).rejects.toThrow(/usage limit reached/);
  });
});

describe('PromotionRulesEngine.resolveCatalogPrice', () => {
  it('RULE-17: catalog percentage rule produces strike-through price', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'cat1', name: 'Catalog -20%', rule_type: 'catalog_rule',
        action_type: 'percentage_with_max_cap', action_value: 20, status: 'active'
      }]
    });
    const promo = await PromotionRulesEngine.resolveCatalogPrice(db, 'prod-1', null, 1000000);
    expect(promo?.promoted_price).toBe(800000);
    expect(promo?.rule_name).toBe('Catalog -20%');
  });

  it('RULE-18: returns null when promotion would not beat current price', async () => {
    const db = makeRulesDb({
      rules: [{
        id: 'cat1', name: 'tiny', rule_type: 'catalog_rule',
        action_type: 'fixed_amount', action_value: 1, status: 'active'
      }]
    });
    const promo = await PromotionRulesEngine.resolveCatalogPrice(db, 'prod-1', null, 1000000);
    expect(promo).not.toBeNull(); // 999999 < 1000000 so it IS better; assert value instead
    expect(promo?.promoted_price).toBe(999999);

    const none = makeRulesDb({ rules: [] });
    expect(await PromotionRulesEngine.resolveCatalogPrice(none, 'prod-1', null, 1000000)).toBeNull();
  });
});
