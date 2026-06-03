/*
 SQLite does not support "Changing existing column type" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_product_variations_stock` ON `product_variations` (`stock`);--> statement-breakpoint
CREATE INDEX `idx_products_status` ON `products` (`status`);