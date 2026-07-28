import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

// Setup schema matching packages/database/src/schema.ts
db.exec(`
  CREATE TABLE idempotency_keys (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lease_token TEXT,
    lease_expires_at INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    expires_at INTEGER,
    processed_at TEXT
  );

  CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    guest_session_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE cart_items (
    id TEXT PRIMARY KEY,
    cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('--- Initializing Data ---');

const nowUnix = Math.floor(Date.now() / 1000);
const eightDaysAgoISO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
const sixDaysAgoISO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

// SQLite datetime standard format (YYYY-MM-DD HH:MM:SS)
const eightDaysAgoSQLite = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
const sevenDaysAgoMinus1SecISO = new Date(Date.now() - (7 * 24 * 60 * 60 + 5) * 1000).toISOString(); // 7 days 5 sec ago

console.log('eightDaysAgoISO:', eightDaysAgoISO);
console.log('eightDaysAgoSQLite:', eightDaysAgoSQLite);

// Insert Idempotency Keys scenarios
db.exec(`
  -- 1. Key processed 8 days ago (ISO string with T)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at) VALUES ('k1_iso', 'checkout', 'completed', '${eightDaysAgoISO}');

  -- 2. Key processed 8 days ago (SQLite format YYYY-MM-DD HH:MM:SS)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at) VALUES ('k2_sqlite', 'checkout', 'completed', '${eightDaysAgoSQLite}');

  -- 3. Key processed 6 days ago (recent, should NOT be deleted)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at) VALUES ('k3_recent', 'checkout', 'completed', '${sixDaysAgoISO}');

  -- 4. Key pending with null processed_at and null expires_at (should NOT be deleted)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at, expires_at) VALUES ('k4_pending', 'checkout', 'pending', NULL, NULL);

  -- 5. Key with null processed_at, but expired unix timestamp (should BE deleted)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at, expires_at) VALUES ('k5_expired_ttl', 'checkout', 'pending', NULL, ${nowUnix - 3600});

  -- 6. Key with null processed_at, future unix timestamp (should NOT be deleted)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at, expires_at) VALUES ('k6_future_ttl', 'checkout', 'pending', NULL, ${nowUnix + 3600});

  -- 7. KEY CONFLICT: Processed 8 days ago, BUT has future expires_at (e.g. 30 days retention policy for audit)
  INSERT INTO idempotency_keys (id, event_type, status, processed_at, expires_at) VALUES ('k7_processed_old_future_ttl', 'checkout', 'completed', '${eightDaysAgoISO}', ${nowUnix + 86400 * 20});
`);

// Insert Carts scenarios
db.exec(`
  -- c1: Abandoned cart 8 days ago (ISO string)
  INSERT INTO carts (id, status, created_at) VALUES ('c1_abandoned_old_iso', 'abandoned', '${eightDaysAgoISO}');
  INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES ('item1', 'c1_abandoned_old_iso', 'prod_1', 2);

  -- c2: Abandoned cart 8 days ago (SQLite format)
  INSERT INTO carts (id, status, created_at) VALUES ('c2_abandoned_old_sqlite', 'abandoned', '${eightDaysAgoSQLite}');
  INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES ('item2', 'c2_abandoned_old_sqlite', 'prod_2', 1);

  -- c3: Abandoned cart 6 days ago (recent abandoned, should NOT be deleted)
  INSERT INTO carts (id, status, created_at) VALUES ('c3_abandoned_recent', 'abandoned', '${sixDaysAgoISO}');

  -- c4: Active cart 10 days ago (should NOT be deleted because status != abandoned)
  INSERT INTO carts (id, status, created_at) VALUES ('c4_active_old', 'active', '${eightDaysAgoISO}');

  -- c5: Converted cart 10 days ago (should NOT be deleted)
  INSERT INTO carts (id, status, created_at) VALUES ('c5_converted_old', 'converted', '${eightDaysAgoISO}');
`);

console.log('\n--- Before Retention Deletion ---');
console.log('Idempotency Keys:', db.prepare('SELECT id, processed_at, expires_at FROM idempotency_keys').all());
console.log('Carts:', db.prepare('SELECT id, status, created_at FROM carts').all());
console.log('Cart Items count:', db.prepare('SELECT COUNT(*) as count FROM cart_items').get());

// EXECUTE RETENTION CLEANUP QUERIES FROM index.ts
console.log('\n--- Executing Retention Cleanup Queries ---');

db.exec(`DELETE FROM idempotency_keys WHERE processed_at < datetime('now', '-7 days') OR (expires_at IS NOT NULL AND expires_at < unixepoch('now'))`);
db.exec(`DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days')`);

console.log('\n--- After Retention Deletion ---');
const remainingKeys = db.prepare('SELECT id, processed_at, expires_at FROM idempotency_keys').all();
const remainingCarts = db.prepare('SELECT id, status, created_at FROM carts').all();
const remainingCartItems = db.prepare('SELECT id, cart_id FROM cart_items').all();

console.log('Remaining Idempotency Keys:', remainingKeys);
console.log('Remaining Carts:', remainingCarts);
console.log('Remaining Cart Items:', remainingCartItems);

// Check findings:
console.log('\n--- Empirical Findings Analysis ---');

// 1. Did k1_iso get deleted?
const k1Deleted = !remainingKeys.some(k => k.id === 'k1_iso');
console.log(`Finding 1: k1_iso (ISO string with T format) deleted? ${k1Deleted}`);

// 2. Did k7_processed_old_future_ttl get deleted despite future expires_at?
const k7Deleted = !remainingKeys.some(k => k.id === 'k7_processed_old_future_ttl');
console.log(`Finding 2: k7_processed_old_future_ttl (processed 8d ago, future expires_at) deleted? ${k7Deleted}`);

// 3. Were orphan cart items left behind if FK cascade is off or on?
console.log(`Finding 3: Cart Items count after cart deletion: ${remainingCartItems.length}`);
