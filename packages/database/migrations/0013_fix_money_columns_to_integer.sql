-- Migration number: 0013 	 2026-05-29T00:00:00.000Z

-- Alter table `orders` to change total_amount and shipping_fee from REAL to INTEGER
CREATE TABLE `orders_new` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`guest_email` text,
	`status` text DEFAULT 'pending_payment',
	`payment_intent_id` text,
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

INSERT INTO `orders_new` SELECT * FROM `orders`;
DROP TABLE `orders`;
ALTER TABLE `orders_new` RENAME TO `orders`;

-- Alter table `order_items` to change price_at_purchase from REAL to INTEGER
CREATE TABLE `order_items_new` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variation_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`price_at_purchase` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `order_items_new` SELECT * FROM `order_items`;
DROP TABLE `order_items`;
ALTER TABLE `order_items_new` RENAME TO `order_items`;
