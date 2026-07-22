CREATE TABLE `landing_page_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`landing_page_id` text,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_address` text,
	`customer_note` text,
	`selected_combo_id` text,
	`selected_colors_json` text,
	`selected_sizes_json` text,
	`total_amount` integer NOT NULL,
	`utm_source` text,
	`utm_campaign` text,
	`utm_content` text,
	`sync_status` text DEFAULT 'pending',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`landing_page_id`) REFERENCES `landing_pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL DEFAULT '',
	`slug` text NOT NULL,
	`product_id` text,
	`seo_title` text,
	`seo_description` text,
	`status` text DEFAULT 'published',
	`facebook_pixel_id` text,
	`tiktok_pixel_id` text,
	`urgency_end_time` text,
	`urgency_fake_views` integer DEFAULT 0,
	`combo_rules_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);