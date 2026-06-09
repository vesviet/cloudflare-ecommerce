CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`guest_session_id` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
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
CREATE TABLE `customer_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`alias` text DEFAULT 'Home',
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`company` text,
	`address_1` text NOT NULL,
	`address_2` text,
	`city` text NOT NULL,
	`state` text,
	`postcode` text NOT NULL,
	`country` text DEFAULT 'VN' NOT NULL,
	`phone` text,
	`vat_id` text,
	`latitude` real,
	`longitude` real,
	`delivery_instructions` text,
	`is_default_shipping` integer DEFAULT 0,
	`is_default_billing` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`dob` text,
	`gender` text,
	`company_name` text,
	`vat_tax_id` text,
	`avatar_url` text,
	`email_verified` integer DEFAULT 0,
	`email_verification_token` text,
	`password_reset_token` text,
	`password_reset_expires_at` integer,
	`accepts_marketing` integer DEFAULT 0,
	`accepts_marketing_updated_at` text,
	`tags_json` text DEFAULT '[]',
	`signup_utm_source` text,
	`signup_utm_medium` text,
	`signup_utm_campaign` text,
	`signup_affiliate_id` text,
	`stripe_customer_id` text,
	`crm_id` text,
	`last_login_at` text,
	`last_login_ip` text,
	`note` text,
	`metafields_json` text DEFAULT '{}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`price_at_purchase` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`guest_email` text,
	`status` text DEFAULT 'pending_payment',
	`total_amount` integer NOT NULL,
	`shipping_fee` integer DEFAULT 0,
	`affiliate_id` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`shipping_address_json` text,
	`billing_address_json` text,
	`tracking_number` text,
	`carrier_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`slug` text NOT NULL,
	`sku` text,
	`title` text NOT NULL,
	`short_description` text,
	`description` text,
	`images_json` text DEFAULT '[]',
	`type` text DEFAULT 'simple' NOT NULL,
	`regular_price` integer,
	`sale_price` integer,
	`manage_stock` integer DEFAULT 1,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`allow_backorders` integer DEFAULT 0,
	`in_stock` integer DEFAULT 1 NOT NULL,
	`weight` real,
	`length` real,
	`width` real,
	`height` real,
	`attributes_json` text,
	`tags_json` text DEFAULT '[]',
	`metafields_json` text DEFAULT '{}',
	`is_purchasable` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft',
	`primary_category_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`primary_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_intent_id` text,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`provider` text NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `cms_entries_slug_unique` ON `cms_entries` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_customer_addresses_customer_id` ON `customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_stripe_customer_id_unique` ON `customers` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_reservations_product_id` ON `inventory_reservations` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_reservations_expires_at` ON `inventory_reservations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_products_status` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `idx_products_parent_id` ON `products` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_products_sku` ON `products` (`sku`);