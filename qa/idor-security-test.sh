#!/bin/bash
echo "=== Bắt đầu Test Bảo mật: Tấn công IDOR (Insecure Direct Object Reference) ==="
echo "Kịch bản: User A cố tình xem lịch sử đơn hàng của User B"

# Giả lập Token của User A
USER_A_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_a_payload"

# ID Đơn hàng của User B
USER_B_ORDER_ID="ord_999999_user_b"

echo "[!] User A đang gọi API truy xuất đơn hàng của User B..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8787/api/customer/orders/${USER_B_ORDER_ID} \
  -H "Authorization: Bearer ${USER_A_TOKEN}")

if [ "$RESPONSE" == "403" ] || [ "$RESPONSE" == "404" ] || [ "$RESPONSE" == "401" ]; then
  echo "✅ KẾT QUẢ PASS: API đã phòng ngự thành công. HTTP Status: $RESPONSE (Không tìm thấy hoặc Cấm truy cập)"
else
  echo "❌ KẾT QUẢ FAIL: Lỗ hổng IDOR! User A đã xem được dữ liệu của User B. HTTP Status: $RESPONSE"
  exit 1
fi
