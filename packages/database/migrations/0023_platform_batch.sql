-- Phase 3 remainder + 4b + 5 + 6 platform batch.

CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'subscribed',
	`source` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`unsubscribed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_email_unique` ON `newsletter_subscribers` (`email`);
--> statement-breakpoint
ALTER TABLE `cms_entries` ADD COLUMN `clicks` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referral_code` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_referral_code_unique` ON `customers` (`referral_code`);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referred_by` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referral_awarded` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `two_factor_secret` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `two_factor_enabled` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `recovery_codes_json` text DEFAULT '[]';
--> statement-breakpoint
-- REV-05 parity columns for the dedicated review storage
ALTER TABLE `product_reviews` ADD COLUMN `helpful_count` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `images_json` text DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `pros` text;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `cons` text;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `seller_response` text;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `moderated_by` text;
--> statement-breakpoint
ALTER TABLE `product_reviews` ADD COLUMN `moderated_at` integer;
--> statement-breakpoint
-- One-time backfill: runtime reviews move from cms_entries to product_reviews.
INSERT INTO `product_reviews` (`id`, `product_id`, `customer_id`, `rating`, `comment`, `status`, `verified_purchase`, `created_at`)
SELECT e.id, e.placement, json_extract(e.metadata_json, '$.customer_id'),
       CAST(json_extract(e.metadata_json, '$.rating') AS integer),
       json_extract(e.metadata_json, '$.comment'),
       COALESCE(json_extract(e.metadata_json, '$.status'), 'pending'),
       COALESCE(json_extract(e.metadata_json, '$.verified_purchase'), 0),
       e.created_at
FROM cms_entries e
WHERE e.type = 'review' AND json_extract(e.metadata_json, '$.rating') IS NOT NULL;
--> statement-breakpoint
DELETE FROM `cms_entries` WHERE `type` = 'review';
