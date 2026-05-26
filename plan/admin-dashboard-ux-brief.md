# E-Commerce Admin Dashboard - UX/UI Brief

Đây là tài liệu nghiên cứu và thiết kế trải nghiệm người dùng (UX/UI Brief) cho giao diện quản trị **Aura Admin Dashboard**, hỗ trợ quản lý vận hành toàn bộ hệ thống e-commerce serverless. Giao diện được thiết kế theo trường phái **Dark Mode Glassmorphism** cao cấp, đồng bộ với phong cách thị giác của **Storefront-UI** hiện tại, sử dụng hoàn toàn **Vanilla CSS** (không dùng TailwindCSS).

---

## Nghiên cứu xu hướng E-Commerce Admin Dashboard UI

Qua phân tích các nền tảng quản trị hàng đầu hiện nay như **Shopify Admin**, **Stripe Dashboard**, và **WooCommerce Core**, chúng tôi đúc rút ra các mô thức thiết kế (design patterns) tối ưu cho Aura Admin:

1. **Bố cục điều hướng (Navigation Layout)**:
   - **Cột bên trái cố định (Sidebar)**: Cung cấp lối tắt đến các khu vực chức năng chính (Overview, Orders, Products). Ở bản mobile, Sidebar chuyển đổi thành dạng Hamburger Menu kéo trượt (Drawer) hoặc thanh Bar trên cùng.
   - **Tối giản thị giác**: Sử dụng các biểu tượng (icons) trực quan kết hợp nhãn chữ rõ ràng, độ tương phản cao, làm nổi bật mục đang kích hoạt (`active state`).

2. **Khung hiển thị chỉ số chính (KPI Cards Grid)**:
   - Đặt ngay trên cùng của trang Overview. Mỗi thẻ chỉ số đại diện cho một thông tin sống còn: Doanh thu (Sales), Đơn hàng (Orders), Tỷ lệ hoàn tiền (Refund Rate), Cảnh báo hết hàng (Low Stock).
   - Thiết kế dạng **Glassmorphism Card** có hiệu ứng phát sáng nhẹ khi hover chuột (`accent glow`) để tăng chiều sâu.

3. **Bảng dữ liệu Đơn hàng (Orders Data Table)**:
   - Bảng dữ liệu mật độ cao nhưng dễ đọc. Sử dụng hệ thống huy hiệu trạng thái (status badges) có màu sắc tương ứng:
     - `Pending Payment`: Màu cam nhạt (cảnh báo chưa thanh toán).
     - `Processing`: Màu xanh dương nhạt (đã thanh toán, cần xử lý).
     - `Completed`: Màu xanh lá cây nhạt (đơn hàng thành công).
     - `Cancelled` / `Refunded`: Màu đỏ nhạt / xám đen.
   - Nút hành động trực quan (ví dụ: Nút **Refund** nhanh ngay tại dòng dữ liệu).

4. **Biểu mẫu thêm sản phẩm (Product Creation Form)**:
   - Bố cục chia luồng: Các trường thông tin (Tên, Giá, Tồn kho) sắp xếp dạng một cột gọn gàng, cạnh đó là khu vực Upload hình ảnh (R2 file upload drag-and-drop).
   - Tích hợp **Image Preview** lập tức khi người dùng chọn file, xử lý an toàn vòng đời đối tượng ảnh (`URL.createObjectURL` và `URL.revokeObjectURL`) để tránh rò rỉ bộ nhớ (memory leaks).

---

