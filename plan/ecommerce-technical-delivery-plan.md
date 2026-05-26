# E-Commerce MVP (Headless Cloudflare) - Technical Delivery Plan

Với vai trò **Technical Lead**, tôi đã phân rã (break down) tài liệu giải pháp kiến trúc (ADR) và yêu cầu nghiệp vụ (Feature Ticket) thành các nhiệm vụ (slices) độc lập để giao cho đội ngũ lập trình (Frontend & Backend).

## Inputs
- **feature-ticket.json:** Có ([feature-ticket-ecommerce-mvp.json](file:///home/user/personalized/e-commerce/plan/feature-ticket-ecommerce-mvp.json))
- **adr-spec.json:** Có ([adr-headless-cloudflare-workers.json](file:///home/user/personalized/e-commerce/plan/adr-headless-cloudflare-workers.json))
- **ux-flow-spec:** Chưa có (có thể bổ sung sau).

## Goal
- **Outcome:** Triển khai thành công nền tảng E-Commerce Serverless sử dụng Cloudflare Workers với Hono.js, tích hợp giao diện Next.js, thanh toán Stripe và vận chuyển FedEx/USPS.
- **Preserved behavior:** Bảo toàn mô hình state machine đơn hàng gốc của WooCommerce.

---

## Slices (Phân công công việc)

| ID | Mô tả Slice | Người chịu trách nhiệm | Phụ thuộc | Đầu ra (Contract) |
|---|---|---|---|---|
| **slice-1** | Khởi tạo dự án Worker Hono.js. Thiết lập Wrangler và viết D1 Migrations (Products, Variants, Orders). | Backend Developer | None | `schema-migration.json` |
| **slice-2** | Thiết kế API Contract (JSON schema) cho Catalog, Cart và Checkout sử dụng `@hono/zod-openapi` để chuẩn bị cho việc sinh SDK. | Backend Developer | slice-1 | `api-contract-spec.json` |
| **slice-3** | Code API cho **Catalog** (đọc sản phẩm từ D1), tích hợp cache control. | Backend Developer | slice-2 | `implementation-result.json` |
| **slice-4** | Khởi tạo project **Next.js Storefront** triển khai trên CF Pages. Build khung giao diện cơ bản (Catalog, Product Details). | Frontend Developer | slice-2 | `implementation-result.json` |
| **slice-5** | Code API **Cart & Shipping**. Tích hợp gọi Fetch API sang FedEx/USPS, cache phí ship ở KV. | Backend Developer | slice-2 | `implementation-result.json` |
| **slice-6** | Code API **Thanh toán Stripe**. Sinh Payment Intent, xử lý Webhook. Tích hợp query SQL Transaction (D1) để trừ tồn kho an toàn. | Backend Developer | slice-1, slice-5 | `implementation-result.json` |
| **slice-7** | Code **Cron Trigger Worker**. Chạy định kỳ mỗi 5 phút quét DB tìm đơn `Pending_Payment` quá 30 phút để Cancel và hoàn tồn kho. | Backend Developer | slice-6 | `implementation-result.json` |
| **slice-8** | Tích hợp giao diện **Checkout & Stripe Elements** lên Storefront. Khớp API thanh toán và vận chuyển. | Frontend Developer | slice-4, 5, 6 | `implementation-result.json` |
| **slice-9** | Thiết lập CI/CD Workflow. Tự động generate `openapi.json` và build OpenAPI Client SDKs cho nền tảng Mobile và Marketplace. | DevOps / Backend | slice-2 | `implementation-result.json` |
| **slice-10** | Xây dựng API Security & Affiliate: Quản lý API Key cho Marketplace partner và lưu tracking UTM/Affiliate ID vào Database D1. | Backend Developer | slice-1, 2 | `implementation-result.json` |
| **slice-11** | Code **Admin API**: Xây dựng bộ API quản trị nội bộ (CRUD Sản phẩm, Quản lý Đơn hàng, Kích hoạt Hoàn tiền, Upload Ảnh R2). Bảo mật bằng JWT Admin hoặc Cloudflare Access. | Backend Developer | slice-1, 2 | `implementation-result.json` |
| **slice-12** | Code **Admin Dashboard UI**: Dựng giao diện quản trị (Vite/React SPA) sử dụng framework như `Refine` hoặc `react-admin` để shop manager vận hành. Deploy lên CF Pages. | Frontend Developer | slice-11 | `implementation-result.json` |
| **slice-13** | Code **Customer Portal API**: API Đăng ký, Đăng nhập (JWT), Quản lý Sổ địa chỉ (Billing/Shipping) và Lịch sử mua hàng (Order History). | Backend Developer | slice-1, 2 | `implementation-result.json` |
| **slice-14** | Code **Customer "My Account" UI**: Tích hợp các trang tài khoản cá nhân, sổ địa chỉ và theo dõi đơn hàng vào Storefront Next.js. | Frontend Developer | slice-4, 13 | `implementation-result.json` |

---

## Impact And Gates (Kiểm soát rủi ro & Chất lượng)

> [!CAUTION]
> **Impact Radius (Rủi ro hệ thống):**
> - **Lỗi Overselling:** Hàm SQL cập nhật tồn kho (D1 transaction) phải kiểm tra điều kiện `stock >= quantity` để tránh âm hàng.
> - **Idempotency Webhook Stripe:** Hàm nhận webhook Stripe phải chống tình trạng xử lý lặp lại 2 lần (lưu lại event_id đã xử lý).
> - **Worker Limit:** Chú ý bundle size của file worker không được vượt quá 1MB (Giới hạn tài khoản Cloudflare Free).
> - **API Security & Breaking Changes:** Việc public SDK cho Marketplace yêu cầu quản lý API versioning chặt chẽ. Đổi schema có thể làm crash App/Partner tích hợp.
> - **Admin Auth Bypass:** Các API CRUD sản phẩm, quản lý đơn hàng (Slice 11) tuyệt đối không được thiếu Middleware xác thực, tránh tình trạng Guest tự do truy cập sửa giá.
> - **Customer PII Leak (IDOR):** Khách hàng chỉ được phép sửa/xem địa chỉ và lịch sử đơn hàng của chính mình (kiểm tra chặt JWT payload với `user_id` trong D1).

- **Quality Gates:**
  - **Tests:** Backend bắt buộc phải có unit test sử dụng Vitest/Miniflare cho phần trừ kho và Webhook Stripe. Frontend test luồng checkout.
  - **Review:** Mã nguồn xử lý thanh toán và database queries (Slice 1, 6) phải trải qua Code Review gắt gao.
  - **Security:** Secret key của Stripe (`STRIPE_SECRET_KEY`) tuyệt đối phải lưu qua `wrangler secret put`, không hardcode vào code.

## Rollout / Rollback
- **Rollout Sequence:** Deploy theo thứ tự: (1) D1 Migrations -> (2) API Worker -> (3) Giao diện Frontend.
- **Rollback:** Sử dụng `wrangler rollback` cho API Worker. Data D1 rollback sẽ yêu cầu xử lý thủ công (hoặc file down-migration script) nếu gặp sự cố dữ liệu lớn.

---

## Documentation Deltas
- Technical Writer cần cập nhật file README hướng dẫn cách clone hệ thống, setup local DB D1, và cài đặt Stripe CLI để test Webhook trên máy cá nhân.
- Tài liệu quy trình đăng ký API Key cho FedEx/USPS để cấu hình vào Wrangler environment.

## Open Questions (Cần thảo luận với bạn)

> [!TIP]
> Kế hoạch kỹ thuật đã sẵn sàng. Bạn muốn đội ngũ **Backend Developer** hay **Frontend Developer** (vai trò tiếp theo) bắt tay vào việc khởi tạo mã nguồn (Slice 1 / Slice 4) trước? Thường chúng ta sẽ tiến hành Backend (Setup Repo & DB schema) làm bước nền tảng.

---
*Documented by: Technical Lead Agent (theo role agent-skills)*
