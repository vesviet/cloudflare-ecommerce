import { DatabaseSync } from 'node:sqlite';

// Test 1: SQLite without PRAGMA foreign_keys = ON
const db1 = new DatabaseSync(':memory:');
db1.exec(`
  CREATE TABLE carts (id TEXT PRIMARY KEY, status TEXT, created_at TEXT);
  CREATE TABLE cart_items (id TEXT PRIMARY KEY, cart_id TEXT REFERENCES carts(id) ON DELETE CASCADE);

  INSERT INTO carts VALUES ('c1', 'abandoned', '2026-07-20 00:00:00');
  INSERT INTO cart_items VALUES ('ci1', 'c1');
`);

db1.exec("DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days')");
const db1Orphans = db1.prepare("SELECT COUNT(*) as cnt FROM cart_items").get().cnt;

// Test 2: SQLite with PRAGMA foreign_keys = ON
const db2 = new DatabaseSync(':memory:');
db2.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE carts (id TEXT PRIMARY KEY, status TEXT, created_at TEXT);
  CREATE TABLE cart_items (id TEXT PRIMARY KEY, cart_id TEXT REFERENCES carts(id) ON DELETE CASCADE);

  INSERT INTO carts VALUES ('c1', 'abandoned', '2026-07-20 00:00:00');
  INSERT INTO cart_items VALUES ('ci1', 'c1');
`);

db2.exec("DELETE FROM carts WHERE status = 'abandoned' AND created_at < datetime('now', '-7 days')");
const db2Orphans = db2.prepare("SELECT COUNT(*) as cnt FROM cart_items").get().cnt;

console.log(`Default Foreign Key Enforcement OFF -> Cart Items remaining: ${db1Orphans} (Orphaned!)`);
console.log(`With PRAGMA foreign_keys = ON -> Cart Items remaining: ${db2Orphans} (Cascaded)`);
