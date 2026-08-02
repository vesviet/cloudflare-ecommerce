import { eq } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

interface CacheEntry {
  value: string;
  type: string;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry>();
const TTL = 60 * 1000; // 60 seconds

export async function getSetting(db: any, key: string, defaultValue: any = null): Promise<any> {
  const now = Date.now();
  const cached = settingsCache.get(key);

  if (cached && cached.expiresAt > now) {
    return parseValue(cached.value, cached.type);
  }

  // Cache miss or expired, fetch from D1
  const result = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  if (result.length > 0) {
    const record = result[0];
    settingsCache.set(key, {
      value: record.value,
      type: record.type,
      expiresAt: now + TTL
    });
    return parseValue(record.value, record.type);
  }

  return defaultValue;
}

/**
 * Clear all in-memory cached settings.
 * Use in tests to prevent stale values from leaking across test cases.
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
}

function parseValue(value: string, type: string): any {
  if (type === 'boolean') return value === 'true';
  if (type === 'number') return Number(value);
  return value;
}
