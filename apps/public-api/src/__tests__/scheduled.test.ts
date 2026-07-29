import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Cloudflare Workers module if transitively required
vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
}));

// Mock DB run function to inspect queries executed
const mockDbRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
const mockDbSelect = vi.fn().mockReturnThis();
const mockDbFrom = vi.fn().mockReturnThis();
const mockDbWhere = vi.fn().mockReturnThis();
const mockDbLimit = vi.fn().mockReturnThis();
const mockDbAll = vi.fn().mockResolvedValue([]);

vi.mock('@ecommerce/database', () => {
  return {
    schema: {
      idempotencyKeys: { id: 'idempotencyKeys' },
      checkoutIdempotency: { id: 'checkoutIdempotency' },
      carts: { id: 'carts' },
      orders: { id: 'orders' },
      customers: { id: 'customers' },
      categories: { id: 'categories' },
      products: { id: 'products' },
      priceLists: { id: 'priceLists' },
      productVariations: { id: 'productVariations' },
      inventoryReservations: { id: 'inventoryReservations' },
      rmaRequests: { id: 'rmaRequests' },
      reviews: { id: 'reviews' },
      landingPages: { id: 'landingPages' },
      leads: { id: 'leads' },
      coupons: { id: 'coupons' },
      settings: { id: 'settings' },
      logs: { id: 'logs' },
    },
    createDb: vi.fn().mockImplementation(() => {
      return {
        run: mockDbRun,
        select: mockDbSelect,
        from: mockDbFrom,
        where: mockDbWhere,
        limit: mockDbLimit,
        all: mockDbAll,
      };
    }),
  };
});

import worker from '../index';

function extractSqlText(arg: any): string {
  if (!arg) return '';
  if (typeof arg === 'string') return arg;
  if (arg.queryChunks && Array.isArray(arg.queryChunks)) {
    return arg.queryChunks
      .map((chunk: any) => {
        if (typeof chunk === 'string') return chunk;
        if (chunk && chunk.value && Array.isArray(chunk.value)) return chunk.value.join('');
        if (chunk && typeof chunk.sql === 'string') return chunk.sql;
        return String(chunk);
      })
      .join(' ');
  }
  return JSON.stringify(arg);
}

