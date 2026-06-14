-- 0006_migrate_data.sql
-- Custom Data Migration Script for Big Bang PIM Refactor
-- Migrates stock, price, and images from products table to new tables BEFORE columns are dropped.

-- 1. Create Default Warehouse
INSERT INTO `locations` (`id`, `name`, `type`) VALUES ('loc_default', 'Main Warehouse', 'warehouse');

-- 2. Create Default Base Price List
INSERT INTO `price_lists` (`id`, `name`, `type`, `currency`) VALUES ('pl_base', 'Base Prices', 'base', 'USD');

-- 3. Migrate Inventory
INSERT INTO `inventory_levels` (`id`, `location_id`, `product_id`, `stock_quantity`)
SELECT 
  lower(hex(randomblob(16))), 
  'loc_default', 
  `id`, 
  COALESCE(`stock_quantity`, 0)
FROM `products`;

-- 4. Migrate Regular Prices
INSERT INTO `price_list_items` (`id`, `price_list_id`, `product_id`, `price`)
SELECT 
  lower(hex(randomblob(16))), 
  'pl_base', 
  `id`, 
  `regular_price`
FROM `products`
WHERE `regular_price` IS NOT NULL;

-- 5. Migrate Assets (Images) - Extract unique URLs
INSERT INTO `assets` (`id`, `r2_key`, `url`, `alt_text`)
SELECT 
  lower(hex(randomblob(16))), 
  img.url, 
  img.url, 
  'Migrated product image'
FROM (
  SELECT DISTINCT json_each.value as url
  FROM `products`, json_each(`products`.`images_json`)
  WHERE `products`.`images_json` IS NOT NULL AND `products`.`images_json` != '[]'
) img;

-- 6. Link Product Assets
INSERT INTO `product_assets` (`id`, `product_id`, `asset_id`, `position`)
SELECT 
  lower(hex(randomblob(16))),
  p.id,
  a.id,
  0
FROM `products` p
JOIN `assets` a ON a.url IN (SELECT value FROM json_each(p.images_json))
WHERE p.images_json IS NOT NULL AND p.images_json != '[]';
