# Aura Admin Dashboard - Architecture Brief & UX Brief Review

Tài liệu này đóng vai trò là **Architecture Brief & Review Report** được thực hiện bởi **Technical Architect** để đánh giá và chuẩn hóa mặt kỹ thuật cho tài liệu [admin-dashboard-ux-brief.md](file:///home/user/personalized/e-commerce/plan/admin-dashboard-ux-brief.md) của UI/UX Designer.

---

## Inputs
- `feature-ticket.json` (yes/no): **Yes** ([feature-ticket-ecommerce-mvp.json](file:///home/user/personalized/e-commerce/plan/feature-ticket-ecommerce-mvp.json))
- `research-report.json` (yes/no): **Yes** (Đánh giá trực tiếp dựa trên tài liệu [admin-dashboard-ux-brief.md](file:///home/user/personalized/e-commerce/plan/admin-dashboard-ux-brief.md))

---

## Context

- **Problem**: Giao diện Quản trị (`admin-ui`) hiện tại đang rất đơn sơ, sử dụng inline style trực tiếp, thiếu các liên kết điều hướng chuẩn hóa, không có bảng thống kê chỉ số kinh doanh, và cấu trúc code React chưa tối ưu hóa hiệu năng/trải nghiệm người dùng.
- **Constraints**:
  - Không sử dụng TailwindCSS (Bảo toàn việc sử dụng Vanilla CSS thuần).
  - Tương thích và đồng bộ giao diện Dark Mode Glassmorphism của Storefront.
  - Phải chạy tối ưu trên Cloudflare Pages (SPA Client-side Routing).
  - Bảo mật qua Cloudflare Access JWT (bỏ qua xác thực ở môi trường local).
- **Preserved behavior**:
  - Giữ nguyên luồng xử lý hoàn tiền (Refund Button) và quy trình thêm sản phẩm kèm tải ảnh lên Cloudflare R2 qua `admin-api`.
  - Giữ cơ chế thu hồi bộ nhớ ảnh preview (`URL.revokeObjectURL`) tránh leak RAM trên trình duyệt.

---

## System Impact (Tác động Hệ thống)

- **Boundaries / affected_services**:
  - `apps/admin-ui`: Chuyển dịch toàn bộ inline style sang các lớp CSS biến số (`CSS Variables`) tại `App.css` và `index.css`. Cấu trúc lại luồng state điều hướng.
  - `apps/admin-api`: Hỗ trợ thêm API endpoint phục vụ metrics dashboard (`GET /admin-api/metrics`), đảm bảo các api này chạy truy vấn tối ưu và có cache nếu cần.
- **api_contract_refs**:
  - Đặc tả cấu trúc thiết kế chi tiết: [ux-flow-spec.json](file:///home/user/personalized/e-commerce/plan/specs/ux-flow-spec.json)
  - Các đặc tả component:
    - [sidebar-component.json](file:///home/user/personalized/e-commerce/plan/specs/sidebar-component.json)
    - [stats-grid-component.json](file:///home/user/personalized/e-commerce/plan/specs/stats-grid-component.json)
    - [orders-table-component.json](file:///home/user/personalized/e-commerce/plan/specs/orders-table-component.json)
    - [product-form-component.json](file:///home/user/personalized/e-commerce/plan/specs/product-form-component.json)
- **Migration / rollback**:
  - *Migration*: Cập nhật song song file `App.css` và `App.tsx`. Không làm gián đoạn API hiện tại. Tích hợp query-param routing (?tab=...) giúp người dùng có thể chia sẻ link trực tiếp đến tab orders/products.
  - *Rollback*: Nếu cơ chế routing bằng query-param gặp lỗi tương thích trên Cloudflare Pages, chúng ta có thể rollback về cơ chế React State (`useState`) mà vẫn giữ nguyên giao diện CSS mới.

---

## Options (Các lựa chọn & Đánh giá)

### Option A: Tiếp tục duy trì State điều hướng dạng thô (`useState('orders')`) và các tab ẩn/hiện local
- **Pros**: Rất đơn giản, không cần cấu hình Router hay xử lý URL.
- **Cons**: Người dùng không thể nhấn nút Back/Forward của trình duyệt để quay lại tab trước đó. Khi F5 trang, trạng thái luôn bị reset về tab mặc định.

### Option B: Triển khai điều hướng đồng bộ URL (Query-params `?tab=orders`) (Khuyên dùng)
- **Pros**:
  - Tận dụng URL để lưu trạng thái trang hiện tại (`?tab=dashboard`, `?tab=orders`, `?tab=products`).
  - Hỗ trợ nút Back/Forward tự nhiên của trình duyệt qua API `window.history` hoặc React Router.
  - Dễ mở rộng khi bổ sung thêm các trang chi tiết sản phẩm / chi tiết đơn hàng sau này.
- **Cons**: Tốn thêm một chút code xử lý cập nhật URL đồng bộ với state.

---

## Recommendation

### 1. Decision (Quyết định Kiến trúc)
Phê duyệt thông qua định hướng của **UX/UI Brief** và lựa chọn **Option B** cho việc điều hướng. 

Đồng thời, áp dụng các ràng buộc kỹ thuật sau:
1. **Ràng buộc Kích thước File Ảnh**: Giới hạn kích thước file upload lên R2 ở mức tối đa **5MB** và bắt buộc kiểm tra MIME Type dạng `image/*` ở cả Client lẫn Hono.js Middleware để tránh quá tải RAM của Worker.
2. **Tính Nguyên tố (Atomicity)**: Hành động hoàn tiền (Refund) và cập nhật trạng thái đơn hàng trên `admin-api` phải được bọc trong một **D1 Transaction** để đảm bảo tính nhất quán (nếu Stripe hoàn tiền thành công nhưng lưu DB thất bại thì phải có cơ chế ghi log/cảnh báo rõ ràng).
3. **Quản lý Cache**: API thống kê `GET /admin-api/metrics` nên có Cache Control `max-age=60` (hoặc lưu cache ngắn hạn ở KV/Memory) để tránh tình trạng F5 liên tục làm cạn kiệt CPU Time của Cloudflare Workers D1.

### 2. Open questions (Câu hỏi còn thảo luận)
- *Stripe Integration*: Đối với môi trường local, Stripe webhook/refund API sẽ kết nối sandbox test. Ta cần đảm bảo các API Keys môi trường được cấu hình đầy đủ.
- *Zero Trust Bypass*: Cơ chế phát hiện local dev `ENVIRONMENT === 'development'` để bypass JWT auth trong `admin-api` hoạt động tốt, tuy nhiên ở production bắt buộc phải kiểm tra JWT header từ Cloudflare Access.
