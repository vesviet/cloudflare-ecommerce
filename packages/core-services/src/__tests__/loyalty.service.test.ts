import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyService } from '../loyalty.service';

/**
 * The balance guard must be enforced by the UPDATE statement itself, so these
 * tests assert on what the service does with the reported row count rather than
 * on a balance it read beforehand.
 */
function makeDb(options: { changes: number; customerExists?: boolean }) {
  const { changes, customerExists = true } = options;

  const setSpy = vi.fn();
  const whereSpy = vi.fn();

  const db: any = {
    update: vi.fn(() => ({
      set: (values: any) => {
        setSpy(values);
        return {
          where: (condition: any) => {
            whereSpy(condition);
            return { run: vi.fn().mockResolvedValue({ meta: { changes } }) };
          },
        };
      },
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(customerExists ? { id: 'cust_1' } : undefined),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ success: true }) })),
    })),
  };

  return { db, setSpy, whereSpy };
}

describe('LoyaltyService.updateCustomerPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the delta as a relative SQL expression, not a precomputed value', async () => {
    const { db, setSpy } = makeDb({ changes: 1 });

    await LoyaltyService.updateCustomerPoints(db, 'cust_1', -50);

    const values = setSpy.mock.calls[0][0];
    // A plain number here would mean the balance was read then overwritten.
    expect(typeof values.loyalty_points_balance).toBe('object');
  });

  it('rejects a redemption the database refused', async () => {
    const { db } = makeDb({ changes: 0 });

    await expect(LoyaltyService.updateCustomerPoints(db, 'cust_1', -500))
      .rejects.toThrow('Insufficient Loyalty Points');
  });

  it('reports a missing customer distinctly from an insufficient balance', async () => {
    const { db } = makeDb({ changes: 0, customerExists: false });

    await expect(LoyaltyService.updateCustomerPoints(db, 'ghost', -1))
      .rejects.toThrow('Customer ghost not found');
  });

  it('accepts an earning delta', async () => {
    const { db } = makeDb({ changes: 1 });

    await expect(LoyaltyService.updateCustomerPoints(db, 'cust_1', 120)).resolves.toBeUndefined();
  });
});

describe('LoyaltyService redemption and earning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not touch the balance when redeeming zero points', async () => {
    const { db } = makeDb({ changes: 1 });

    await LoyaltyService.redeemPoints(db, 'cust_1', 'order_1', 0);

    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('writes a ledger entry after a successful redemption', async () => {
    const { db } = makeDb({ changes: 1 });

    await LoyaltyService.redeemPoints(db, 'cust_1', 'order_1', 300);

    expect(db.insert).toHaveBeenCalled();
  });

  it('does not write a ledger entry when the redemption is refused', async () => {
    const { db } = makeDb({ changes: 0 });

    await expect(LoyaltyService.redeemPoints(db, 'cust_1', 'order_1', 300))
      .rejects.toThrow('Insufficient Loyalty Points');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('skips earning when the order total is below the point threshold', async () => {
    const { db } = makeDb({ changes: 1 });

    await LoyaltyService.earnPoints(db, 'cust_1', 'order_1', 99);

    expect(db.update).not.toHaveBeenCalled();
  });
});
