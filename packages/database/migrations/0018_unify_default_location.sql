-- Unify the default inventory location: admin product writes used 'loc_default'
-- while storefront checkout and the InventoryLockManagerDO use 'loc-1'.
-- Merge any stock recorded under 'loc_default' into 'loc-1', then retire it.

INSERT OR IGNORE INTO `locations` (`id`, `name`, `type`) VALUES ('loc-1', 'Main Warehouse', 'warehouse');

-- Move rows whose product has no loc-1 row yet
INSERT INTO `inventory_levels` (`id`, `location_id`, `product_id`, `stock_quantity`)
SELECT lower(hex(randomblob(16))), 'loc-1', il.product_id, il.stock_quantity
FROM `inventory_levels` il
WHERE il.location_id = 'loc_default'
  AND NOT EXISTS (
    SELECT 1 FROM `inventory_levels` t
    WHERE t.location_id = 'loc-1' AND t.product_id = il.product_id
  );

-- Merge quantities into existing loc-1 rows
UPDATE `inventory_levels`
SET stock_quantity = stock_quantity + (
  SELECT il.stock_quantity FROM `inventory_levels` il
  WHERE il.location_id = 'loc_default' AND il.product_id = inventory_levels.product_id
)
WHERE location_id = 'loc-1'
  AND EXISTS (
    SELECT 1 FROM `inventory_levels` il
    WHERE il.location_id = 'loc_default' AND il.product_id = inventory_levels.product_id
  );

DELETE FROM `inventory_levels` WHERE location_id = 'loc_default';
DELETE FROM `locations` WHERE id = 'loc_default';
