-- Migration: 0005_add_inventory_reservations_and_idempotency_keys
-- Creates the two tables required by the checkout flow that were defined in
-- schema.ts but never written into a runnable SQL migration file.

-- inventory_reservations: soft-locks stock for 30 minutes during pending payment.
-- Deleted when: (a) webhook confirms payment, or (b) cron expires unpaid orders.
CREATE TABLE IF NOT EXISTS `inventory_reservations` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `order_id` TEXT NOT NULL,
  `variation_id` TEXT NOT NULL,
  `quantity` INTEGER NOT NULL,
  `expires_at` INTEGER NOT NULL,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- idempotency_keys: records processed Stripe event IDs to prevent double-processing.
-- Primary key on Stripe event ID provides the uniqueness constraint used by
-- INSERT OR IGNORE (onConflictDoNothing) in webhook.ts for atomic idempotency.
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `event_type` TEXT NOT NULL,
  `processed_at` TEXT DEFAULT CURRENT_TIMESTAMP
);
