-- Migration number: 0003 	 2026-05-26T00:00:00.000Z

PRAGMA foreign_keys = OFF;

-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
ALTER TABLE customers ADD COLUMN dob TEXT;
ALTER TABLE customers ADD COLUMN gender TEXT;
ALTER TABLE customers ADD COLUMN company_name TEXT;
ALTER TABLE customers ADD COLUMN vat_tax_id TEXT;
ALTER TABLE customers ADD COLUMN avatar_url TEXT;
ALTER TABLE customers ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN email_verification_token TEXT;
ALTER TABLE customers ADD COLUMN password_reset_token TEXT;
ALTER TABLE customers ADD COLUMN password_reset_expires_at INTEGER;
ALTER TABLE customers ADD COLUMN accepts_marketing INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN accepts_marketing_updated_at TEXT;
ALTER TABLE customers ADD COLUMN tags_json TEXT DEFAULT '[]';
ALTER TABLE customers ADD COLUMN signup_utm_source TEXT;
ALTER TABLE customers ADD COLUMN signup_utm_medium TEXT;
ALTER TABLE customers ADD COLUMN signup_utm_campaign TEXT;
ALTER TABLE customers ADD COLUMN signup_affiliate_id TEXT;
ALTER TABLE customers ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE customers ADD COLUMN crm_id TEXT;
ALTER TABLE customers ADD COLUMN last_login_at TEXT;
ALTER TABLE customers ADD COLUMN last_login_ip TEXT;
ALTER TABLE customers ADD COLUMN note TEXT;
ALTER TABLE customers ADD COLUMN metafields_json TEXT DEFAULT '{}';
ALTER TABLE customers ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create unique index on stripe_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS customers_stripe_customer_id_unique ON customers (stripe_customer_id);

-- Add new columns to customer_addresses table
ALTER TABLE customer_addresses ADD COLUMN company TEXT;
ALTER TABLE customer_addresses ADD COLUMN vat_id TEXT;
ALTER TABLE customer_addresses ADD COLUMN latitude REAL;
ALTER TABLE customer_addresses ADD COLUMN longitude REAL;
ALTER TABLE customer_addresses ADD COLUMN delivery_instructions TEXT;

PRAGMA foreign_keys = ON;
ALTER TABLE products ADD `images_json` text DEFAULT '[]';