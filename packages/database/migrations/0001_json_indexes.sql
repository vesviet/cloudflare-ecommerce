-- Flatten Catalog Migration: JSON Indexes for frequently queried flat attributes
CREATE INDEX IF NOT EXISTS idx_products_attr_color ON products (json_extract(attributes_json, '$.Color'));
CREATE INDEX IF NOT EXISTS idx_products_attr_ram ON products (json_extract(attributes_json, '$.RAM'));
CREATE INDEX IF NOT EXISTS idx_products_attr_size ON products (json_extract(attributes_json, '$.Size'));
