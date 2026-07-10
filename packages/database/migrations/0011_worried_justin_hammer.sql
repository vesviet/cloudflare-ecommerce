CREATE TABLE `loyalty_ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`transaction_type` text NOT NULL,
	`points` integer NOT NULL,
	`order_id` text,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `promotion_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`min_order_amount` integer DEFAULT 0,
	`starts_at` integer,
	`ends_at` integer,
	`usage_limit` integer,
	`times_used` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`return_id` text,
	`transaction_id` text,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`gateway_refund_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`restock_condition` text DEFAULT 'sellable',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`reason` text NOT NULL,
	`refund_amount` integer,
	`tracking_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shipment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`tracking_number` text,
	`carrier_name` text,
	`label_r2_key` text,
	`shipped_at` text,
	`delivered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `coupons`;--> statement-breakpoint
DROP TABLE `fulfillment_items`;--> statement-breakpoint
DROP TABLE `fulfillments`;--> statement-breakpoint
DROP TABLE `order_discounts`;--> statement-breakpoint
DROP TABLE `product_reviews`;--> statement-breakpoint
DROP TABLE `rma_requests`;--> statement-breakpoint
DROP TABLE `wishlists`;--> statement-breakpoint
ALTER TABLE carts ADD `discount_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE carts ADD `applied_promotions_json` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE carts ADD `last_active_at` integer;--> statement-breakpoint
ALTER TABLE carts ADD `abandoned_email_sent_at` integer;--> statement-breakpoint
ALTER TABLE customers ADD `loyalty_points_balance` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE idempotency_keys ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE inventory_reservations ADD `location_id` text NOT NULL REFERENCES locations(id);--> statement-breakpoint
ALTER TABLE orders ADD `location_id` text REFERENCES locations(id);--> statement-breakpoint
ALTER TABLE orders ADD `discount_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE orders ADD `tax_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE orders ADD `applied_promotions_json` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE orders ADD `shipping_lines_json` text;--> statement-breakpoint
ALTER TABLE orders ADD `tax_lines_json` text;--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_code_unique` ON `promotions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_shipment_items_shipment_id` ON `shipment_items` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_shipment_items_order_item_id` ON `shipment_items` (`order_item_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_order_id` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_reservations_location_product` ON `inventory_reservations` (`location_id`,`product_id`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/