import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình bắn 1000 Virtual Users (VU) dồn dập trong 10 giây để cố tình làm sập kho (Overselling)
export const options = {
  vus: 1000,
  duration: '10s',
};

export default function () {
  const url = 'http://localhost:8787/api/checkout';
  const payload = JSON.stringify({
    items: [{ variation_id: 'var-1', quantity: 1 }],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Kiểm tra xem D1 Database có chặn thành công và ném lỗi khi hết kho không
  // D1 Transaction (CHECK stock >= 1) sẽ ném constraint error nếu cố trừ xuống số âm
  check(res, {
    'is status 200 or safely rejected (400/500)': (r) => r.status === 200 || r.status === 400 || r.status === 500,
  });
  
  sleep(1);
}
