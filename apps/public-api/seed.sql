-- Seed script for local development
INSERT OR REPLACE INTO admin_users (id, email, name, role, status)
VALUES 
  ('admin-local-1', 'admin@tanhdev.com', 'Local Admin', 'superadmin', 'active'),
  ('admin-local-2', 'admin@aura.store', 'Aura Admin', 'editor', 'active'),
  ('admin-local-3', 'admin@local.dev', 'Dev Admin', 'superadmin', 'active');

INSERT OR REPLACE INTO customers (id, email, first_name, last_name, status)
VALUES
  ('cust-local-1', 'customer@tanhdev.com', 'Local', 'Customer', 'active'),
  ('cust-local-2', 'customer@aura.store', 'Aura', 'Customer', 'active');

INSERT OR REPLACE INTO categories (id, name, slug)
VALUES
  ('cat-1', 'Electronics', 'electronics'),
  ('cat-2', 'Apparel', 'apparel');

INSERT OR REPLACE INTO products (id, sku, title, slug, status, primary_category_id)
VALUES
  ('prod-1', 'TEST-IPHONE-15', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'published', 'cat-1'),
  ('prod-2', 'TEST-TSHIRT', 'Aura T-Shirt', 'aura-t-shirt', 'published', 'cat-2'),
  ('prod-3', 'TEST-HOODIE', 'Aura Premium Hoodie', 'aura-premium-hoodie', 'published', 'cat-2');

INSERT OR REPLACE INTO price_lists (id, name, type, currency) VALUES ('pl_base', 'Base Price', 'base', 'USD');
INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price) VALUES 
  ('pli-1', 'pl_base', 'prod-1', 119900),
  ('pli-2', 'pl_base', 'prod-2', 2900),
  ('pli-3', 'pl_base', 'prod-3', 6900);

INSERT OR REPLACE INTO locations (id, name, type) VALUES ('loc-1', 'Main Warehouse', 'warehouse');
INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES 
  ('inv-1', 'loc-1', 'prod-1', 100),
  ('inv-2', 'loc-1', 'prod-2', 500),
  ('inv-3', 'loc-1', 'prod-3', 200);


