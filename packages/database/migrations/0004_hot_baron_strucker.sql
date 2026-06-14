DROP INDEX IF EXISTS `idx_products_sku`;--> statement-breakpoint
ALTER TABLE products ADD `ai_sync_status` text DEFAULT 'pending';