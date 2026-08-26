-- Phase 2B: Flash Sales (Laravel FlashSale/FlashSaleItem parity).
-- Quota-based time-boxed pricing isolated from promotion rules stacking.

CREATE TABLE `flash_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `flash_sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`flash_sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`price` integer NOT NULL,
	`quota` integer NOT NULL DEFAULT 0,
	`sold_quantity` integer NOT NULL DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`flash_sale_id`) REFERENCES `flash_sales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_flash_items_sale` ON `flash_sale_items` (`flash_sale_id`);
--> statement-breakpoint
CREATE INDEX `idx_flash_items_product` ON `flash_sale_items` (`product_id`);
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `is_flash_sale` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `flash_sale_item_id` text;
