-- Seed script for local development
INSERT INTO admin_users (id, email, name, role, status)
VALUES 
  ('admin-local-1', 'admin@tanhdev.com', 'Local Admin', 'superadmin', 'active'),
  ('admin-local-2', 'admin@aura.store', 'Aura Admin', 'editor', 'active');

INSERT INTO customers (id, email, first_name, last_name, status)
VALUES
  ('cust-local-1', 'customer@tanhdev.com', 'Local', 'Customer', 'active'),
  ('cust-local-2', 'customer@aura.store', 'Aura', 'Customer', 'active');

INSERT INTO categories (id, name, slug)
VALUES
  ('cat-1', 'Electronics', 'electronics'),
  ('cat-2', 'Apparel', 'apparel');

INSERT INTO products (id, sku, title, slug, regular_price, status, primary_category_id)
VALUES
  ('prod-1', 'TEST-IPHONE-15', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 119900, 'published', 'cat-1'),
  ('prod-2', 'TEST-TSHIRT', 'Aura T-Shirt', 'aura-t-shirt', 2900, 'published', 'cat-2');


