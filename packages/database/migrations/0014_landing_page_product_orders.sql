ALTER TABLE `orders` ADD COLUMN `source` text DEFAULT 'storefront';
ALTER TABLE `orders` ADD COLUMN `landing_page_id` text;
ALTER TABLE `landing_page_leads` ADD COLUMN `order_id` text REFERENCES `orders`(`id`);
ALTER TABLE `landing_page_leads` ADD COLUMN `selected_variants_json` text;
