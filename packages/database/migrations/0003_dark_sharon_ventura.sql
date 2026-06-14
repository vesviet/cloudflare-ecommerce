ALTER TABLE cms_entries ADD `placement` text;--> statement-breakpoint
ALTER TABLE cms_entries ADD `expires_at` integer;--> statement-breakpoint
CREATE INDEX `idx_cms_entries_placement` ON `cms_entries` (`placement`);