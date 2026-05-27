-- Migration: 0006_fix_orders_nullable_address_columns
-- The orders table was created with NOT NULL on shipping_address_json,
-- billing_address_json, and shipping_fee which conflicts with the Drizzle schema.
-- SQLite does not support ALTER COLUMN to drop NOT NULL, so we recreate the table.

PRAGMA foreign_keys = OFF;

-- Step 1: Create replacement orders table matching the Drizzle schema exactly
CREATE TABLE orders_new (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  guest_email TEXT,
  status TEXT DEFAULT 'pending_payment',
  payment_intent_id TEXT,
  total_amount REAL NOT NULL,
  shipping_fee REAL DEFAULT 0,
  affiliate_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  shipping_address_json TEXT,
  billing_address_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy all existing data
INSERT INTO orders_new
  SELECT id, customer_id, guest_email, status, payment_intent_id, total_amount,
         shipping_fee, affiliate_id, utm_source, utm_medium, utm_campaign,
         shipping_address_json, billing_address_json, created_at, updated_at
  FROM orders;

-- Step 3: Swap tables
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

PRAGMA foreign_keys = ON;
