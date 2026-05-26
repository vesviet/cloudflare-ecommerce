# E-Commerce Admin Dashboard - Technical Lead Plan

Tài liệu này đóng vai trò là **Technical Lead Plan** được lập bởi **Technical Lead**, chuyển dịch các yêu cầu từ UX Brief và các quyết định của Architecture Brief thành các nhiệm vụ (Slices) phát triển cụ thể kèm theo chốt chặn chất lượng (Quality Gates).

---

## Inputs
- `feature-ticket.json`: [feature-ticket-ecommerce-mvp.json](file:///home/user/personalized/e-commerce/plan/feature-ticket-ecommerce-mvp.json)
- `adr-spec.json`: [adr-admin-dashboard.json](file:///home/user/personalized/e-commerce/plan/specs/adr-admin-dashboard.json)
- `ux-flow-spec`: [ux-flow-spec.json](file:///home/user/personalized/e-commerce/plan/specs/ux-flow-spec.json)

---

## Goal
- **Outcome**: Xây dựng hoàn chỉnh giao diện Aura Admin Dashboard (SPA React) đạt thẩm mỹ premium Dark Glassmorphism, kết nối đồng bộ API vận hành đơn hàng (refund) và quản lý sản phẩm (R2 upload), đồng thời tích hợp thêm bảng thống kê KPIs.
- **Preserved behavior**:
  - Bảo toàn toàn bộ vòng đời trạng thái đơn hàng của WooCommerce.
  - Bảo toàn luồng preview ảnh an toàn, giải phóng RAM sau khi upload.
  - Bảo toàn cơ chế bypass xác thực đối với môi trường local.

---

## Slices

| ID | Nhiệm vụ phát triển | Vai trò chịu trách nhiệm | Phụ thuộc | Đầu ra (Contract) |
|---|---|---|---|---|
| **slice-api-metrics** | **API Metrics & Refund Transaction**:<br>- Viết thêm endpoint `GET /admin-api/metrics` truy vấn doanh thu, số đơn hàng, tỷ lệ refund và số sản phẩm sắp hết hàng từ D1.<br>- Cấu hình endpoint `POST /admin-api/orders/:id/refund` trong Hono chạy trong một SQL Transaction để đảm bảo tính nguyên tố khi cập nhật DB sau khi hoàn tiền Stripe thành công. | Backend Developer | None | `implementation-result.json` |
| **slice-ui-styles-routing** | **Cấu trúc lại CSS & Định tuyến URL**:<br>- Định nghĩa bộ CSS variables tại `apps/admin-ui/src/App.css` đại diện cho các mã màu Dark Glassmorphism, độ mờ (`backdrop-filter`) và hiệu ứng hover phát sáng đồng bộ storefront.<br>- Viết logic parse `window.location.search` để lấy và cập nhật tham số `?tab=overview|orders|products`, hỗ trợ nút Back/Forward của trình duyệt. | Frontend Developer | None | `implementation-result.json` |
| **slice-ui-components** | **Xây dựng các Thành phần UI Quản trị**:<br>- Viết code React dựng 4 component: `SidebarNavigation`, `StatsGrid`, `OrdersTable` (kèm Confirm Modal), và `ProductForm` (kèm file dropzone).<br>- Tích hợp gọi REST APIs đến `admin-api` (localhost:8788). Đảm bảo hiển thị đầy đủ các trạng thái: Loading (Shimmer), Empty, Error, Success (Toasts). | Frontend Developer | slice-api-metrics, slice-ui-styles-routing | `implementation-result.json` |

---

## Impact And Gates

### 1. Impact Radius (Vùng ảnh hưởng rủi ro)
- **Tải trọng CPU của Database (D1)**: Do dashboard overview load số liệu thống kê tổng hợp (doanh thu, số lượng đơn), nếu database phình to có thể gây suy giảm hiệu năng. Các câu lệnh SQL trong endpoint metrics phải sử dụng các cột được đánh index (ví dụ: `status`, `created_at`).
- **Giới hạn kích thước payload ảnh (R2)**: Tránh việc user upload ảnh dung lượng quá lớn làm nghẽn RAM của Cloudflare Workers. Giới hạn cứng dung lượng file upload ở mức **5MB** và chặn các file không phải ảnh.
- **Tính đồng nhất của Refund**: Nếu API refund của Stripe gọi thành công nhưng D1 DB ghi nhận thất bại, đơn hàng sẽ bị lệch trạng thái. Bắt buộc phải xử lý try-catch chặt chẽ, ghi log chi tiết lỗi hệ thống.

### 2. Quality Gates (Chốt chặn chất lượng)
- **Tests**:
  - Viết unit tests kiểm tra API `GET /admin-api/metrics` trả về chính xác số liệu tổng hợp D1.
  - Viết integration tests kiểm tra API `POST /admin-api/orders/:id/refund` xử lý đúng trạng thái đơn hàng.
- **Review**:
  - Rà soát code frontend `App.tsx` đảm bảo đã gọi `URL.revokeObjectURL` để giải phóng RAM cho ảnh preview sau khi submit form hoặc đổi file.
  - Kiểm tra tính responsive: Giao diện phải hiển thị tốt ở chiều rộng màn hình từ 320px đến 1920px.
- **Build**:
  - Build frontend `pnpm build` không được có cảnh báo lỗi TypeScript hay ESLint.
  - Build backend `wrangler build` đảm bảo bundle size dưới **1MB**.
- **Security**:
  - CORS cấu hình chính xác cho phép `admin-ui` (port 5173) giao tiếp với `admin-api` (port 8788).
  - Không hardcode Stripe Secret Key; sử dụng `wrangler secret put STRIPE_SECRET_KEY` trong quá trình deploy thực tế.

### 3. Rollout / Rollback
- **Rollout**: 
  1. Deploy API backend (`admin-api`) lên Cloudflare Workers trước để đảm bảo có endpoint metrics và cập nhật refund transaction.
  2. Deploy code giao diện quản trị (`admin-ui`) lên Cloudflare Pages.
- **Rollback**: 
  - Trong trường hợp giao diện bị lỗi hiển thị hoặc lỗi định tuyến URL trên môi trường production, thực hiện rollback bản build của Cloudflare Pages về bản hash commit ổn định trước đó.

---

## Documentation Deltas
- Hướng dẫn cấu hình biến môi trường local `.dev.vars` cho `admin-api` (`ENVIRONMENT="development"` để bỏ qua Access JWT).
- Hướng dẫn thiết lập Stripe CLI (`stripe listen --forward-to localhost:8788/webhook`) để test các webhook phản hồi về trạng thái thanh toán đơn hàng.

---

## Open Questions
1. Có nên hỗ trợ tải báo cáo đơn hàng (Orders Export) dưới dạng CSV trong bảng Orders không?
2. Có cần tích hợp biểu đồ trực quan (ví dụ: Canvas-based Line chart) hiển thị doanh số theo ngày/tuần ở tab Overview không, hay chỉ cần các KPI Cards thô cho bản MVP?
