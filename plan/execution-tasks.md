# Execution Tasks: E-Commerce Cloudflare MVP

- `[/]` **Phase 1: Infrastructure & Data Model (Backend)**
  - `[x]` Khởi tạo dự án Hono.js (`npm create hono@latest`) với template Cloudflare Workers (Cấu trúc Monorepo).
  - `[x]` Cấu hình `wrangler.toml` để bind D1 (DB), KV (Cache), R2 (Storage), và Queues.
  - `[x]` Viết D1 Migrations (SQL): Tạo bảng `products`, `product_variations`, `orders`.
  - `[x]` Viết D1 Migrations (SQL) & Drizzle Schema: Tạo bảng `order_items` và cấu hình FTS5 cho `products`.
  - `[ ]` Setup Cloudflare R2 bucket & cấu hình luồng upload/read hình ảnh sản phẩm.

- `[/]` **Phase 2: API Contract & Security (Backend & DevOps)**
  - `[x]` Cài đặt `@hono/zod-openapi` và định nghĩa Schema chuẩn cho Catalog, Cart, Order, Webhook.
  - `[x]` Thiết lập CI/CD GitHub Actions: Lint OpenAPI JSON và tự động build Client SDKs (Dart/Swift) ném lên Registry.
  - `[x]` Viết Middleware JWT Auth cho Guest Checkout (cấp token chống lỗi bảo mật IDOR).
  - `[x]` Viết Middleware API Key (RBAC) cho đối tác Marketplace/Affiliate.

- `[/]` **Phase 3: Core Logic & Integrations (Backend)**
  - `[x]` Code API Catalog: Đọc danh sách, chi tiết sản phẩm và chức năng tìm kiếm FTS5.
  - `[x]` Code API Cart & Shipping: Tích hợp Fetch API FedEx/USPS, cache biểu phí vào KV trong 10 phút.
  - `[ ]` Code API Checkout (Stripe): Sinh Payment Intent, lưu tracking UTM/Affiliate ID vào metadata của Stripe.
  - `[ ]` Code API Stripe Webhook: Viết cơ chế Idempotency chống lặp, cập nhật kho bằng D1 Transaction (`UPDATE stock WHERE stock >= ?`), đẩy thông báo hoa hồng/email vào Cloudflare Queues.
  - `[x]` Code API Customer Portal: Xây dựng luồng Đăng ký/Đăng nhập sinh JWT, API CRUD Sổ địa chỉ (Address Book) và API truy xuất Lịch sử Đơn hàng (Order History).

- `[/]` **Phase 4: Async Workers & Maintenance (Backend)**
  - `[x]` Code Queue Consumer: Đọc tin nhắn từ Stripe Webhook để gửi Email, đẩy Webhook đối tác (Affiliate).
  - `[x]` Code Cron Trigger (Scheduler): Quét bảng `orders` mỗi 5 phút, hủy đơn `Pending_Payment` quá 30 phút và hoàn tồn kho.
  - `[x]` Code API Refund: Gọi hoàn tiền Stripe và trả (+1) vào kho D1.

- `[/]` **Phase 5: Storefront UI/UX (Frontend)**
  - `[x]` Khởi tạo dự án Next.js (`npx create-next-app`) triển khai trên Cloudflare Pages.
  - `[x]` Áp dụng Premium UI: Glassmorphism, Dark mode, Inter typography.
  - `[x]` Trang Catalog: Code hiệu ứng Skeleton/Blur-up loading cho ảnh lấy từ R2.
  - `[x]` Trang Giỏ hàng: Thêm ô "Estimate Shipping" nhập Zipcode gọi tính phí ship nội tuyến.
  - `[x]` Trang Checkout: Thiết kế luồng Guest mặc định (ko bắt đăng nhập), tích hợp Stripe Elements. Xử lý lỗi thẻ từ chối (rung form, không reload).
  - `[x]` Trang Thank You: Thiết kế form "Soft sign-up" mời tạo mật khẩu.
  - `[x]` Trang My Account (Customer Portal): Code giao diện Đăng nhập/Đăng ký, màn hình Profile, Sổ Địa Chỉ và Danh sách/Chi tiết Đơn hàng.

- `[/]` **Phase 6: Admin Dashboard (Internal Tools)**
  - `[x]` Code Admin API (Backend): Viết các API CRUD cho Sản phẩm, Danh mục, Đơn hàng và API gọi Stripe Refund.
  - `[x]` Bảo mật Admin API: Thêm Middleware kiểm tra Admin JWT / Cloudflare Access.
  - `[x]` Dựng Admin UI (Frontend): Khởi tạo dự án Vite/React hoặc Next.js nội bộ (dùng framework `Refine` hoặc `react-admin`).
  - `[x]` Ghép nối Admin UI với Admin API: Xây dựng màn hình xem danh sách đơn hàng, thêm ảnh sản phẩm (upload lên R2), và ấn nút hoàn tiền.

- `[ ]` **Phase 7: QA & Testing (QA)**
  - `[ ]` Load Test (Overselling): Dùng k6/Artillery giả lập 1,000 request/giây thanh toán cùng 1 sản phẩm.
  - `[ ]` Security Test (IDOR): Lấy guest token user A đi xem Order ID user B.
  - `[ ]` Stripe Mock Test: Gửi webhook giả lập lỗi/trùng lặp qua Stripe CLI.
