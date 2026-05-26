-- Migration number: 0000 	 2026-05-26T00:00:00.000Z

-- Tắt foreign keys tạm thời để tạo bảng
PRAGMA foreign_keys = OFF;

-- Bảng Customers
CREATE TABLE customers (
  id TEXT PRIMARY KEY, -- UUID v4
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 Virtual Table cho tính năng Search tốc độ cao
CREATE VIRTUAL TABLE products_search USING fts5(
  title, 
  description, 
  content='products', 
  content_rowid='id'
);

-- Bảng Product Variations (Chứa số lượng Tồn Kho - Stock)
CREATE TABLE product_variations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0), -- Đảm bảo không bao giờ âm kho
  attributes_json TEXT, -- Lưu màu sắc, size dạng JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY, -- UUID v4 chống brute-force
  customer_id TEXT, -- Có thể NULL nếu là Guest Checkout
  guest_email TEXT, -- Lưu email nếu mua dưới dạng Guest
  status TEXT DEFAULT 'pending_payment', -- pending_payment, processing, completed, cancelled, refunded
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_fee DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT UNIQUE, -- Nhận từ Stripe
  affiliate_id TEXT, -- ID của Affiliate partner (nếu có)
  utm_source TEXT,
  shipping_address_json TEXT NOT NULL,
  billing_address_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Bảng Order Items
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  variation_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (variation_id) REFERENCES product_variations(id)
);

-- Trigger cập nhật FTS5 khi có thêm sản phẩm mới
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_search(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_search(products_search, rowid, title, description) VALUES ('delete', old.rowid, old.title, old.description);
END;

CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_search(products_search, rowid, title, description) VALUES ('delete', old.rowid, old.title, old.description);
  INSERT INTO products_search(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

PRAGMA foreign_keys = ON;
