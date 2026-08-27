-- =============================================================================
-- Sober Furniture seed (ported from Laravel 13.8 reference seeders)
-- Target schema: packages/database/src/schema.ts (migration 0024)
-- Usage:  pnpm exec wrangler d1 execute ecommerce-db --local --file=seed.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADMIN USERS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO admin_users (id, email, name, role, status)
VALUES
  ('admin-local-1', 'admin@tanhdev.com', 'Local Admin', 'superadmin', 'active'),
  ('admin-local-2', 'admin@aura.store', 'Aura Admin', 'editor', 'active'),
  ('admin-local-3', 'admin@local.dev', 'Dev Admin', 'superadmin', 'active'),
  ('admin-sober-1', 'admin@example.com', 'Admin Sober', 'superadmin', 'active');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO customers (id, email, first_name, last_name, phone, status, email_verified, referral_code, accepts_marketing)
VALUES
  ('cust-local-1', 'customer@tanhdev.com', 'Local', 'Customer', '0900000001', 'active', 1, 'REF-LOCAL-1', 0),
  ('cust-local-2', 'customer@aura.store', 'Aura', 'Customer', '0900000002', 'active', 1, 'REF-LOCAL-2', 0),
  ('cust-sober-1', 'customer@example.com', 'Nguyễn Văn', 'An', '0901234567', 'active', 1, 'REF-NVA-001', 1),
  ('cust-sober-2', 'demo@example.com', 'Trần Thị', 'Mai', '0912345678', 'active', 1, 'REF-TTM-002', 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO categories (id, slug, name, description, image_url, sort_order, is_visible, meta_title, meta_description)
VALUES
  -- Existing
  ('cat-1', 'electronics', 'Electronics', NULL, NULL, 0, 1, NULL, NULL),
  ('cat-2', 'apparel', 'Apparel', NULL, NULL, 0, 1, NULL, NULL),
  -- Sober Furniture categories
  ('cat-armchair', 'ghe-armchair', 'Ghế & Armchair', 'Các mẫu ghế ăn gỗ sồi, ghế thư giãn bọc da cao cấp phong cách Bắc Âu.', NULL, 1, 1, 'Ghế & Armchair Bắc Âu — Sober Furniture', 'Các mẫu ghế ăn gỗ sồi, ghế thư giãn bọc da cao cấp phong cách Bắc Âu.'),
  ('cat-tables', 'ban-tra-ban-an', 'Bàn Trà & Bàn Ăn', 'Bàn làm việc, bàn trà tròn, bàn ăn gỗ tự nhiên thiết kế tối giản.', NULL, 2, 1, 'Bàn Trà & Bàn Ăn Bắc Âu — Sober Furniture', 'Bàn làm việc, bàn trà tròn, bàn ăn gỗ tự nhiên thiết kế tối giản.'),
  ('cat-lamps', 'den-chieu-sang', 'Đèn Chiếu Sáng', 'Đèn thả trần nghệ thuật, đèn bàn xi măng và đèn sàn trang trí tinh tế.', NULL, 3, 1, 'Đèn Chiếu Sáng Bắc Âu — Sober Furniture', 'Đèn thả trần nghệ thuật, đèn bàn xi măng và đèn sàn trang trí tinh tế.'),
  ('cat-sofas', 'sofa-phong-khach', 'Sofa & Phòng Khách', 'Sofa đệm nỉ êm ái, sofa băng vải bố cao cấp chuẩn phong cách Scandinavian.', NULL, 4, 1, 'Sofa & Phòng Khách Bắc Âu — Sober Furniture', 'Sofa đệm nỉ êm ái, sofa băng vải bố cao cấp chuẩn phong cách Scandinavian.'),
  ('cat-accessories', 'phu-kien-trang-tri', 'Phụ Kiện Trang Trí', 'Đồng hồ treo tường, lọ gốm, khay gỗ và các vật phẩm decor không gian sống.', NULL, 5, 1, 'Phụ Kiện Trang Trí Bắc Âu — Sober Furniture', 'Đồng hồ treo tường, lọ gốm, khay gỗ và các vật phẩm decor không gian sống.'),
  ('cat-shelves', 'tu-ke-go', 'Tủ & Kệ Gỗ', 'Hệ thống kệ sách mở, tủ ngăn kéo gỗ tự nhiên tối ưu diện tích.', NULL, 6, 1, 'Tủ & Kệ Gỗ Bắc Âu — Sober Furniture', 'Hệ thống kệ sách mở, tủ ngăn kéo gỗ tự nhiên tối ưu diện tích.');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LOCATIONS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO locations (id, name, address, type)
VALUES
  ('loc-1', 'Main Warehouse', NULL, 'warehouse'),
  ('loc-2', 'HCM Showroom', '123 Nguyễn Huệ, Quận 1, TP. HCM', 'store'),
  ('loc-3', 'HN Showroom', '45 Tràng Tiền, Hoàn Kiếm, Hà Nội', 'store');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PRICE LISTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO price_lists (id, name, type, currency) VALUES
  ('pl_base', 'Base Price', 'base', 'VND'),
  ('pl_sale', 'Sale Price', 'sale', 'VND');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ASSETS (primary image per Sober Furniture product)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO assets (id, r2_key, url, alt_text, mime_type, size)
VALUES
  ('asset-ambit-1', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80', 'Đèn Thả Trần Ambit Pendant Lamp', 'image/jpeg', 0),
  ('asset-bottle-1', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6f12?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6f12?w=700&auto=format&fit=crop&q=80', 'Bộ Cối Xay Tiêu Bottle Grinders Set', 'image/jpeg', 0),
  ('asset-clock-1', 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=700&auto=format&fit=crop&q=80', 'Đồng Hồ Tối Giản Freakish Clock', 'image/jpeg', 0),
  ('asset-synnes-1', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80', 'Ghế Ăn Gỗ Sồi Synnes Dining Chair', 'image/jpeg', 0),
  ('asset-copenhague-1', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80', 'Bàn Làm Việc Copenhague Desk', 'image/jpeg', 0),
  ('asset-arte-1', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&auto=format&fit=crop&q=80', 'Ghế Đẩu Nghệ Thuật Arte 60 Stool', 'image/jpeg', 0),
  ('asset-cement-1', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80', 'Đèn Bàn Xi Măng Gỗ Cement Wood Lamp', 'image/jpeg', 0),
  ('asset-outline-1', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80', 'Sofa Băng Vải Nỉ Outline Sofa', 'image/jpeg', 0),
  ('asset-piggy-1', 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&auto=format&fit=crop&q=80', 'Heo Gốm Tiết Kiệm Wood Piggy Bank', 'image/jpeg', 0),
  ('asset-tribeca-1', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80', 'Đèn Bàn Cổ Điển Tribeca Reade Table Lamp', 'image/jpeg', 0),
  ('asset-togo-1', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80', 'Ly Giữ Nhiệt Cao Cấp To Go Cup', 'image/jpeg', 0),
  ('asset-around-1', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80', 'Bàn Trà Tròn Gỗ Walnut Around Coffee Table', 'image/jpeg', 0),
  ('asset-doze-1', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80', 'Ghế Bành Thư Giãn Doze Lounge Chair', 'image/jpeg', 0),
  ('asset-compile-1', 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=700&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=700&auto=format&fit=crop&q=80', 'Hệ Kệ Sách Khung Gỗ Compile Shelving System', 'image/jpeg', 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────

-- 7a. Existing legacy products (keep for test compat)
INSERT OR REPLACE INTO products (id, slug, sku, title, status, primary_category_id, type, is_purchasable, is_visible, weight, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES
  ('prod-1', 'iphone-15-pro-max', 'TEST-IPHONE-15', 'iPhone 15 Pro Max', 'published', 'cat-1', 'simple', 1, 1, 0.2, '{}', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-2', 'aura-t-shirt', 'TEST-TSHIRT', 'Aura T-Shirt', 'published', 'cat-2', 'simple', 1, 1, 0.15, '{}', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-3', 'aura-premium-hoodie', 'TEST-HOODIE', 'Aura Premium Hoodie', 'published', 'cat-2', 'simple', 1, 1, 0.4, '{}', '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7b. Sober Furniture products
-- 7b.1 Đèn Thả Trần Ambit Pendant Lamp
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-ambit',
  'ambit-pendant-lamp',
  'LMP-001',
  'Đèn Thả Trần Ambit Pendant Lamp',
  'Đèn thả trần Bắc Âu tối giản, chao nhôm nguyên khối sơn tĩnh điện, ánh sáng ấm cúng.',
  'Đèn thả trần Ambit Pendant Lamp mang thiết kế tối giản kinh điển của vùng Bắc Âu. Chao đèn được dập bằng nhôm nguyên khối, phủ sơn tĩnh điện mờ chống bám vân tay, cho ánh sáng ấm cúng lan tỏa đều khắp không gian bàn ăn hoặc đảo bếp.',
  'simple', 1.8, 'published', 1, 1, 'cat-lamps',
  '2026-08-09 10:00:00',
  'Đèn Thả Trần Ambit Pendant Lamp — Sober Furniture',
  'Đèn thả trần Ambit Pendant Lamp phong cách Bắc Âu tối giản chất liệu nhôm nguyên khối.',
  'đèn thả, pendant lamp, bắc âu, scandinavian, aluminum',
  '{"primary_image":"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=700&auto=format&fit=crop&q=80"],"color":["Trắng Mờ (Matte White)","Xám Tro (Ash Gray)","Đen Tuyển (Matte Black)"],"material":"Nhôm nguyên khối sơn tĩnh điện","dimensions":"Đường kính 40cm, Dây treo 300cm"}',
  '["đèn thả","pendant","scandinavian","nhôm"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.2 Bộ Cối Xay Tiêu Bottle Grinders Set
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-bottle',
  'bottle-grinders-set',
  'ACC-002',
  'Bộ Cối Xay Tiêu Bottle Grinders Set',
  'Bộ cối xay muối tiêu hình bình nước, lõi gốm siêu bền, vỏ silicon chống trượt.',
  'Bộ đôi cối xay muối tiêu hình dáng bình nước độc đáo. Lõi xay gốm siêu bền, nắp xoay điều chỉnh độ mịn linh hoạt, vỏ silicon mịn chống trượt giúp căn bếp luôn ngăn nắp và hiện đại.',
  'simple', 0.6, 'published', 1, 1, 'cat-accessories',
  '2026-08-09 10:00:00',
  'Bộ Cối Xay Tiêu Bottle Grinders Set — Sober Furniture',
  'Bộ cối xay muối tiêu cao cấp thiết kế Bắc Âu tối giản cho căn bếp sang trọng.',
  'cối xay, bottle grinders, bắc âu, silicon, ceramic',
  '{"primary_image":"https://images.unsplash.com/photo-1584990347449-399a9a3b6f12?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1590736969955-71cc94801759?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1584990347449-399a9a3b6f12?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1590736969955-71cc94801759?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80"],"color":["Set Hồng Đất & Nâu","Set Xám & Trắng"],"material":"Lõi gốm sứ Ceramic, nắp gỗ sồi, vỏ silicon cao cấp"}',
  '["phụ kiện bếp","cối xay","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.3 Đồng Hồ Tối Giản Freakish Clock
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-clock',
  'freakish-clock',
  'ACC-003',
  'Đồng Hồ Tối Giản Freakish Clock',
  'Đồng hồ treo tường thiết kế đĩa xoay không kim, điểm nhấn nghệ thuật cho không gian.',
  'Đồng hồ treo tường Freakish Clock với thiết kế đĩa xoay hiển thị giờ độc nhất vô nhị. Thiết kế không kim truyền thống giúp tạo điểm nhấn nghệ thuật trên các mảng tường phòng khách hay phòng làm việc.',
  'simple', 0.8, 'published', 1, 1, 'cat-accessories',
  '2026-08-09 10:00:00',
  'Đồng Hồ Treo Tường Freakish Clock — Sober Furniture',
  'Đồng hồ treo tường nghệ thuật phong cách tối giản Bắc Âu.',
  'đồng hồ, freakish clock, bắc âu, thép, decor',
  '{"primary_image":"https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&auto=format&fit=crop&q=80"],"color":["Vàng Mù Tạt","Đen Tuyển","Trắng Băng"],"material":"Thép không gỉ sơn tĩnh điện","dimensions":"Đường kính 30cm, Độ dày 4cm"}',
  '["đồng hồ","decor","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.4 Ghế Ăn Gỗ Sồi Synnes Dining Chair
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-synnes',
  'synnes-dining-chair',
  'CHR-004',
  'Ghế Ăn Gỗ Sồi Synnes Dining Chair',
  'Ghế ăn gỗ sồi Bắc Mỹ nguyên khối, tựa lưng uốn cong, kết cấu chịu lực vững chãi.',
  'Ghế ăn Synnes Dining Chair kết hợp giữa kỹ thuật uốn cong gỗ thủ công và kết cấu khung chịu lực vững chãi. Tựa lưng ôm sát cơ thể mang đến cảm giác ngồi thoải mái suốt bữa ăn gia đình.',
  'configurable', 4.5, 'published', 1, 1, 'cat-armchair',
  '2026-08-09 10:00:00',
  'Ghế Ăn Gỗ Sồi Synnes Dining Chair — Sober Furniture',
  'Ghế ăn gỗ sồi tự nhiên Synnes Dining Chair phong cách Bắc Âu tinh tế.',
  'ghế ăn, synnes, gỗ sồi, oak, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1503602642458-232111445657?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=700&auto=format&fit=crop&q=80"],"color":["Gỗ Sồi Tự Nhiên (Natural Oak)","Gỗ Óc Chó (Walnut Dark)","Đen Sơn Mờ (Stained Black)"],"material":"Gỗ sồi nhập khẩu Bắc Mỹ nguyên khối","dimensions":"Dài 47.5cm x Rộng 48.5cm x Cao 80cm (Chiều cao ngồi 45cm)"}',
  '["ghế","gỗ sồi","dining","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.5 Bàn Làm Việc Copenhague Desk
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-copenhague',
  'copenhague-desk',
  'DSK-005',
  'Bàn Làm Việc Copenhague Desk',
  'Bàn làm việc gỗ sồi Bắc Âu, chân chữ A, khe luồn dây cáp ẩn tinh tế.',
  'Bàn làm việc Copenhague Desk lấy cảm hứng từ nội thất trường đại học Đan Mạch. Mặt bàn gỗ sồi vát cạnh thanh thoát, chân chữ A chắc chắn, tích hợp khe luồn dây cáp ẩn tinh tế.',
  'simple', 18.0, 'published', 1, 1, 'cat-tables',
  '2026-08-09 10:00:00',
  'Bàn Làm Việc Copenhague Desk — Sober Furniture',
  'Bàn làm việc gỗ sồi Bắc Âu tối giản Copenhague Desk.',
  'bàn làm việc, copenhague, gỗ sồi, desk, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80"],"color":["Mặt Linoleum Xám Khói - Chân Sồi","Mặt Gỗ Sồi Tự Nhiên"],"material":"Khung gỗ sồi khối, mặt phủ linoleum chống xước","dimensions":"Dài 130cm x Rộng 65cm x Cao 74cm"}',
  '["bàn","desk","gỗ sồi","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.6 Ghế Đẩu Nghệ Thuật Arte 60 Stool
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-arte',
  'arte-60-stool',
  'CHR-006',
  'Ghế Đẩu Nghệ Thuật Arte 60 Stool',
  'Ghế đẩu 3 chân Alvar Aalto, gỗ bạch dương uốn nhiệt, xếp chồng đa năng.',
  'Mẫu ghế đẩu tròn 3 chân kinh điển của kiến trúc hiện đại Phần Lan do Alvar Aalto thiết kế. Cấu trúc chân chữ L uốn nhiệt dẻo kết hợp mặt đẩu tròn thanh thoát, dễ dàng xếp chồng nhiều chiếc tạo thành một tác phẩm điêu khắc xoắn ốc tuyệt đẹp.',
  'configurable', 3.2, 'published', 1, 1, 'cat-armchair',
  '2026-08-09 10:00:00',
  'Ghế Đẩu Tròn Arte 60 Stool — Sober Furniture',
  'Ghế đẩu gỗ 3 chân Arte 60 Stool xếp chồng tiện dụng chuẩn phong cách Bắc Âu.',
  'ghế đẩu, arte 60, alvar aalto, bạch dương, stool',
  '{"primary_image":"https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1503602642458-232111445657?w=900&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1503602642458-232111445657?w=900&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&auto=format&fit=crop&q=80"],"album":[{"url":"https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200&auto=format&fit=crop&q=80","tag":"Phòng Khách Tối Giản","title":"Ghế Đẩu Arte 60 Trong Không Gian Mở","caption":"Đường cong chân chữ L kinh điển tôn vinh vẻ đẹp thuần khiết của vân gỗ bạch dương tự nhiên."},{"url":"https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&auto=format&fit=crop&q=80","tag":"Gia Công Thủ Công","title":"Khớp Nối Uốn Nhiệt Dẻo Độc Bản","caption":"Kỹ thuật uốn ép gỗ bằng hơi nước độc quyền giữ kết cấu bền bỉ qua hàng thập kỷ sử dụng."}],"color":["Gỗ Bạch Dương Tự Nhiên","Mặt Cam San Hô","Mặt Đen Tuyển"],"material":"Gỗ dán bạch dương Phần Lan uốn nhiệt dẻo cao cấp","dimensions":"Đường kính mặt 38cm, Chiều cao 44cm, Trọng lượng 3.2kg","origin":"Thiết kế Scandinavian Nordic, Gia công tiêu chuẩn xuất khẩu EU"}',
  '["ghế","stool","arte 60","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.7 Đèn Bàn Xi Măng Gỗ Cement Wood Lamp
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-cement',
  'cement-wood-lamp',
  'LMP-007',
  'Đèn Bàn Xi Măng Gỗ Cement Wood Lamp',
  'Đèn bàn trang trí đế bê tông đúc kết hợp thân gỗ sồi, chao vải lanh thô.',
  'Sự kết hợp thô mộc giữa chân đế bê tông đúc khuôn và thân gỗ sồi ấm áp. Chao đèn vải lanh thô lọc ánh sáng dịu mắt, hoàn hảo làm đèn đọc sách đầu giường hoặc bàn làm việc.',
  'simple', 2.4, 'published', 1, 1, 'cat-lamps',
  '2026-08-09 10:00:00',
  'Đèn Bàn Xi Măng Gỗ Cement Wood Lamp — Sober Furniture',
  'Đèn bàn trang trí đế bê tông kết hợp gỗ tự nhiên.',
  'đèn bàn, cement wood, bê tông, linen, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80"],"color":["Bê Tông Xám Sáng","Bê Tông Than Chì"],"material":"Chân bê tông đúc, khớp gỗ sồi, chao vải linen","dimensions":"Cao 45cm, Đường kính chao 25cm"}',
  '["đèn bàn","cement","bê tông","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.8 Sofa Băng Vải Nỉ Outline Sofa
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, compare_at_price, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-outline',
  'outline-sofa-nordic',
  'SFA-008',
  'Sofa Băng Vải Nỉ Outline Sofa',
  'Sofa băng 3 chỗ Bắc Âu, đệm mút D40, vải nỉ dệt thô cao cấp, tựa tay mỏng thanh thoát.',
  'Sofa băng 3 chỗ Outline Sofa mang đường nét thanh mảnh, hiện đại với phần tựa tay mỏng tạo cảm giác thanh thoát cho phòng khách. Đệm mút D40 êm ái đàn hồi cao kết hợp vải nỉ dệt thô cao cấp.',
  'simple', 45.0, 'published', 1, 1, 'cat-sofas',
  '2026-08-09 10:00:00',
  32000000,
  'Sofa Băng Vải Nỉ Bắc Âu Outline Sofa — Sober Furniture',
  'Sofa băng 3 chỗ phong cách Scandinavian sang trọng.',
  'sofa, outline, nỉ, phòng khách, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80"],"color":["Xám Lông Chuột (Dark Gray)","Xanh Rêu Bắc Âu (Moss Green)","Màu Be Cát (Sand Beige)"],"material":"Khung gỗ thông tự nhiên, chân nhôm đúc, vải nỉ bọc cao cấp","dimensions":"Dài 220cm x Sâu 84cm x Cao 71cm"}',
  '["sofa","phòng khách","nỉ","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.9 Heo Gốm Tiết Kiệm Wood Piggy Bank
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-piggy',
  'wood-piggy-bank',
  'ACC-009',
  'Heo Gốm Tiết Kiệm Wood Piggy Bank',
  'Ống heo gốm men bóng kết hợp nút gỗ sồi, điêu khắc tối giản Scandinavian.',
  'Ống heo tiết kiệm bằng gốm phủ men bóng kết hợp nút gỗ sồi tự nhiên. Thiết kế điêu khắc tối giản như một tác phẩm nghệ thuật trưng bày trên kệ sách hay bàn làm việc.',
  'simple', 0.5, 'published', 1, 1, 'cat-accessories',
  '2026-08-22 10:00:00',
  'Heo Gốm Tiết Kiệm Wood Piggy Bank — Sober Furniture',
  'Ống tiết kiệm gốm decor phong cách Scandinavian.',
  'heo gốm, piggy bank, decor, gốm sứ, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=700&auto=format&fit=crop&q=80"],"color":["Gốm Trắng Men Mờ","Gốm Nâu Đất Nung"],"material":"Gốm nung nhiệt độ cao, nút cao su bọc gỗ sồi"}',
  '["phụ kiện","gốm","decor","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.10 Đèn Bàn Cổ Điển Tribeca Reade Table Lamp
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-tribeca',
  'tribeca-reade-table-lamp',
  'LMP-010',
  'Đèn Bàn Cổ Điển Tribeca Reade Table Lamp',
  'Đèn bàn kim loại New York 1930, chân uốn hình học, bóng Edison cổ điển.',
  'Đèn bàn kim loại lấy cảm hứng từ phong cách New York thập niên 1930. Thiết kế chân uốn hình học để lộ bóng đèn Edison cổ điển tạo hiệu ứng ánh sáng quyến rũ.',
  'simple', 1.5, 'published', 1, 1, 'cat-lamps',
  '2026-08-24 10:00:00',
  'Đèn Bàn Cổ Điển Tribeca Reade Table Lamp — Sober Furniture',
  'Đèn bàn kim loại đồng thau phong cách cổ điển sang trọng.',
  'đèn bàn, tribeca, đồng thau, edison, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80"],"color":["Đồng Thau Đánh Bóng (Brass)","Thép Sơn Đen Nhám"],"material":"Đồng thau nguyên chất hoặc thép sơn tĩnh điện","dimensions":"Cao 34cm, Rộng 15cm"}',
  '["đèn bàn","tribeca","đồng thau","edison"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.11 Ly Giữ Nhiệt Cao Cấp To Go Cup
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-togo',
  'to-go-cup-minimal',
  'ACC-011',
  'Ly Giữ Nhiệt Cao Cấp To Go Cup',
  'Bình giữ nhiệt 2 lớp inox 304, nắp 360 độ, giữ nóng 8h lạnh 16h.',
  'Bình giữ nhiệt 2 lớp inox 304 phủ sơn tĩnh điện nhám. Nắp bật 360 độ cho phép uống từ bất kỳ góc nào mà không lo rò rỉ, giữ nhiệt nóng 8 giờ và lạnh 16 giờ.',
  'simple', 0.35, 'published', 1, 1, 'cat-accessories',
  '2026-08-20 10:00:00',
  'Ly Giữ Nhiệt To Go Cup — Sober Furniture',
  'Ly giữ nhiệt inox 304 tối giản phong cách Bắc Âu.',
  'ly giữ nhiệt, to go cup, inox 304, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1584990347449-399a9a3b6f12?w=700&auto=format&fit=crop&q=80"],"color":["Xanh Olive","Xám Đậm","Trắng Sữa"],"material":"Thép không gỉ 304, nắp nhựa PP không chứa BPA","capacity":"350ml"}',
  '["phụ kiện","ly giữ nhiệt","inox","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.12 Bàn Trà Tròn Gỗ Walnut Around Coffee Table
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-around',
  'around-coffee-table',
  'TBL-012',
  'Bàn Trà Tròn Gỗ Walnut Around Coffee Table',
  'Bàn sofa tròn gờ viền nâng, chân gỗ sồi thon gọn, tối ưu căn hộ hiện đại.',
  'Bàn sofa tròn Around Coffee Table có gờ viền nâng cao xung quanh giúp ngăn đồ vật rơi vỡ. Chân gỗ sồi thon gọn tạo khoảng thoáng bên dưới, rất thích hợp cho căn hộ hiện đại.',
  'simple', 9.5, 'published', 1, 1, 'cat-tables',
  '2026-08-18 10:00:00',
  'Bàn Trà Tròn Gỗ Walnut Around Coffee Table — Sober Furniture',
  'Bàn trà sofa tròn gỗ sồi tự nhiên phong cách tối giản.',
  'bàn trà, around, walnut, gỗ sồi, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80"],"color":["Gỗ Óc Chó (Walnut)","Gỗ Sồi Sáng (Light Oak)","Xám Tro"],"material":"Gỗ sồi uốn ép nhiệt phủ veneer óc chó","dimensions":"Đường kính 72cm, Cao 36cm"}',
  '["bàn trà","around","walnut","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.13 Ghế Bành Thư Giãn Doze Lounge Chair
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-doze',
  'doze-lounge-chair',
  'CHR-013',
  'Ghế Bành Thư Giãn Doze Lounge Chair',
  'Ghế thư giãn tựa lưng cao, chân thép thanh mảnh, sang trọng góc đọc sách.',
  'Ghế thư giãn Doze Lounge Chair kết hợp giữa phong cách hiện đại và sự tiện nghi tối đa. Tựa lưng cao ôm trọn cơ thể, chân thép thanh mảnh tạo nét sang trọng cho góc đọc sách.',
  'simple', 16.0, 'published', 1, 1, 'cat-armchair',
  '2026-08-24 10:00:00',
  'Ghế Bành Thư Giãn Doze Lounge Chair — Sober Furniture',
  'Ghế bành armchair thư giãn đọc sách cao cấp.',
  'ghế bành, doze, lounge chair, armchair, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=700&auto=format&fit=crop&q=80"],"color":["Vải Dạ Màu Be","Vải Nhung Xanh Đậm","Da Bò Cognac"],"material":"Khung thép đúc bọc mút định hình, chân thép sơn tĩnh điện","dimensions":"Dài 95cm x Rộng 100cm x Cao 106cm"}',
  '["ghế bành","lounge","doze","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- 7b.14 Hệ Kệ Sách Khung Gỗ Compile Shelving System
INSERT OR REPLACE INTO products (id, slug, sku, title, short_description, description, type, weight, status, is_purchasable, is_visible, primary_category_id, published_at, meta_title, meta_description, meta_keywords, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES (
  'prod-compile',
  'compile-shelving-system',
  'SHF-014',
  'Hệ Kệ Sách Khung Gỗ Compile Shelving System',
  'Kệ sách module gỗ sồi lắp ghép linh hoạt, đợt kệ sơn mờ sang trọng.',
  'Hệ thống kệ trang trí module Compile Shelving System cho phép lắp ghép và mở rộng linh hoạt theo chiều ngang và dọc. Khung gỗ sồi chắc chắn kết hợp đợt kệ sơn mờ sang trọng.',
  'simple', 22.0, 'published', 1, 1, 'cat-shelves',
  '2026-08-22 10:00:00',
  'Hệ Kệ Sách Khung Gỗ Compile Shelving — Sober Furniture',
  'Kệ sách trang trí module gỗ sồi tự nhiên cao cấp.',
  'kệ sách, compile, gỗ sồi, shelving, scandinavian',
  '{"primary_image":"https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=700&auto=format&fit=crop&q=80","secondary_image":"https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80","gallery":["https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&auto=format&fit=crop&q=80"],"color":["Trắng Sữa & Sồi","Xám Đậm & Sồi","Toàn Bộ Đen"],"material":"Gỗ sồi nhập khẩu và thép dập sơn tĩnh điện","dimensions":"Dài 120cm x Sâu 42cm x Cao 150cm"}',
  '["kệ sách","compile","shelving","scandinavian"]',
  '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PRODUCT ASSETS (link each Sober Furniture product to its primary image)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO product_assets (id, product_id, asset_id, position)
VALUES
  ('pa-ambit-1', 'prod-ambit', 'asset-ambit-1', 0),
  ('pa-bottle-1', 'prod-bottle', 'asset-bottle-1', 0),
  ('pa-clock-1', 'prod-clock', 'asset-clock-1', 0),
  ('pa-synnes-1', 'prod-synnes', 'asset-synnes-1', 0),
  ('pa-copenhague-1', 'prod-copenhague', 'asset-copenhague-1', 0),
  ('pa-arte-1', 'prod-arte', 'asset-arte-1', 0),
  ('pa-cement-1', 'prod-cement', 'asset-cement-1', 0),
  ('pa-outline-1', 'prod-outline', 'asset-outline-1', 0),
  ('pa-piggy-1', 'prod-piggy', 'asset-piggy-1', 0),
  ('pa-tribeca-1', 'prod-tribeca', 'asset-tribeca-1', 0),
  ('pa-togo-1', 'prod-togo', 'asset-togo-1', 0),
  ('pa-around-1', 'prod-around', 'asset-around-1', 0),
  ('pa-doze-1', 'prod-doze', 'asset-doze-1', 0),
  ('pa-compile-1', 'prod-compile', 'asset-compile-1', 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. PRODUCT VARIANTS (child products with parent_id)
-- ─────────────────────────────────────────────────────────────────────────────

-- Synnes Dining Chair variants
INSERT OR REPLACE INTO products (id, parent_id, slug, sku, title, type, status, is_purchasable, is_visible, weight, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES
  ('prod-synnes-oak', 'prod-synnes', 'synnes-dining-chair-oak', 'CHR-004-OAK', 'Ghế Ăn Synnes - Gỗ Sồi Tự Nhiên', 'simple', 'published', 1, 1, 4.5,
   '{"color":"Natural Oak","material":"Oak Wood","variant_name":"Gỗ Sồi Tự Nhiên (Natural Oak)"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-synnes-wal', 'prod-synnes', 'synnes-dining-chair-walnut', 'CHR-004-WAL', 'Ghế Ăn Synnes - Gỗ Óc Chó', 'simple', 'published', 1, 1, 4.5,
   '{"color":"Walnut Dark","material":"Walnut Wood","variant_name":"Gỗ Óc Chó (Walnut Dark)"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ambit Pendant Lamp variants
INSERT OR REPLACE INTO products (id, parent_id, slug, sku, title, type, status, is_purchasable, is_visible, weight, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES
  ('prod-ambit-wht', 'prod-ambit', 'ambit-pendant-lamp-white', 'LMP-001-WHT', 'Đèn Thả Ambit - Trắng Mờ', 'simple', 'published', 1, 1, 1.8,
   '{"color":"Matte White","variant_name":"Màu Trắng Mờ (Matte White)"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-ambit-blk', 'prod-ambit', 'ambit-pendant-lamp-black', 'LMP-001-BLK', 'Đèn Thả Ambit - Đen Tuyển', 'simple', 'published', 1, 1, 1.8,
   '{"color":"Matte Black","variant_name":"Màu Đen Tuyển (Matte Black)"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Arte 60 Stool variants
INSERT OR REPLACE INTO products (id, parent_id, slug, sku, title, type, status, is_purchasable, is_visible, weight, attributes_json, tags_json, metafields_json, created_at, updated_at)
VALUES
  ('prod-arte-birch', 'prod-arte', 'arte-60-stool-birch', 'CHR-006-BIRCH', 'Ghế Đẩu Arte 60 - Gỗ Bạch Dương', 'simple', 'published', 1, 1, 3.2,
   '{"color":"Gỗ Bạch Dương Tự Nhiên","variant_name":"Gỗ Bạch Dương Tự Nhiên","image":"https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&auto=format&fit=crop&q=80"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-arte-coral', 'prod-arte', 'arte-60-stool-coral', 'CHR-006-CORAL', 'Ghế Đẩu Arte 60 - Mặt Cam San Hô', 'simple', 'published', 1, 1, 3.2,
   '{"color":"Mặt Cam San Hô","variant_name":"Mặt Cam San Hô","image":"https://images.unsplash.com/photo-1503602642458-232111445657?w=900&auto=format&fit=crop&q=80"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod-arte-black', 'prod-arte', 'arte-60-stool-black', 'CHR-006-BLACK', 'Ghế Đẩu Arte 60 - Mặt Đen Tuyển', 'simple', 'published', 1, 1, 3.2,
   '{"color":"Mặt Đen Tuyển","variant_name":"Mặt Đen Tuyển","image":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&auto=format&fit=crop&q=80"}',
   '[]', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. PRICE LIST ITEMS
-- ─────────────────────────────────────────────────────────────────────────────

-- Existing legacy
INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price)
VALUES
  ('pli-1', 'pl_base', 'prod-1', 119900),
  ('pli-2', 'pl_base', 'prod-2', 2900),
  ('pli-3', 'pl_base', 'prod-3', 6900);

-- Sober Furniture (base prices in VND)
INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price)
VALUES
  ('pli-ambit', 'pl_base', 'prod-ambit', 4500000),
  ('pli-bottle', 'pl_base', 'prod-bottle', 1250000),
  ('pli-clock', 'pl_base', 'prod-clock', 2650000),
  ('pli-synnes', 'pl_base', 'prod-synnes', 5800000),
  ('pli-copenhague', 'pl_base', 'prod-copenhague', 14200000),
  ('pli-arte', 'pl_base', 'prod-arte', 3200000),
  ('pli-cement', 'pl_base', 'prod-cement', 2150000),
  ('pli-outline', 'pl_base', 'prod-outline', 28500000),
  ('pli-piggy', 'pl_base', 'prod-piggy', 950000),
  ('pli-tribeca', 'pl_base', 'prod-tribeca', 1980000),
  ('pli-togo', 'pl_base', 'prod-togo', 680000),
  ('pli-around', 'pl_base', 'prod-around', 8900000),
  ('pli-doze', 'pl_base', 'prod-doze', 18500000),
  ('pli-compile', 'pl_base', 'prod-compile', 16800000);

-- Variant prices
INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price)
VALUES
  ('pli-synnes-oak', 'pl_base', 'prod-synnes-oak', 5800000),
  ('pli-synnes-wal', 'pl_base', 'prod-synnes-wal', 6400000),
  ('pli-ambit-wht', 'pl_base', 'prod-ambit-wht', 4500000),
  ('pli-ambit-blk', 'pl_base', 'prod-ambit-blk', 4500000),
  ('pli-arte-birch', 'pl_base', 'prod-arte-birch', 3200000),
  ('pli-arte-coral', 'pl_base', 'prod-arte-coral', 3450000),
  ('pli-arte-black', 'pl_base', 'prod-arte-black', 3450000);

-- Sale price list for outline sofa (compare_at_price 32,000,000)
INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price)
VALUES
  ('pli-outline-sale', 'pl_sale', 'prod-outline', 28500000);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. INVENTORY LEVELS
-- ─────────────────────────────────────────────────────────────────────────────

-- Existing legacy
INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity)
VALUES
  ('inv-1', 'loc-1', 'prod-1', 100),
  ('inv-2', 'loc-1', 'prod-2', 500),
  ('inv-3', 'loc-1', 'prod-3', 200);

-- Sober Furniture (parent products)
INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity)
VALUES
  ('inv-ambit', 'loc-1', 'prod-ambit', 25),
  ('inv-bottle', 'loc-1', 'prod-bottle', 50),
  ('inv-clock', 'loc-1', 'prod-clock', 30),
  ('inv-synnes', 'loc-1', 'prod-synnes', 0),
  ('inv-copenhague', 'loc-1', 'prod-copenhague', 12),
  ('inv-arte', 'loc-1', 'prod-arte', 0),
  ('inv-cement', 'loc-1', 'prod-cement', 18),
  ('inv-outline', 'loc-1', 'prod-outline', 8),
  ('inv-piggy', 'loc-1', 'prod-piggy', 35),
  ('inv-tribeca', 'loc-1', 'prod-tribeca', 22),
  ('inv-togo', 'loc-1', 'prod-togo', 60),
  ('inv-around', 'loc-1', 'prod-around', 15),
  ('inv-doze', 'loc-1', 'prod-doze', 10),
  ('inv-compile', 'loc-1', 'prod-compile', 14);

-- HCM showroom additions for high-volume products
INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity)
VALUES
  ('inv-togo-hcm', 'loc-2', 'prod-togo', 20),
  ('inv-piggy-hcm', 'loc-2', 'prod-piggy', 10),
  ('inv-bottle-hcm', 'loc-2', 'prod-bottle', 15);

-- Variant inventory
INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity)
VALUES
  ('inv-synnes-oak', 'loc-1', 'prod-synnes-oak', 10),
  ('inv-synnes-wal', 'loc-1', 'prod-synnes-wal', 10),
  ('inv-ambit-wht', 'loc-1', 'prod-ambit-wht', 15),
  ('inv-ambit-blk', 'loc-1', 'prod-ambit-blk', 10),
  ('inv-arte-birch', 'loc-1', 'prod-arte-birch', 20),
  ('inv-arte-coral', 'loc-1', 'prod-arte-coral', 12),
  ('inv-arte-black', 'loc-1', 'prod-arte-black', 8);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PROVINCES (34 đơn vị hành chính cấp tỉnh theo Nghị quyết 202/2025/QH15)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO provinces (id, code, name)
VALUES
  ('prov-01', '01', 'Hà Nội'),
  ('prov-02', '02', 'Hải Phòng'),
  ('prov-03', '03', 'Đà Nẵng'),
  ('prov-04', '04', 'TP. Hồ Chí Minh'),
  ('prov-05', '05', 'Cần Thơ'),
  ('prov-06', '06', 'Huế'),
  ('prov-10', '10', 'Tuyên Quang'),
  ('prov-11', '11', 'Lào Cai'),
  ('prov-12', '12', 'Điện Biên'),
  ('prov-13', '13', 'Lai Châu'),
  ('prov-14', '14', 'Sơn La'),
  ('prov-15', '15', 'Cao Bằng'),
  ('prov-16', '16', 'Lạng Sơn'),
  ('prov-17', '17', 'Quảng Ninh'),
  ('prov-18', '18', 'Thái Nguyên'),
  ('prov-19', '19', 'Phú Thọ'),
  ('prov-20', '20', 'Bắc Ninh'),
  ('prov-21', '21', 'Hưng Yên'),
  ('prov-22', '22', 'Ninh Bình'),
  ('prov-23', '23', 'Thanh Hóa'),
  ('prov-24', '24', 'Nghệ An'),
  ('prov-25', '25', 'Hà Tĩnh'),
  ('prov-26', '26', 'Quảng Bình'),
  ('prov-27', '27', 'Bình Định'),
  ('prov-28', '28', 'Khánh Hòa'),
  ('prov-29', '29', 'Kon Tum'),
  ('prov-30', '30', 'Đắk Lắk'),
  ('prov-31', '31', 'Lâm Đồng'),
  ('prov-32', '32', 'Bình Phước'),
  ('prov-33', '33', 'Bình Dương'),
  ('prov-34', '34', 'Long An'),
  ('prov-35', '35', 'Bến Tre'),
  ('prov-36', '36', 'An Giang'),
  ('prov-37', '37', 'Vĩnh Long'),
  ('prov-38', '38', 'Kiên Giang');

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. BANNERS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO banners (id, position, title, eyebrow, subtitle, cta_text, image, link, open_in_new_tab, status, sort_order, clicks_count)
VALUES
  -- Hero Slider
  ('ban-hero-1', 'hero_slider', 'Bộ Sưu Tập Bắc Âu 2026', 'SCANDINAVIAN MINIMALISM',
   'Tinh hoa nội thất gỗ sồi tự nhiên mang đến vẻ đẹp tối giản, ấm cúng và trường tồn cho không gian sống hiện đại.',
   'Khám Phá Ngay',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop&q=80',
   '/catalog?category=living-room', 0, 'active', 1, 0),
  ('ban-hero-2', 'hero_slider', 'Đèn Thả & Ghế Thư Giãn Tinh Tế', 'PREMIUM LIGHTING & SEATING',
   'Ánh sáng dịu nhẹ và đường nét thanh thoát nâng tầm đẳng cấp căn phòng của bạn.',
   'Xem Bộ Sưu Tập',
   'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1600&auto=format&fit=crop&q=80',
   '/catalog?category=lighting', 0, 'active', 2, 0),
  -- Home Promo 2 Columns
  ('ban-promo-1', 'home_promo_2col', 'Ưu Đãi Mùa Hè 20%', 'SUMMER COLLECTION · BÀN ĂN',
   'Giảm giá đặc biệt cho các mẫu bàn ăn & ghế ăn gỗ tự nhiên. Giao hàng miễn phí toàn quốc.',
   'Khám Phá · SHOP NOW',
   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
   '/catalog?category=dining-room', 0, 'active', 1, 0),
  ('ban-promo-2', 'home_promo_2col', 'Ghế Thư Giãn Cao Cấp', 'PREMIUM SEATING · PHÒNG KHÁCH',
   'Nâng tầm không gian sống với đệm bọc da thật và khung gỗ tần bì nguyên khối nhập khẩu.',
   'Xem Ngay · SEE MORE',
   'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&auto=format&fit=crop&q=80',
   '/catalog?category=living-room', 0, 'active', 2, 0),
  -- Home Collection 3 Columns
  ('ban-col-1', 'home_collection_3col', 'Đồ Nội Thất Phòng Khách', 'CURATED · LIVING ROOM',
   'Sofa vải bố cao cấp, bàn trà tròn đôi và kệ tivi tối giản.',
   'SEE COLLECTIONS',
   'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&auto=format&fit=crop&q=80',
   '/catalog?category=living-room', 0, 'active', 1, 0),
  ('ban-col-2', 'home_collection_3col', 'Trang Trí & Ánh Sáng', 'CURATED · LIGHTING',
   'Đèn thả bàn ăn và đèn sàn gỗ phong cách Hygge ấm áp.',
   'SEE COLLECTIONS',
   'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
   '/catalog?category=lighting', 0, 'active', 2, 0),
  ('ban-col-3', 'home_collection_3col', 'Phụ Kiện Nghệ Thuật', 'CURATED · ACCESSORIES',
   'Bình gốm thủ công, khay trang trí và đồng hồ treo tường Bắc Âu.',
   'SEE COLLECTIONS',
   'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
   '/catalog?category=accessories', 0, 'active', 3, 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. COUPONS (3 mã giảm giá)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO coupons (id, code, type, value, max_uses, uses, expires_at, is_active)
VALUES
  ('coupon-welcome10', 'WELCOME10', 'percent', 10, 500, 12, 1771939200, 1),
  ('coupon-freeship', 'FREESHIP', 'fixed', 50000, 1000, 45, 1819344000, 1),
  ('coupon-sober100k', 'SOBER100K', 'fixed', 100000, 200, 5, 1790400000, 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. FLASH SALES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO flash_sales (id, name, starts_at, ends_at, status)
VALUES
  ('flash-summer-2026', 'Flash Sale Mùa Hè 2026 — Nội Thất Bắc Âu', 1756128000, 1757414400, 'active');

INSERT OR REPLACE INTO flash_sale_items (id, flash_sale_id, product_id, price, quota, sold_quantity)
VALUES
  ('fsi-1', 'flash-summer-2026', 'prod-ambit', 3990000, 20, 8),
  ('fsi-2', 'flash-summer-2026', 'prod-clock', 2190000, 15, 5);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PROMOTION RULES (7 rules from Laravel PromotionSeeder)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO promotion_rules (id, name, rule_type, action_type, action_value, max_discount_amount, conditions_json, target_customer_tier, usage_limit, usage_limit_per_user, times_used, priority, stop_further_rules, status)
VALUES
  -- 1. WELCOME10 - 10% off, max 500K, min order 1M, 1 per user
  ('promo-01', 'WELCOME10 - Ưu Đãi Chào Mừng Khách Hàng Mới (Giảm 10%)', 'cart_rule', 'percentage_with_max_cap', 10.0, 500000,
   '{"code":"WELCOME10","min_order_amount":1000000,"min_quantity":0}', 'all', NULL, 1, 0, 10, 0, 'active'),
  -- 2. TIERED_PROMO - tiered quantity discount
  ('promo-02', 'TIERED_PROMO - Chiết Khấu Bậc Thang Số Lượng', 'cart_rule', 'tiered_quantity', 5.0, NULL,
   '{"min_order_amount":0,"tiered_steps":[{"min_qty":2,"percent":5},{"min_qty":4,"percent":10},{"min_qty":6,"percent":15}]}', 'all', NULL, 1, 0, 20, 0, 'active'),
  -- 3. BUY_DESK_GET_CHAIR - buy Copenhague desk, get Synnes chair
  ('promo-03', 'BUY_DESK_GET_CHAIR - Mua Bàn Làm Việc Tặng Ghế Ăn Bắc Âu', 'cart_rule', 'buy_x_get_y', 100.0, NULL,
   '{"bxgy_config":{"buy_product_id":"prod-copenhague","buy_qty":1,"get_product_id":"prod-synnes","get_qty":1,"max_rewards":1},"target_product_ids":["prod-copenhague"]}', 'all', NULL, 1, 0, 30, 0, 'active'),
  -- 4. CATALOG_LIGHTING_15 - 15% off lighting category
  ('promo-04', 'CATALOG_LIGHTING_15 - Giảm 15% Bộ Sưu Tập Đèn Chiếu Sáng', 'catalog_rule', 'percentage_with_max_cap', 15.0, NULL,
   '{"category_ids":["cat-lamps"],"target_product_ids":["prod-ambit","prod-cement","prod-tribeca"]}', 'all', NULL, 1, 0, 5, 0, 'active'),
  -- 5. FREESHIP500 - free shipping over 500K
  ('promo-05', 'FREESHIP500 - Miễn Phí Vận Chuyển Đơn Hàng Từ 500.000₫', 'cart_rule', 'free_shipping', 0.0, NULL,
   '{"min_order_amount":500000,"min_quantity":0}', 'all', NULL, 1, 0, 50, 0, 'active'),
  -- 6. VIPGOLD20 - 20% off for VIP Gold tier
  ('promo-06', 'VIPGOLD20 - Đặc Quyền Giảm 20% Thành Viên VIP Gold', 'cart_rule', 'percentage_with_max_cap', 20.0, 1000000,
   '{"code":"VIPGOLD20","min_order_amount":0,"min_quantity":0}', 'gold', NULL, 1, 0, 5, 0, 'active'),
  -- 7. [LEGACY] Combo 2+ items 5% (inactive, reserved for ADR-B2 migration)
  ('promo-07', '[LEGACY] Combo 2+ Sản Phẩm Giảm 5%', 'cart_rule', 'percentage_with_max_cap', 5.0, NULL,
   '{"min_order_amount":0,"min_quantity":2,"legacy":true}', 'all', NULL, 0, 0, 100, 0, 'inactive');

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. PRODUCT REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO product_reviews (id, product_id, customer_id, rating, comment, status, verified_purchase, helpful_count, created_at)
VALUES
  ('rev-1', 'prod-synnes', 'cust-sober-1', 5,
   'Ghế gỗ sồi cực kỳ chắc chắn và hoàn thiện sắc sảo đến từng chi tiết. Rất hài lòng với chất lượng phục vụ và đóng gói giao hàng của Sober Furniture!',
   'approved', 1, 12, '2026-08-12 14:30:00'),
  ('rev-2', 'prod-ambit', 'cust-sober-2', 5,
   'Ánh sáng đèn tỏa ra rất dịu mắt, màu sơn tĩnh điện mờ nhìn rất sang. Đặt ở bàn ăn ai đến nhà cũng khen ngợi.',
   'approved', 1, 8, '2026-08-15 10:15:00');

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. CMS ENTRIES (4 blog posts + 3 policy pages)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO cms_entries (id, slug, title, excerpt, content, type, status, featured_image_url, published_at, placement, clicks)
VALUES
  -- Blog: Ánh sáng Scandinavian
  ('cms-post-1', 'nghe-thuat-bai-tri-anh-sang-scandinavian',
   'Nghệ thuật bài trí ánh sáng ấm cúng cho không gian phòng khách Scandinavian',
   'Ánh sáng là linh hồn của phong cách nội thất Bắc Âu. Khám phá cách kết hợp đèn thả trần, đèn bàn và ánh sáng tự nhiên để tạo nên không gian ấm cúng (Hygge) chuẩn mực.',
   '<p class="lead">Trong văn hóa Bắc Âu, nơi mùa đông kéo dài với những ngày ngắn ngủi, ánh sáng không đơn thuần chỉ là công cụ chiếu sáng mà đã trở thành một biểu tượng tinh thần — hiện thân của niềm ấm áp, sự chở che và linh hồn của phong cách sống Hygge.</p><h2>1. Triết Lý Ánh Sáng Trong Không Gian Sống Bắc Âu</h2><p>Người Scandinavia hiếm khi sử dụng một bóng đèn chùm công suất lớn duy nhất để rọi sáng toàn bộ căn phòng. Thay vào đó, họ tạo ra các hòn đảo ánh sáng (islands of light) bằng cách bố trí nhiều nguồn sáng nhỏ phân tán khắp không gian.</p><h3>1.1. Tận Dụng Tối Đa Nguồn Sáng Tự Nhiên</h3><p>Để đón nhận ánh sáng mặt trời một cách trọn vẹn nhất, các ô cửa sổ phòng khách thường được giữ thông thoáng tối đa. Hãy ưu tiên sử dụng rèm vải voan hoặc rèm lanh mỏng màu trắng để lọc ánh sáng êm dịu mà không làm tối căn phòng.</p><h3>1.2. Nguyên Tắc Phân Tầng Ánh Sáng Đa Điểm</h3><p>Một hệ thống chiếu sáng chuẩn Scandinavian luôn bao gồm ba tầng ánh sáng cơ bản:</p><ul><li><strong>Ánh sáng môi trường (Ambient Light):</strong> Tạo nền sáng tổng thể dịu nhẹ cho toàn bộ căn phòng.</li><li><strong>Ánh sáng tác vụ (Task Light):</strong> Cung cấp ánh sáng tập trung cho các hoạt động cụ thể như đọc sách, làm việc hoặc dùng bữa.</li><li><strong>Ánh sáng điểm nhấn (Accent Light):</strong> Làm nổi bật các chi tiết điêu khắc, tranh treo tường hay các góc decor nghệ thuật.</li></ul><h2>2. Chọn Đèn Thả Trần Điểm Nhấn Nghệ Thuật</h2><p>Đèn thả trần với chao nhôm dập nguyên khối sơn tĩnh điện mờ như dòng <em>Ambit Pendant Lamp</em> luôn là lựa chọn hàng đầu cho khu vực bàn trà hoặc bàn ăn.</p>',
   'post', 'published',
   'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200&auto=format&fit=crop&q=80',
   1754678400, 'blog', 0),

  -- Blog: Gỗ sồi
  ('cms-post-2', 'bi-quyet-lua-chon-va-bao-quan-ban-ghe-go-soi',
   'Bí quyết lựa chọn và bảo quản bàn ghế gỗ sồi tự nhiên luôn bền đẹp như mới',
   'Gỗ sồi (Oak) là chất liệu được ưa chuộng hàng đầu trong nội thất Bắc Âu. Cẩm nang bảo dưỡng, xử lý độ ẩm và giữ màu vân gỗ sáng đẹp trường tồn theo thời gian.',
   '<p class="lead">Gỗ sồi tự nhiên (Oak Wood) với các đường vân núi uyển chuyển và sắc gỗ tươi sáng luôn là linh hồn vật liệu trong các thiết kế nội thất Scandinavian cao cấp. Tuy nhiên, để đồ gỗ giữ được vẻ đẹp nguyên bản qua hàng chục năm sử dụng đòi hỏi sự thấu hiểu và chăm sóc đúng cách.</p><h2>1. Đặc Tính Vượt Trội Của Gỗ Sồi Tự Nhiên</h2><p>Gỗ sồi trắng (White Oak) nhập khẩu Bắc Mỹ sở hữu độ cứng chắc cao, thớ gỗ mịn và cấu trúc dạng chai khép kín giúp hạn chế tối đa sự xâm nhập của nước và hơi ẩm vào tâm gỗ.</p><h3>1.1. Cấu Trúc Vân Gỗ Và Khả Năng Chịu Lực</h3><p>Nhờ liên kết sợi gỗ bền chặt, các mẫu ghế như <em>Synnes Dining Chair</em> hay bàn làm việc <em>Copenhague Desk</em> có thể chịu được tải trọng lớn mà vẫn giữ được đường nét thanh mảnh, thanh thoát.</p><h2>2. Quy Trình Vệ Sinh Bàn Ghế Gỗ Hàng Ngày</h2><p>Việc vệ sinh định kỳ giúp loại bỏ bụi bẩn trước khi chúng bám sâu vào các kẽ vân gỗ. Chỉ nên sử dụng khăn vải sợi microfiber ẩm nhẹ (đã vắt ráo nước hoàn toàn) để lau dọc theo chiều vân gỗ.</p>',
   'post', 'published',
   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80',
   1754851200, 'blog', 0),

  -- Blog: Tối giản 2026
  ('cms-post-3', 'xu-huong-thiet-ke-noi-that-toi-gian-2026',
   'Xu hướng thiết kế nội thất tối giản 2026: Tinh gọn không gian, nâng tầm sống chậm',
   'Xu hướng nội thất 2026 hướng đến sự cân bằng hoàn hảo giữa thẩm mỹ tối giản và công năng sống thông minh. Khám phá cách bài trí không gian sống thanh lọc tâm trí.',
   '<p class="lead">Bước sang năm 2026, chủ nghĩa tối giản (Minimalism) không còn là sự giản lược lạnh lẽo đến mức kham khổ, mà đã tiến hóa thành phong cách Warm Minimalism — sự tinh gọn đầy tính nhân văn, tập trung vào trải nghiệm cảm xúc và sức khỏe tinh thần của con người.</p><h2>1. Định Nghĩa Lại Chủ Nghĩa Tối Giản Trong Năm 2026</h2><p>Triết lý sống Lagom (biết đủ và cân bằng) của người Thụy Điển đang trở thành kim chỉ nam cho các kiến trúc sư hiện đại. Mọi vật dụng đặt để trong căn phòng đều phải mang một ý nghĩa rõ ràng: phục vụ nhu cầu sử dụng thực tế hoặc khơi gợi niềm vui thẩm mỹ.</p><h2>2. Nghệ Thuật Lựa Chọn Phụ Kiện Trang Trí Điêu Khắc</h2><p>Một không gian tối giản không có nghĩa là không có đồ trang trí. Điều quan trọng là số lượng ít nhưng chất lượng vượt trội. Đồng hồ <em>Freakish Clock</em> với thiết kế đĩa xoay không kim là minh chứng tiêu biểu cho phụ kiện nội thất điêu khắc.</p>',
   'post', 'published',
   'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=1200&auto=format&fit=crop&q=80',
   1755024000, 'blog', 0),

  -- Blog: Phối màu trung tính
  ('cms-post-4', 'cach-phoi-hop-mau-sac-trung-tinh-va-chat-lieu-tho-moc',
   'Cách phối hợp màu sắc trung tính và chất liệu thô mộc trong căn hộ hiện đại',
   'Quy tắc vàng 60-30-10 trong phối màu nội thất phong cách Scandinavia: Sự hòa quyện giữa tông trắng xám, gỗ mộc và kim loại sơn tĩnh điện hiện đại.',
   '<p class="lead">Sử dụng bảng màu trung tính (Neutral Palette) kết hợp cùng các chất liệu mộc mạc như gỗ tự nhiên, bê tông và kim loại sơn mờ là công thức kinh điển để tạo nên một không gian sống thanh lịch và không bao giờ lỗi mốt.</p><h2>1. Bảng Màu Trung Tính — Nền Tảng Của Không Gian Bắc Âu</h2><p>Các gam màu trung tính không chỉ giúp phản xạ ánh sáng tốt hơn mà còn tạo ra một phông nền tĩnh lặng, giúp tôn vinh hình khối của từng món đồ nội thất. Thay vì màu trắng tinh dễ gây cảm giác chói gắt, hãy ưu tiên các tông trắng kem, xám tro nhạt hoặc màu be cát.</p><h2>2. Sự Kết Hợp Tương Phản Giữa Bê Tông, Kim Loại Và Gỗ Sồi</h2><p>Chiếc đèn <em>Cement Wood Lamp</em> với chân đế bê tông đúc khuôn kết hợp khớp nối gỗ sồi mộc mạc chính là ví dụ hoàn hảo cho sự giao thoa giữa nét thô ráp công nghiệp và sự ấm áp của tự nhiên.</p>',
   'post', 'published',
   'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=1200&auto=format&fit=crop&q=80',
   1755196800, 'blog', 0),

  -- Policy Pages
  ('cms-page-1', 'chinh-sach-bao-mat',
   'Chính Sách Bảo Mật',
   'Cam kết của Sober Furniture về bảo vệ thông tin cá nhân và an toàn dữ liệu khách hàng theo tiêu chuẩn bảo mật cao nhất.',
   '<p class="lead">Sober Furniture cam kết tôn trọng và bảo mật tuyệt đối các thông tin mang tính riêng tư của quý khách hàng.</p><h2>1. Mục Đích Thu Thập Thông Tin Cá Nhân</h2><ul><li>Xử lý và hoàn tất các đơn đặt hàng sản phẩm nội thất trên website.</li><li>Giao hàng tận nhà và cung cấp dịch vụ lắp đặt chuyên nghiệp.</li><li>Cập nhật tình trạng đơn hàng, gửi thông báo vận chuyển và hóa đơn điện tử.</li></ul><h2>2. Phạm Vi Sử Dụng & Chia Sẻ Dữ Liệu</h2><p>Thông tin cá nhân của quý khách chỉ được sử dụng nội bộ tại Sober Furniture. Chúng tôi cam kết không bán, cho thuê hoặc chia sẻ dữ liệu cho bất kỳ bên thứ ba nào vì mục đích thương mại.</p>',
   'page', 'published',
   NULL,
   1753360000, 'footer', 0),

  ('cms-page-2', 'dieu-khoan-dich-vu',
   'Điều Khoản Dịch Vụ',
   'Các điều khoản và quy định điều chỉnh việc sử dụng website và giao dịch mua sắm sản phẩm nội thất tại Sober Furniture.',
   '<p class="lead">Chào mừng quý khách đến với website thương mại điện tử Sober Furniture. Bằng việc truy cập, duyệt xem hoặc đặt mua sản phẩm trên website, quý khách đồng ý tuân thủ và chịu sự ràng buộc của các Điều Khoản Dịch Vụ dưới đây.</p><h2>1. Chấp Thuận Các Điều Khoản Sử Dụng</h2><p>Sober Furniture có quyền điều chỉnh, bổ sung hoặc thay đổi nội dung của Điều Khoản Dịch Vụ bất kỳ lúc nào để phù hợp với quy định pháp luật và hoạt động kinh doanh.</p><h2>2. Tài Khoản & Bảo Mật Mật Khẩu</h2><p>Khi tạo tài khoản trên website, quý khách có trách nhiệm bảo mật mật khẩu và chịu trách nhiệm đối với toàn bộ các hoạt động diễn ra dưới tài khoản của mình.</p>',
   'page', 'published',
   NULL,
   1753360000, 'footer', 0),

  ('cms-page-3', 'chinh-sach-van-chuyen-doi-tra',
   'Chính Sách Vận Chuyển & Đổi Trả',
   'Chính sách giao hàng tận nơi toàn quốc, hỗ trợ lắp đặt miễn phí tại nội thành và quy trình đổi trả hàng trong 30 ngày.',
   '<p class="lead">Nhằm mang lại trải nghiệm mua sắm nội thất an tâm và thuận tiện nhất, Sober Furniture áp dụng chính sách giao hàng tận phòng, lắp đặt chuyên nghiệp và đổi trả linh hoạt trong vòng 30 ngày.</p><h2>1. Phạm Vi Giao Hàng & Thời Gian Vận Chuyển</h2><ul><li><strong>Nội thành TP.HCM & Hà Nội:</strong> Giao hàng trong vòng 24 - 48 giờ làm việc.</li><li><strong>Các tỉnh thành khác:</strong> Giao hàng trong vòng 3 - 5 ngày làm việc.</li></ul><h2>2. Điều Kiện & Quy Trình Đổi Trả Sản Phẩm Trong 30 Ngày</h2><p>Quý khách được quyền đổi sang sản phẩm khác hoặc hoàn tiền trong vòng 30 ngày kể từ ngày nhận hàng nếu sản phẩm đáp ứng các tiêu chí còn nguyên trạng, chưa qua sử dụng.</p>',
   'page', 'published',
   NULL,
   1753360000, 'footer', 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. NEWSLETTER SUBSCRIBERS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO newsletter_subscribers (id, email, status, source)
VALUES
  ('ns-sober-1', 'subscriber@example.com', 'subscribed', 'footer_signup');

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. CUSTOMER ADDRESSES (2 mẫu cho Sober customers)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR REPLACE INTO customer_addresses (id, customer_id, alias, first_name, last_name, address_1, city, state, postcode, country, phone, is_default_shipping, is_default_billing)
VALUES
  ('addr-sober-1', 'cust-sober-1', 'Nhà riêng', 'Nguyễn Văn', 'An', '12 Nguyễn Huệ', 'TP. Hồ Chí Minh', 'Quận 1', '700000', 'VN', '0901234567', 1, 1),
  ('addr-sober-2', 'cust-sober-2', 'Văn phòng', 'Trần Thị', 'Mai', '45 Tràng Tiền', 'Hà Nội', 'Hoàn Kiếm', '100000', 'VN', '0912345678', 1, 1);
