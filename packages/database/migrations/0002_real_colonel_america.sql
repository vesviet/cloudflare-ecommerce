ALTER TABLE settings ADD `type` text DEFAULT 'string' NOT NULL;
INSERT OR REPLACE INTO settings (key, value, type, description) VALUES ('checkout-v2', 'true', 'boolean', 'Bật luồng Checkout V2');
INSERT OR REPLACE INTO settings (key, value, type, description) VALUES ('marketing_banner_enabled', 'false', 'boolean', 'Bật/tắt Banner quảng cáo');
INSERT OR REPLACE INTO settings (key, value, type, description) VALUES ('flat_shipping_fee', '999', 'number', 'Phí ship mặc định (cents)');