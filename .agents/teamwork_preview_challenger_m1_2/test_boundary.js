import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE idempotency_keys (
    id TEXT PRIMARY KEY,
    processed_at TEXT
  );
  CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    status TEXT,
    created_at TEXT
  );
`);

// Suppose current time is 2026-07-28 13:00:00.
// datetime('now', '-7 days') is '2026-07-21 13:00:00'.
// An item created on 2026-07-21 at 05:00:00 UTC is 7 days and 8 hours ago (OLDER than 7 days).
// Standard ISO string format: '2026-07-21T05:00:00.000Z'
// Standard SQLite datetime format: '2026-07-21 05:00:00'

const isoOlderThan7Days = '2026-07-21T05:00:00.000Z'; // 7 days 8 hrs ago
const sqliteOlderThan7Days = '2026-07-21 05:00:00';   // 7 days 8 hrs ago

db.exec(`
  INSERT INTO idempotency_keys (id, processed_at) VALUES ('key_iso_older', '${isoOlderThan7Days}');
  INSERT INTO idempotency_keys (id, processed_at) VALUES ('key_sqlite_older', '${sqliteOlderThan7Days}');
`);

// Mock now as '2026-07-28 13:00:00'
const testCutoff = "datetime('2026-07-28 13:00:00', '-7 days')"; // '2026-07-21 13:00:00'

console.log('Cutoff datetime string:', db.prepare(`SELECT datetime('2026-07-28 13:00:00', '-7 days') as cutoff`).get().cutoff);

// Test raw string comparison as used in index.ts:
const rawIsoCheck = db.prepare(`SELECT ('${isoOlderThan7Days}' < ${testCutoff}) as result`).get().result;
const rawSqliteCheck = db.prepare(`SELECT ('${sqliteOlderThan7Days}' < ${testCutoff}) as result`).get().result;

console.log(`Raw ISO String ('${isoOlderThan7Days}' < cutoff):`, rawIsoCheck === 1 ? 'PASS (Deleted)' : 'FAIL (NOT Deleted!)');
console.log(`Raw SQLite String ('${sqliteOlderThan7Days}' < cutoff):`, rawSqliteCheck === 1 ? 'PASS (Deleted)' : 'FAIL (NOT Deleted!)');

// Test normalized datetime comparison:
const normIsoCheck = db.prepare(`SELECT (datetime('${isoOlderThan7Days}') < ${testCutoff}) as result`).get().result;
console.log(`Normalized datetime('${isoOlderThan7Days}') < cutoff:`, normIsoCheck === 1 ? 'PASS (Deleted)' : 'FAIL');
