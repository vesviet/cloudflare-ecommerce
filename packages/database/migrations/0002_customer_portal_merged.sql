-- Migration number: 0002 	 2026-05-26T00:00:00.000Z

PRAGMA foreign_keys = OFF;

-- Add password_hash to customers
ALTER TABLE customers ADD COLUMN password_hash TEXT;

-- Create customer_addresses table
CREATE TABLE customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  alias TEXT DEFAULT 'Home',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address_1 TEXT NOT NULL,
  address_2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'VN',
  phone TEXT,
  is_default_shipping INTEGER DEFAULT 0,
  is_default_billing INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Add index on customer_id for faster lookups
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

PRAGMA foreign_keys = ON;
CREATE TABLE `cms_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text,
	`type` text DEFAULT 'post' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured_image_url` text,
	`published_at` integer,
	`metadata_json` text DEFAULT '{}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

CREATE UNIQUE INDEX `cms_entries_slug_unique` ON `cms_entries` (`slug`);