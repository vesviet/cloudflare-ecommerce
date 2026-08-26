-- T3.2 (AUTH-03): per-account brute-force lockout, mirroring Laravel's
-- customer provider (5 failures -> 15-minute lock).

ALTER TABLE `customers` ADD COLUMN `failed_login_attempts` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `locked_until` integer;
