ALTER TABLE `idempotency_keys` ADD COLUMN `status` text NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `idempotency_keys` ADD COLUMN `lease_token` text;
--> statement-breakpoint
ALTER TABLE `idempotency_keys` ADD COLUMN `lease_expires_at` integer;
--> statement-breakpoint
ALTER TABLE `idempotency_keys` ADD COLUMN `attempts` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `idempotency_keys` ADD COLUMN `last_error` text;
--> statement-breakpoint
ALTER TABLE `idempotency_keys` ADD COLUMN `expires_at` integer;
--> statement-breakpoint
UPDATE `idempotency_keys`
SET `status` = 'completed',
    `attempts` = 1
WHERE `processed_at` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `checkout_idempotency` (
  `key` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'processing',
  `response_json` text,
  `expires_at` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_checkout_idempotency_expires_at` ON `checkout_idempotency` (`expires_at`);
--> statement-breakpoint
ALTER TABLE `failed_jobs` ADD COLUMN `source_message_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_failed_jobs_source_message_id` ON `failed_jobs` (`source_message_id`);