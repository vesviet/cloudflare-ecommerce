# E-Commerce Full Flow - Business Analysis Review

Đây là tài liệu đánh giá tính đầy đủ và phân tích khoảng cách (Gap Analysis) của các luồng nghiệp vụ E-Commerce hiện tại từ góc nhìn của **Business Analyst**. Tài liệu này rà soát các phân hệ: **Product**, **Catalog**, **Customer**, **Order**, **CMS**, và **Marketing** để đảm bảo hệ thống MVP không bị thiếu sót các quy tắc nghiệp vụ sống còn trước khi tiến hành code.

---

## 1. Phân tích Khoảng cách nghiệp vụ (Gap Analysis)

Sau khi đối chiếu đặc tả của UI/UX Designer và Technical Architect với yêu cầu vận hành thực tế của một nền tảng thương mại điện tử chuyên nghiệp, chúng tôi phát hiện một số khoảng cách nghiệp vụ (gaps) sau:

### Phân hệ Product & Catalog (Sản phẩm & Danh mục)
- **Hiện có**: CRUD sản phẩm thô, quản lý tồn kho (stock), upload 1 ảnh sản phẩm lên R2.
- **Điểm thiếu hụt (Gaps)**:
  - *Phân loại (Categories Taxonomy)*: Thiếu đặc tả mối quan hệ giữa danh mục cha-con. Cần thiết để khách hàng lọc sản phẩm theo nhóm trên storefront.
  - *Trạng thái hiển thị (Draft vs. Published)*: Hiện tại sản phẩm tạo mới sẽ lập tức hiển thị. Nghiệp vụ yêu cầu trạng thái `Draft` để lưu nháp và chỉ đưa lên Catalog khi chuyển sang `Published`.
  - *Thư viện ảnh (Product Gallery)*: Bản brief mới chỉ hỗ trợ 1 ảnh đại diện. Thực tế cần một mảng ảnh (`images_gallery`) để khách hàng xem chi tiết góc độ sản phẩm.
  - *Tìm kiếm & Sắp xếp (Search & Sort)*: Thiếu quy tắc phân trang (Pagination), tìm kiếm từ khóa (Search), sắp xếp theo giá (thấp đến cao, cao đến thấp) và lọc theo thuộc tính (Attributes filter).

### Phân hệ Customer (Khách hàng)
- **Hiện có**: Khách vãng lai (Guest Checkout), đăng nhập/đăng ký tài khoản (JWT), sổ địa chỉ, lịch sử đơn hàng.
- **Điểm thiếu hụt (Gaps)**:
  - *Quản lý mật khẩu (Password Recovery)*: Thiếu luồng khôi phục mật khẩu (Forgot/Reset Password) thông qua mã xác nhận qua email (Secure Token).
  - *Xác thực tài khoản (Email Verification)*: Đăng ký tài khoản chưa có cơ chế verify email, dễ bị đăng ký tài khoản ảo làm rác database D1.
  - *Tuân thủ dữ liệu (GDPR/Data Privacy)*: Thiếu tính năng cho phép Customer yêu cầu xóa tài khoản (Right to be Forgotten) hoặc xuất dữ liệu cá nhân.

### Phân hệ Order & Checkout (Đơn hàng & Thanh toán)
- **Hiện có**: Tính phí ship FedEx/USPS, thanh toán Stripe, state machine WooCommerce, tự động hủy đơn sau 30 phút, xử lý hoàn tiền (Refund).
- **Điểm thiếu hụt (Gaps)**:
  - *Tính thuế (Tax Calculations)*: Chưa định nghĩa quy tắc tính thuế (Sales Tax). Doanh nghiệp cần xác định tính thuế suất phẳng (flat rate) hay dựa theo Zipcode của địa chỉ giao hàng.
  - *Thông báo đơn hàng (Order Notifications)*: Thiếu thông báo email tự động khi đơn hàng thay đổi trạng thái (Đặt hàng thành công, Bắt đầu giao hàng, Hoàn tiền thành công).
  - *Theo dõi đơn hàng (Shipping Tracking)*: Khi đơn hàng chuyển sang `Completed`, Shop Manager cần điền mã vận đơn (Tracking Number) của đối tác vận chuyển để khách hàng theo dõi.

