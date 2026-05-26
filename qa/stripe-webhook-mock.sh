#!/bin/bash
echo "=== Bắt đầu Test Idempotency (Chống xử lý lặp sự kiện Webhook) ==="

# Bắn sự kiện Stripe Webhook 3 lần liên tiếp cho cùng một hóa đơn
for i in {1..3}
do
   echo "[+] Đang bắn Webhook lần $i cho Payment Intent: pi_3Nxxx_duplicated"
   curl -s -X POST http://localhost:8787/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_3Nxxx_duplicated"}}}'
   sleep 0.5
done

echo ""
echo "✅ KẾT QUẢ PASS MONG ĐỢI: Trong console log của Worker Public API, bạn sẽ chỉ thấy GIAO DỊCH TRỪ KHO kích hoạt 1 lần duy nhất."
echo "Lần 2 và 3 phải bị văng ra ngay từ bước Idempotency Check (vì mã pi_3Nxxx_duplicated đã được ghi nhận)."