## Inputs
- `feature-ticket.json` (yes/no): **Yes** ([feature-ticket-ecommerce-mvp.json](file:///home/user/personalized/e-commerce/plan/feature-ticket-ecommerce-mvp.json))
- `research-report.json` (yes/no): **No** (Thay thế bằng phần nghiên cứu trực tiếp trong tài liệu brief này)
- `data-analysis-report.json` (yes/no): **No**

---

## User Journey (Hành trình người dùng)
- **User (Tác nhân)**: Shop Manager / Administrator.
- **Goal (Mục tiêu)**: Theo dõi tình hình kinh doanh, quản lý thông tin sản phẩm, xử lý cập nhật trạng thái đơn hàng và kích hoạt hoàn tiền khi khách hàng yêu cầu.
- **Entry and Exit**:
  - *Entry*: Truy cập trực tiếp qua cổng quản trị `/admin-ui` (Được cấu hình Zero Trust JWT hoặc bỏ qua ở local dev).
  - *Exit*: Đóng tab hoặc đăng xuất phiên làm việc.
- **Preserved behavior**:
  - Giữ nguyên cơ chế state machine của WooCommerce: đơn hàng đi qua các trạng thái `Pending` -> `Processing` -> `Completed` / `Refunded`.
  - Giữ logic upload ảnh và render preview giải phóng RAM an toàn.
- **Changed behavior**:
  - Thay thế giao diện thô sơ hiện tại bằng thiết kế Dark Glassmorphism cao cấp.
  - Tổ chức cấu trúc CSS dạng variables tập trung, dễ bảo trì.
  - Tích hợp thêm tab **Overview Dashboard** chứa lưới KPIs thống kê trực quan.

---

## Screen States (Các trạng thái màn hình)

Hệ thống UI Admin sẽ hỗ trợ đầy đủ các trạng thái hiển thị sau:

- **Default (Trạng thái mặc định)**: Hiển thị danh sách đơn hàng, form điền sản phẩm trống, lưới chỉ số có số liệu.
- **Loading (Đang tải)**: Hiển thị bộ xương tải (Skeleton Screen) hoặc hiệu ứng Shimmer trên bảng và KPI cards khi đang fetch API từ `admin-api`.
- **Empty (Trống)**: Màn hình bảng đơn hàng trống kèm icon minh họa nhẹ nhàng và dòng chữ "Không tìm thấy đơn hàng nào".
- **Error (Lỗi)**: Banner thông báo lỗi màu đỏ đậm phía trên màn hình khi API gọi thất bại (kèm nút "Thử lại").
- **Permission (Quyền hạn)**: Hiển thị màn hình khóa với thông báo Cloudflare Access bảo vệ nếu JWT không hợp lệ.
- **Success (Thành công)**: Toast message xuất hiện góc phải trên khi thêm sản phẩm thành công hoặc hoàn tiền thành công.

---

## Interaction Rules (Quy tắc tương tác)

### 1. Hệ thống phối màu Dark Glassmorphism (Vanilla CSS Tokens)
Sử dụng các biến CSS đồng bộ trong `App.css` để thiết lập giao diện:
```css
:root {
  --bg-dark: #0d1117;          /* Nền chính tối */
  --bg-sidebar: #161b22;       /* Nền sidebar đậm hơn */
  --text-main: #f0f6fc;        /* Chữ chính sáng */
  --text-muted: #8b949e;       /* Chữ chú thích xám */
  --accent-blue: #58a6ff;      /* Xanh dương điểm nhấn */
  --accent-green: #3fb950;     /* Xanh lá cây (Active/Success) */
  --accent-red: #f85149;       /* Đỏ (Refund/Delete/Error) */
  --glass-bg: rgba(255, 255, 255, 0.02);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-glow: rgba(88, 166, 255, 0.15);
}
```

### 2. Primary Actions (Hành động chính)
- **Tab Switching**: Nhấp vào các mục trên Sidebar sẽ cập nhật State tab và chuyển đổi view trơn tru bằng CSS Transitions (fade-in).
- **Refund Order**: Nhấp vào nút "Refund" trên dòng đơn hàng sẽ mở một Popup/Modal xác nhận (để tránh nhầm lẫn), hiển thị trạng thái Loading trong khi gửi request đến Stripe, sau đó cập nhật dòng đơn hàng thành trạng thái `Refunded`.
- **Save Product**: Nhấp nút Submit trong form sẽ khóa các input, hiển thị icon loading trên nút, gọi API lưu sản phẩm và ảnh lên R2. Khi thành công, reset form và hiển thị Toast Success.

### 3. Validation & Feedback (Xác thực dữ liệu & Phản hồi)
- Form sản phẩm bắt buộc nhập đầy đủ Tên, Giá (> 0), Tồn kho (số nguyên >= 0) và tải lên ít nhất 1 file hình ảnh. Các input lỗi sẽ được tô viền màu đỏ nhạt (`--accent-red`) kèm thông điệp cảnh báo nhỏ bên dưới.
- Hiệu ứng Hover trên các thẻ KPI Card và hàng của bảng: Tăng nhẹ độ sáng của viền glassmorphism và dịch chuyển nhẹ lên trên 2px để phản hồi tương tác tự nhiên.

### 4. Adjacent flows to re-check (Các luồng liên quan cần lưu ý)
- Phía backend (`admin-api`), kiểm tra quyền truy cập thông qua biến môi trường hoặc Access JWT Token.
- Đảm bảo việc thêm sản phẩm trong admin hiển thị chính xác ngay lập tức trên Next.js Storefront khi làm mới trang (bằng cách xóa cache hoặc dùng cơ chế revalidation).

---

## Structured Handoff (Bàn giao cấu trúc)

Hồ sơ thiết kế kỹ thuật chi tiết đã được xuất ra các file JSON đặc tả:

- **ux-flow-spec.json path**: [ux-flow-spec.json](file:///home/user/personalized/e-commerce/plan/specs/ux-flow-spec.json)
- **ui-component-spec.json paths**:
  1. [sidebar-component.json](file:///home/user/personalized/e-commerce/plan/specs/sidebar-component.json)
  2. [stats-grid-component.json](file:///home/user/personalized/e-commerce/plan/specs/stats-grid-component.json)
  3. [orders-table-component.json](file:///home/user/personalized/e-commerce/plan/specs/orders-table-component.json)
  4. [product-form-component.json](file:///home/user/personalized/e-commerce/plan/specs/product-form-component.json)

### api_needs summary:
- **`GET /admin-api/metrics`**: Thống kê doanh thu, số đơn, tỷ lệ refund và số lượng sản phẩm sắp hết hàng.
- **`GET /admin-api/orders`**: Lấy danh sách đơn hàng cập nhật theo thời gian thực.
- **`POST /admin-api/orders/:id/refund`**: Gọi API tích hợp hoàn tiền Stripe.
- **`POST /admin-api/products`**: Upload file ảnh sản phẩm lên R2 và ghi dữ liệu D1.

### Open questions (Câu hỏi còn bỏ ngỏ):
1. Shop Manager có cần xuất dữ liệu báo cáo đơn hàng ra định dạng CSV để đối soát tài chính không?
2. Trong tương lai, chúng ta có cần vẽ biểu đồ đường (canvas-based line chart) hiển thị xu hướng doanh thu theo tuần/tháng không, hay số liệu thô là đủ cho MVP?
