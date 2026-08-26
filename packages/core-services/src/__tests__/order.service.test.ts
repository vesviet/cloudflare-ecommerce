/**
 * OrderService.processCheckout — Hardened Test Suite
 *
 * QA Focus:
 *   I-05: Phase 0 atomic coupon guard — tests max_uses enforcement and double-increment prevention
 *   I-02: Queue safety — processCheckout throws on OOS so caller can route to CANCEL_AND_RESTOCK queue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';
import { OrderRepository } from '../order.repository';
import { InventoryRepository } from '../inventory.repository';

vi.mock('../order.repository', () => ({
  OrderRepository: {
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    getOrderItems: vi.fn(),
  }
}));

vi.mock('../inventory.repository', () => ({
  InventoryRepository: {
    deductStock: vi.fn(),
    restock: vi.fn(),
  }
}));

// ──────────────────────────────────────────────
// Coupon mock helpers
// ──────────────────────────────────────────────

function makeCouponDb(changesResult: number) {
  // Simulate a Drizzle DB where the coupon UPDATE returns `changes`
  const mockRun = vi.fn().mockResolvedValue({ meta: { changes: changesResult } });
  const mockDb: any = {
    update:  vi.fn(() => mockDb),
    set:     vi.fn(() => mockDb),
    where:   vi.fn(() => mockDb),
    run:     mockRun,
    select:  vi.fn(() => mockDb),
    from:    vi.fn(() => mockDb),
    get:     vi.fn().mockResolvedValue(null),
    all:     vi.fn().mockResolvedValue([]), // flash-release lookup returns no items
    insert:  vi.fn(() => mockDb),
    values:  vi.fn(() => mockDb),
  };
  return { mockDb, mockRun };
}

const BASE_ORDER = {
  orderId: 'ord-1',
  validItems: [{ variation_id: 'prod-1', quantity: 1 }],
  totalAmount: 1000,
  shippingFeeCents: 0,
  discountAmount: 0,
};

describe('OrderService.processCheckout — Phase 0 Coupon Guard (I-05)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    (InventoryRepository.deductStock as any).mockResolvedValue(true);
  });

  // ── COUPON HAPPY PATHS ─────────────────────────────────────────────────
  it('TC-OSC-01: succeeds when no coupon applied (skip Phase 0)', async () => {
    const { mockDb } = makeCouponDb(1);

    const result = await OrderService.processCheckout(mockDb, mockDb, BASE_ORDER);

    expect(result.success).toBe(true);
    // update() should NOT be called — no coupon
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(OrderRepository.createOrder).toHaveBeenCalledWith(mockDb, BASE_ORDER);
  });

  it('TC-OSC-02: succeeds when coupon has unlimited max_uses (null)', async () => {
    const { mockDb } = makeCouponDb(1); // changes=1 → coupon accepted

    const result = await OrderService.processCheckout(mockDb, mockDb, {
      ...BASE_ORDER,
      appliedCouponId: 'coupon_unlimited',
      discountAmount: 200,
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled(); // Phase 0 ran
    expect(OrderRepository.createOrder).toHaveBeenCalled(); // Phase 1 ran
  });

  it('TC-OSC-03: succeeds when coupon is under max_uses limit (changes=1)', async () => {
    const { mockDb } = makeCouponDb(1);

    const result = await OrderService.processCheckout(mockDb, mockDb, {
      ...BASE_ORDER,
      appliedCouponId: 'coupon_limited_ok',
    });

    expect(result.success).toBe(true);
  });

  // ── COUPON LIMIT ENFORCEMENT ───────────────────────────────────────────
  it('TC-OSC-10: throws and DOES NOT create order when coupon is exhausted (changes=0)', async () => {
    const { mockDb } = makeCouponDb(0); // changes=0 → WHERE uses < max_uses failed

    await expect(OrderService.processCheckout(mockDb, mockDb, {
      ...BASE_ORDER,
      appliedCouponId: 'coupon_exhausted',
    })).rejects.toThrow(/Coupon usage limit reached/i);

    // CRITICAL: Order must NOT be created if coupon guard fails
    expect(OrderRepository.createOrder).not.toHaveBeenCalled();
    // CRITICAL: Inventory must NOT be touched
    expect(InventoryRepository.deductStock).not.toHaveBeenCalled();
  });

  it('TC-OSC-11: coupon guard runs BEFORE createOrder (Phase 0 ordering guarantee)', async () => {
    const callOrder: string[] = [];
    const { mockDb } = makeCouponDb(1);

    // Track call order
    mockDb.run = vi.fn(async () => {
      callOrder.push('coupon_update');
      return { meta: { changes: 1 } };
    });

    (OrderRepository.createOrder as any).mockImplementation(async () => {
      callOrder.push('createOrder');
    });

    (InventoryRepository.deductStock as any).mockImplementation(async () => {
      callOrder.push('deductStock');
      return true;
    });

    await OrderService.processCheckout(mockDb, mockDb, {
      ...BASE_ORDER,
      appliedCouponId: 'coupon_1',
    });

    expect(callOrder[0]).toBe('coupon_update');
    expect(callOrder[1]).toBe('createOrder');
    expect(callOrder[2]).toBe('deductStock');
  });

  // ── INVENTORY ROLLBACK ─────────────────────────────────────────────────
  it('TC-OSC-20: rolls back order to failed if stock deduction fails after coupon accepted', async () => {
    const { mockDb } = makeCouponDb(1);
    (InventoryRepository.deductStock as any).mockResolvedValue(false);

    await expect(OrderService.processCheckout(mockDb, mockDb, {
      ...BASE_ORDER,
      appliedCouponId: 'coupon_1',
    })).rejects.toThrow('Out of stock or inventory lock failed');

    expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(
      mockDb, 'ord-1', 'pending_payment', 'failed'
    );
  });

  it('TC-OSC-21: succeeds with valid inventory (no coupon, no issues)', async () => {
    const { mockDb } = makeCouponDb(1);
    (InventoryRepository.deductStock as any).mockResolvedValue(true);

    const result = await OrderService.processCheckout(mockDb, mockDb, BASE_ORDER);

    expect(result.success).toBe(true);
    expect(OrderRepository.updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('OrderService.cancelOrderAndRestock (I-09)', () => {

  beforeEach(() => vi.clearAllMocks());

  it('TC-OSC-30: cancels order and restocks when optimistic lock succeeds', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(true);
    (OrderRepository.getOrderItems as any).mockResolvedValue([
      { product_id: 'prod-1', quantity: 3 },
    ]);

    const { mockDb } = makeCouponDb(1);
    mockDb.get = vi.fn().mockResolvedValueOnce({ status: 'pending_payment', location_id: 'loc-1' });
    const success = await OrderService.cancelOrderAndRestock(mockDb, mockDb, 'ord-1');

    expect(success).toBe(true);
    expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(
      mockDb, 'ord-1', 'pending_payment', 'cancelled'
    );
    expect(InventoryRepository.restock).toHaveBeenCalledWith(
      mockDb, [{ productId: 'prod-1', quantity: 3 }], 'loc-1'
    );
  });

  it('TC-OSC-31: skips restock if optimistic lock fails (already processing — race condition)', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(false);

    const { mockDb } = makeCouponDb(1);
    mockDb.get = vi.fn().mockResolvedValueOnce({ status: 'pending_payment', location_id: 'loc-1' });
    const success = await OrderService.cancelOrderAndRestock(mockDb, mockDb, 'ord-1');

    expect(success).toBe(false);
    expect(InventoryRepository.restock).not.toHaveBeenCalled(); // no double-restock
  });
});

describe('OrderService.refundOrderAndRestock', () => {

  beforeEach(() => vi.clearAllMocks());

  it('TC-OSC-40: marks order as refunded and restocks items', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(true);
    (OrderRepository.getOrderItems as any).mockResolvedValue([
      { product_id: 'prod-2', quantity: 1 },
    ]);

    const { mockDb } = makeCouponDb(1);
    mockDb.get = vi.fn().mockResolvedValueOnce({ status: 'processing', location_id: 'loc-1' });
    const success = await OrderService.refundOrderAndRestock(mockDb, mockDb, 'ord-2', 'processing');

    expect(success).toBe(true);
    expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(
      mockDb, 'ord-2', 'processing', 'refunded'
    );
    expect(InventoryRepository.restock).toHaveBeenCalled();
  });

  it('TC-OSC-41: returns false when refund optimistic lock fails (already refunded)', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(false);

    const { mockDb } = makeCouponDb(1);
    mockDb.get = vi.fn().mockResolvedValueOnce({ status: 'completed', location_id: 'loc-1' });
    const success = await OrderService.refundOrderAndRestock(mockDb, mockDb, 'ord-2', 'completed');

    expect(success).toBe(false);
    expect(InventoryRepository.restock).not.toHaveBeenCalled();
  });
});

describe('OrderService.completeOrder', () => {

  beforeEach(() => vi.clearAllMocks());

  it('TC-OSC-50: completes order when current status is shipped', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(true);

    const { mockDb } = makeCouponDb(1);
    const success = await OrderService.completeOrder(mockDb, 'ord-shipped');

    expect(success).toBe(true);
    expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(
      mockDb, 'ord-shipped', 'shipped', 'completed'
    );
  });

  it('TC-OSC-51: returns false when updateOrderStatus fails (not shipped, or other race condition)', async () => {
    (OrderRepository.updateOrderStatus as any).mockResolvedValue(false);

    const { mockDb } = makeCouponDb(1);
    const success = await OrderService.completeOrder(mockDb, 'ord-invalid');

    expect(success).toBe(false);
    expect(OrderRepository.updateOrderStatus).toHaveBeenCalledWith(
      mockDb, 'ord-invalid', 'shipped', 'completed'
    );
  });
});

