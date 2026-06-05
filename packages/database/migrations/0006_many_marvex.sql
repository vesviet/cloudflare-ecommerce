CREATE INDEX `idx_customer_addresses_customer_id` ON `customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_reservations_variation_id` ON `inventory_reservations` (`variation_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_reservations_expires_at` ON `inventory_reservations` (`expires_at`);