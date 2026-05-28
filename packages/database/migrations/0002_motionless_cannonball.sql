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

CREATE UNIQUE INDEX `cms_entries_slug_unique` ON `cms_entries` (`slug`);