### Phân hệ CMS (Content Management System)
- **Hiện có**: Chưa có bất kỳ cấu trúc CMS nào.
- **Điểm thiếu hụt (Gaps)**:
  - *Trang tĩnh pháp lý (Legal Pages)*: Các cổng thanh toán (như Stripe) yêu cầu bắt buộc website phải có trang *Chính sách bảo mật*, *Điều khoản dịch vụ*, và *Chính sách đổi trả/hoàn tiền* để duyệt tài khoản doanh nghiệp.
  - *Quản lý Banner/Promotion*: Cần một khu vực quản trị để Shop Manager thay đổi banner quảng cáo trang chủ và thông tin ưu đãi mà không cần can thiệp vào mã nguồn code.

### Phân hệ Marketing & Promotions
- **Hiện có**: Theo dõi UTM Param và ghi nhận `affiliate_id` lưu vào Stripe Metadata.
- **Điểm thiếu hụt (Gaps)**:
  - *Mã giảm giá (Coupon Engine)*: Thiếu cơ chế áp dụng mã giảm giá (giảm % đơn hàng, giảm số tiền cố định, hoặc miễn phí ship) ở bước checkout.
  - *Thu hồi giỏ hàng bỏ quên (Abandoned Cart Recovery)*: Chưa có cơ chế phát hiện và gửi email tiếp thị nhắc nhở các giỏ hàng bị bỏ rơi.

---

## 2. Đặc tả Nghiệp vụ Bổ sung (Business Specifications)

Để lấp đầy các khoảng cách trên, Business Analyst bổ sung các quy tắc nghiệp vụ sau vào tài liệu thiết kế:

### Phân hệ Product & Catalog
- **Business Rule PR-01**: Sản phẩm có trạng thái `Draft` tuyệt đối không được xuất hiện trong các câu lệnh truy vấn catalog phía Client (Next.js Storefront).
- **Business Rule PR-02**: Cho phép tạo sản phẩm có nhiều biến thể (Variants) kế thừa chung thuộc tính của sản phẩm cha nhưng có giá bán và số lượng tồn kho riêng biệt.

### Phân hệ Order & Shipping
- **Business Rule OR-01 (Shipping Tracking)**: Khi Shop Manager đánh dấu đơn hàng là `Completed`, hệ thống yêu cầu điền `Shipping Provider` (FedEx hoặc USPS) và `Tracking Number`. Dữ liệu này sẽ đồng bộ về tài khoản của khách hàng và gửi email thông báo.
- **Business Rule OR-02 (Flat Tax)**: Trong giai đoạn MVP, áp dụng thuế suất cố định 8% cho toàn bộ đơn hàng (hoặc miễn thuế đối với một số bang được cấu hình trước) để tránh phức tạp hóa tích hợp API thuế bên thứ ba.

### Phân hệ CMS & Legal
- **Business Rule CMS-01**: Xây dựng bảng `pages` trong database D1 để lưu trữ nội dung các trang tĩnh (slug: `terms-of-service`, `privacy-policy`, `refund-policy`). Storefront Next.js sẽ fetch động nội dung các trang này.

### Phân hệ Marketing
- **Business Rule MKT-01 (Coupons)**: Mã giảm giá phải kiểm tra 3 điều kiện trước khi áp dụng:
  1. Ngày hết hạn của coupon.
  2. Số lượng sử dụng tối đa của coupon.
  3. Giá trị đơn hàng tối thiểu (Min Order Value).

---

## 3. Bản Handoff bổ sung cho các vai trò khác

### Gửi UI/UX Designer:
- Cần bổ sung thiết kế giao diện cho trang tài khoản khách hàng (`Customer Profile` và `Address Book`), trang xem chi tiết lịch sử đơn hàng kèm mã vận đơn tracking, và giao diện quản lý trang tĩnh CMS.

### Gửi Technical Architect:
- Bổ sung cấu trúc bảng D1 cho Coupons (`coupons`), Trang tĩnh (`pages`), và Thư viện ảnh sản phẩm (`product_gallery`).
- Xem xét thiết kế API `POST /cart/apply-coupon` kiểm tra tính hợp lệ của mã giảm giá.

### Gửi Technical Lead:
- Bổ sung thêm các Task/Slice liên quan đến xây dựng trang tĩnh CMS và tích hợp quản lý mã giảm giá Coupon ở Checkout.