describe('Daily Data Retention Cron Job (Slice 6) - Comprehensive Empirical Tests', () => {
  const mockEnv = {
    DB: {} as any,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('P0: Daily cron (0 0 * * *) triggers retention deletions for idempotency_keys, carts, and checkout_idempotency', async () => {
    await worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {});

    // Ensure db.run was called 3 times for retention cleanup
    expect(mockDbRun).toHaveBeenCalledTimes(3);

    // Inspect the SQL queries passed to db.run
    const firstCallArg = mockDbRun.mock.calls[0][0];
    const secondCallArg = mockDbRun.mock.calls[1][0];
    const thirdCallArg = mockDbRun.mock.calls[2][0];

    const firstQueryText = extractSqlText(firstCallArg);
    expect(firstQueryText).toContain('DELETE FROM idempotency_keys');
    expect(firstQueryText).toContain("expires_at IS NULL AND datetime(processed_at) < datetime('now', '-7 days')");
    expect(firstQueryText).toContain("expires_at IS NOT NULL AND expires_at < unixepoch('now')");

    const secondQueryText = extractSqlText(secondCallArg);
    expect(secondQueryText).toContain('DELETE FROM carts');
    // Carts are never explicitly marked 'abandoned'; retention targets non-converted,
    // inactive carts older than 7 days (created_at) with a last_active_at safety guard.
    expect(secondQueryText).toContain("status != 'converted'");
    expect(secondQueryText).toContain('last_active_at');
    expect(secondQueryText).toContain("datetime(created_at) < datetime('now', '-7 days')");

    const thirdQueryText = extractSqlText(thirdCallArg);
    expect(thirdQueryText).toContain('DELETE FROM checkout_idempotency');
    expect(thirdQueryText).toContain("expires_at < unixepoch('now')");
  });

  it('P1: Daily cron handles 1st DB query error gracefully and STILL executes 2nd and 3rd queries', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 1st run call fails, 2nd & 3rd succeed
    mockDbRun
      .mockRejectedValueOnce(new Error('D1 Query Error: idempotency_keys table locked'))
      .mockResolvedValueOnce({ meta: { changes: 5 } })
      .mockResolvedValueOnce({ meta: { changes: 2 } });

    await expect(worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {})).resolves.not.toThrow();

    // Verify 1st query error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Cron] Error cleaning up idempotency_keys:',
      'D1 Query Error: idempotency_keys table locked'
    );

    // CRITICAL: Ensure second and third queries were STILL executed despite 1st query failing!
    expect(mockDbRun).toHaveBeenCalledTimes(3);
    const secondQueryText = extractSqlText(mockDbRun.mock.calls[1][0]);
    expect(secondQueryText).toContain('DELETE FROM carts');
    const thirdQueryText = extractSqlText(mockDbRun.mock.calls[2][0]);
    expect(thirdQueryText).toContain('DELETE FROM checkout_idempotency');

    consoleErrorSpy.mockRestore();
  });

  it('P1: Daily cron handles 2nd DB query error gracefully after 1st query succeeds and STILL executes 3rd query', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 1st run call succeeds, 2nd fails, 3rd succeeds
    mockDbRun
      .mockResolvedValueOnce({ meta: { changes: 10 } })
      .mockRejectedValueOnce(new Error('D1 Query Error: carts table error'))
      .mockResolvedValueOnce({ meta: { changes: 3 } });

    await expect(worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {})).resolves.not.toThrow();

    // Verify 2nd query error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Cron] Error cleaning up abandoned carts:',
      'D1 Query Error: carts table error'
    );

    expect(mockDbRun).toHaveBeenCalledTimes(3);
    const thirdQueryText = extractSqlText(mockDbRun.mock.calls[2][0]);
    expect(thirdQueryText).toContain('DELETE FROM checkout_idempotency');

    consoleErrorSpy.mockRestore();
  });

  it('P1: Daily cron handles 3rd DB query error gracefully after 1st and 2nd queries succeed', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 1st & 2nd run call succeed, 3rd fails
    mockDbRun
      .mockResolvedValueOnce({ meta: { changes: 10 } })
      .mockResolvedValueOnce({ meta: { changes: 5 } })
      .mockRejectedValueOnce(new Error('D1 Query Error: checkout_idempotency error'));

    await expect(worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {})).resolves.not.toThrow();

    // Verify 3rd query error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Cron] Error cleaning up checkout_idempotency:',
      'D1 Query Error: checkout_idempotency error'
    );

    expect(mockDbRun).toHaveBeenCalledTimes(3);
    consoleErrorSpy.mockRestore();
  });

  it('P2: Unknown cron expression does not trigger retention cleanup', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await worker.scheduled({ cron: '9 9 9 9 9' }, mockEnv, {});

    expect(mockDbRun).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Cron] Unknown cron expression: 9 9 9 9 9');

    consoleWarnSpy.mockRestore();
  });

  it('P2: Cron with trailing spaces or different formatting falls through to unknown cron', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await worker.scheduled({ cron: '0 0 * * * ' }, mockEnv, {});

    expect(mockDbRun).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Cron] Unknown cron expression: 0 0 * * * ');

    consoleWarnSpy.mockRestore();
  });

  it('P2: 5-minute and hourly cron triggers execute their own logic without touching retention queries', async () => {
    // 5-min cron
    mockDbAll.mockResolvedValueOnce([]); // no pending orders
    await worker.scheduled({ cron: '*/5 * * * *' }, mockEnv, {});
    expect(mockDbRun).not.toHaveBeenCalled();

    // Hourly cron
    mockDbAll.mockResolvedValueOnce([]); // no pending orders for hourly abandon
    mockDbAll.mockResolvedValueOnce([]); // no abandoned carts for emails
    await worker.scheduled({ cron: '0 * * * *' }, mockEnv, {});
    
    // Hourly cron has idempotency_keys cleanup (1 call)
    expect(mockDbRun).toHaveBeenCalledTimes(1);
    const hourlyCallText = extractSqlText(mockDbRun.mock.calls[0][0]);
    expect(hourlyCallText).toContain('DELETE FROM idempotency_keys WHERE expires_at IS NOT NULL AND expires_at <');
  });

  it('P3: Verifies retention query SQL structure for ISO date comparison, TTL precedence, and checkout_idempotency', async () => {
    await worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {});

    const firstQueryText = extractSqlText(mockDbRun.mock.calls[0][0]);
    const secondQueryText = extractSqlText(mockDbRun.mock.calls[1][0]);
    const thirdQueryText = extractSqlText(mockDbRun.mock.calls[2][0]);

    // 1. Verify datetime() wrapping for ISO 8601 string comparison in idempotency_keys & carts
    expect(firstQueryText).toContain("datetime(processed_at) < datetime('now', '-7 days')");
    expect(secondQueryText).toContain("datetime(created_at) < datetime('now', '-7 days')");

    // 2. Verify TTL precedence logic: keys with future expires_at TTL are not deleted prematurely
    expect(firstQueryText).toContain("expires_at IS NULL AND datetime(processed_at) < datetime('now', '-7 days')");
    expect(firstQueryText).toContain("expires_at IS NOT NULL AND expires_at < unixepoch('now')");

    // 3. Verify checkout_idempotency cleanup
    expect(thirdQueryText).toContain("DELETE FROM checkout_idempotency WHERE expires_at < unixepoch('now')");
  });

  it('P4: Daily cron (0 0 * * *) does not execute 5-min or hourly order logic', async () => {
    await worker.scheduled({ cron: '0 0 * * *' }, mockEnv, {});

    // mockDbSelect should not have been called for 5-min or hourly orders
    expect(mockDbSelect).not.toHaveBeenCalled();
  });
});


