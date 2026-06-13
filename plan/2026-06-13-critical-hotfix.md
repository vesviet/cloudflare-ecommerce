# June 13 Hotfix: Data Integrity & Webhook Resilience - Product Brief

## Objective
- **User or business goal**: Đảm bảo an toàn dữ liệu và tính liên tục của hệ thống thương mại điện tử (Data Integrity & System Resilience). Khắc phục ngay lập tức 2 lỗi kiến trúc nghiêm trọng gây sập hệ thống hoàn tiền (Refund) và cạn kiệt tài nguyên mã giảm giá (Coupon Leak).
- **Success metric (North Star impact or journey metric)**:
  - 100% Refund Webhook request được xử lý thành công không bị crash.
  - Tỷ lệ sai lệch lượt dùng (uses) của mã giảm giá = 0% so với thực tế thanh toán thành công.
- **Behavior that must stay stable**: Trải nghiệm Checkout của người dùng không bị chậm trễ hoặc thay đổi luồng thao tác. Phí giao hàng và tính toán mã giảm giá (Non-stackable) phải được giữ nguyên.

## Hypothesis (if applicable)
- **Insight or evidence that prompted this**: Báo cáo kiểm toán Kiến trúc (Architecture Audit) phát hiện bảng `productVariations` không tồn tại nhưng vẫn được gọi ở Webhook, và lượt sử dụng Coupon bị trừ ngay lúc tạo đơn `pending_payment` mà không có cơ chế hoàn trả khi đơn bị huỷ (Abandoned Cart).
- *"Given [insight], changing [X] will result in [outcome] for [user segment]."*
  - Thay đổi logic trừ tồn kho trong Webhook về bảng `products` chuẩn, và chuyển logic hoàn (rollback) mã giảm giá vào Cron Job, sẽ ngăn chặn sập hệ thống và thất thoát chi phí Marketing (do Coupon ảo).
- **Validation type and method**: Problem validation (Dựa trên tĩnh học Code Audit).
- **Kill criteria**: Không áp dụng, đây là Critical Bug.

## Scope
- **In scope**:
  - Hotfix 1: Cập nhật hàm xử lý sự kiện `charge.refunded` trong `apps/public-api/src/routes/webhook.ts` để cộng lại `stock_quantity` vào đúng bảng `products` (thay vì `productVariations`).
  - Hotfix 2: Thêm đoạn mã xử lý Rollback (trừ đi lượt `uses`) cho bảng `coupons` (thông qua `orderDiscounts`) vào hệ thống Cron Job dọn dẹp đơn hàng hết hạn tại `apps/public-api/src/index.ts`.
- **Out of scope**: Thay đổi kiến trúc sang hệ thống Carts Database (D1) riêng biệt thay vì tạo Order trước khi thanh toán.
- **Assumptions**: Bảng `products` là nguồn chân lý duy nhất cho tồn kho (Inventory Truth) tại thời điểm này.
- **Affected users, roles, or journeys**: Tất cả khách hàng thanh toán qua thẻ tín dụng và sử dụng mã giảm giá. Admin khi thực hiện Refund trên Stripe Dashboard.

## Acceptance Criteria
- **Scenario or checklist**:
  - [ ] Khi Admin bấm Hoàn tiền một đơn hàng trên Stripe, số lượng tồn kho `stock_quantity` của sản phẩm tương ứng trong bảng `products` tự động tăng trở lại. Đơn hàng đổi trạng thái thành `refunded`. Không có lỗi 5xx.
  - [ ] Khách hàng nhập mã giảm giá và vào đến trang Checkout (tạo đơn `pending_payment`). Nếu khách đóng trình duyệt và chờ 30 phút, hệ thống Cron dọn dẹp đơn và lượt dùng mã giảm giá tự động hồi phục về số cũ.
- **Negative or exception cases**:
  - Webhook hoàn tiền gửi đến lần 2 không được phép cộng dư tồn kho (Đã xử lý qua `idempotency_keys`).
- **Release or rollback acceptance**: Deploy liền trong ngày. Nếu có vấn đề với Cron Job, có thể rollback bản deploy trên Cloudflare Pages/Workers ngay lập tức.

## Metrics
- **Primary outcome metric**:
  - Tỷ lệ lỗi 5xx ở endpoint `/api/webhooks/stripe` = 0%.
  - Chênh lệch `coupons.uses` = 0.
- **Vanity metrics explicitly excluded**: Số lượng Refund, Tổng thời gian xử lý webhook.

## Prioritization
- **Rationale**: Mức độ Rủi ro Cực Rất Cao (Critical). Webhook lỗi sẽ khiến dữ liệu tồn kho bị sai vĩnh viễn, trong khi rò rỉ mã giảm giá sẽ tiêu tốn ngân sách Marketing và mất khách hàng thực sự (vì mã báo hết hạn).
- **Trade-offs**: Cần tốn thêm một vòng truy vấn D1 (`db.batch`) trong Cron job để tìm xem đơn bị huỷ có kèm Coupon hay không. Bù đắp lại bằng Data Integrity hoàn hảo.
- **If quality or timing slips, what moves first**: Fix Webhook Refund trước. Rollback Coupon làm sau nếu không đủ thời gian.

## Delivery Handoff
- **Affected areas**: `public-api` (Webhook & Cron Job).
- **Risks**: Cron Job có thể bị Timeout nếu xử lý hàng chục ngàn đơn bị huỷ cùng lúc (Cần giới hạn limit hoặc batch size nếu có thể).
- **Open questions**: (Chờ xác nhận của Dev Lead về Batch limit trong Cron Job).
