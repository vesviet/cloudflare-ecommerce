-- Phase 4c: Provinces, Banners, and product/category/review schema parity.

CREATE TABLE `provinces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provinces_code_unique` ON `provinces` (`code`);
--> statement-breakpoint

CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`position` text NOT NULL DEFAULT 'hero_slider',
	`title` text NOT NULL,
	`eyebrow` text,
	`subtitle` text,
	`cta_text` text NOT NULL DEFAULT 'Khám Phá Ngay',
	`image` text NOT NULL,
	`link` text,
	`open_in_new_tab` integer NOT NULL DEFAULT 0,
	`status` text DEFAULT 'active',
	`starts_at` text,
	`ends_at` text,
	`sort_order` integer NOT NULL DEFAULT 0,
	`clicks_count` integer NOT NULL DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_banners_position_status_sort` ON `banners` (`position`, `status`, `sort_order`);
--> statement-breakpoint

-- Product schema parity with Laravel enhance migration (000002)
ALTER TABLE `products` ADD COLUMN `compare_at_price` integer;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `published_at` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `low_stock_threshold` integer NOT NULL DEFAULT 5;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `meta_title` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `meta_description` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `meta_keywords` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `structured_data` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `is_visible` integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- Category schema parity with Laravel enhance migration (000005)
ALTER TABLE `categories` ADD COLUMN `sort_order` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `meta_title` text;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `meta_description` text;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `meta_keywords` text;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `is_visible` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `image_path` text;
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `structured_data` text;
--> statement-breakpoint

-- Product review schema parity with Laravel enhance migration (000004)
ALTER TABLE `product_reviews` ADD COLUMN `seller_responded_at` integer;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `not_helpful_count` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `moderation_note` text;
--> statement-breakpoint
