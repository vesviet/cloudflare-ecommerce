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
ALTER TABLE carts ADD `discount_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE carts ADD `applied_promotions_json` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE carts ADD `last_active_at` integer;--> statement-breakpoint
ALTER TABLE carts ADD `abandoned_email_sent_at` integer;--> statement-breakpoint
ALTER TABLE customers ADD `loyalty_points_balance` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE orders ADD `discount_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE orders ADD `tax_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE orders ADD `applied_promotions_json` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE orders ADD `shipping_lines_json` text;--> statement-breakpoint
ALTER TABLE orders ADD `tax_lines_json` text;--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_code_unique` ON `promotions` (`code`);