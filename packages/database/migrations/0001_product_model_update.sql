-- Migration number: 0001 	 2026-05-26T00:00:00.000Z

PRAGMA foreign_keys = OFF;

-- Update products table
ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'simple' NOT NULL;
ALTER TABLE products ADD COLUMN regular_price INTEGER;
ALTER TABLE products ADD COLUMN sale_price INTEGER;
ALTER TABLE products ADD COLUMN is_purchasable INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE products ADD COLUMN in_stock INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE products ADD COLUMN attributes TEXT;

-- Update product_variations table
-- Create a new table to support changing the price column to regular_price (minor units)
CREATE TABLE product_variations_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  regular_price INTEGER NOT NULL,
  sale_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  is_purchasable INTEGER DEFAULT 1 NOT NULL,
  in_stock INTEGER DEFAULT 1 NOT NULL,
  attributes_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Migrate data and convert price to minor units (price * 100)
INSERT INTO product_variations_new (id, product_id, sku, regular_price, stock, attributes_json, created_at)
SELECT id, product_id, sku, CAST(price * 100 AS INTEGER), stock, attributes_json, created_at
FROM product_variations;

DROP TABLE product_variations;
ALTER TABLE product_variations_new RENAME TO product_variations;

PRAGMA foreign_keys = ON;
