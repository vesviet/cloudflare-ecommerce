CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`max_uses` integer,
	`uses` integer DEFAULT 0,
	`expires_at` integer,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `order_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`coupon_id` text,
	`discount_amount` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`customer_id` text,
	`rating` integer NOT NULL,
	`comment` text,
	`status` text DEFAULT 'pending',
	`verified_purchase` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rma_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'requested',
	`reason` text NOT NULL,
	`refund_amount` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `loyalty_ledgers`;--> statement-breakpoint
DROP TABLE `promotion_rules`;--> statement-breakpoint
DROP TABLE `promotions`;--> statement-breakpoint
DROP TABLE `refunds`;--> statement-breakpoint
DROP TABLE `return_items`;--> statement-breakpoint
DROP TABLE `returns`;--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE INDEX `idx_rma_requests_order_id` ON `rma_requests` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_rma_requests_customer_id` ON `rma_requests` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_wishlists_customer_product` ON `wishlists` (`customer_id`,`product_id`);--> statement-breakpoint
ALTER TABLE `carts` DROP COLUMN `discount_amount`;--> statement-breakpoint
ALTER TABLE `carts` DROP COLUMN `applied_promotions_json`;--> statement-breakpoint
ALTER TABLE `carts` DROP COLUMN `last_active_at`;--> statement-breakpoint
ALTER TABLE `carts` DROP COLUMN `abandoned_email_sent_at`;--> statement-breakpoint
ALTER TABLE `customers` DROP COLUMN `loyalty_points_balance`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `discount_amount`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `tax_amount`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `applied_promotions_json`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `shipping_lines_json`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `tax_lines_json`;