-- Phase 2A: Laravel-shape promotion rules engine.
-- The existing `promotion_rules` table (0011/0013) was a dead coupon-targeting
-- schema with no readers — replaced by the engine shape below.

DROP TABLE IF EXISTS `promotion_rules`;

CREATE TABLE `promotion_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rule_type` text NOT NULL DEFAULT 'cart_rule',
	`action_type` text NOT NULL,
	`action_value` real NOT NULL DEFAULT 0,
	`max_discount_amount` integer,
	`conditions_json` text DEFAULT '{}',
	`target_customer_tier` text DEFAULT 'all',
	`usage_limit` integer,
	`usage_limit_per_user` integer DEFAULT 1,
	`times_used` integer NOT NULL DEFAULT 0,
	`priority` integer NOT NULL DEFAULT 0,
	`stop_further_rules` integer NOT NULL DEFAULT 0,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_promo_rules_active` ON `promotion_rules` (`rule_type`,`status`,`priority`);
--> statement-breakpoint
CREATE TABLE `promotion_usages` (
	`id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	`kind` text NOT NULL DEFAULT 'rule',
	`customer_id` text,
	`email` text,
	`order_id` text NOT NULL,
	`discount_amount` integer NOT NULL DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_promo_usages_promotion` ON `promotion_usages` (`promotion_id`,`customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_promo_usages_order` ON `promotion_usages` (`order_id`);
