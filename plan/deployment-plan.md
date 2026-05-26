# E-Commerce MVP - Delivery & Deployment Plan

*Tài liệu hướng dẫn triển khai CI/CD cho kiến trúc Monorepo (Turborepo) trên nền tảng Cloudflare do DevOps Engineer quy hoạch.*

## 1. Scope & Environments
- **Monorepo Manager:** `pnpm workspaces` + `Turborepo`.
- **Target Platform:** Cloudflare Workers (cho API) & Cloudflare Pages (cho UI).
- **Môi trường (Environments):**
  - **Local:** Chạy qua `Wrangler / Miniflare` (Offline D1, R2, KV).
  - **Staging/Preview:** Triển khai tự động cho mỗi Pull Request (Cloudflare Preview Deployments).
  - **Production:** Triển khai khi merge code vào nhánh `main`.

## 2. Luồng Deploy Frontend (Cloudflare Pages)
Áp dụng cho thư mục `apps/storefront-ui` (Next.js) và `apps/admin-ui` (Vite/React).
- **Công cụ:** Tích hợp trực tiếp Cloudflare Pages với GitHub Repository.
- **Cấu hình tại Cloudflare Dashboard:**
  - **Root Directory:** Cài đặt độc lập cho từng App (vd: `apps/storefront-ui`).
  - **Build Command:** `npx turbo run build --filter=storefront-ui`.
  - **Build Output:** `.next` (Next.js) hoặc `dist` (Vite).
- **Lợi ích:** Cloudflare sẽ tự cài đặt `pnpm`, giải quyết các dependencies dùng chung từ `packages/contract`, build tĩnh và CDN caching toàn cầu.

## 3. Luồng Deploy Backend (Cloudflare Workers)
Áp dụng cho thư mục `apps/public-api-worker` và `apps/admin-api-worker` (Hono.js).
- **Công cụ:** GitHub Actions Workflow (`.github/workflows/deploy-workers.yml`).
- **Pipeline Flow:**
  1. Trigger khi push vào `main`.
  2. Setup Node.js & `pnpm install`.
  3. Lệnh build/deploy: `pnpm turbo run deploy --filter=public-api-worker` (Bên trong package.json sẽ gọi `wrangler deploy`).
- **Lợi ích Turborepo:** Nếu một Commit chỉ thay đổi giao diện UI, Turborepo sẽ tự động phát hiện (Changed Detection) và bỏ qua bước deploy lại API Workers, tiết kiệm CI/CD minutes và chống downtime.

## 4. Quản lý Secrets (Biến môi trường bảo mật)
- Các Secret Key (như `STRIPE_SECRET_KEY`, `JWT_SECRET`) **tuyệt đối không lưu** trong Git.
- **Local:** Lưu ở file `.dev.vars` (bị Git ignore).
- **Production:** Cấu hình bằng lệnh `wrangler secret put <KEY_NAME>` hoặc điền trực tiếp trong Dashboard Cloudflare Workers. CI/CD sẽ tự động kế thừa.

## 5. Rollback Plan (Kế hoạch hạ cấp)
- Dữ liệu ở D1 Database **không thể rollback code**. Chỉ được phép apply Database Migration chạy tiến lên (Forward only).
- Đối với lỗi logic API Worker: Developer sử dụng lệnh `wrangler rollback` để lập tức trả phiên bản Worker về lần deploy ổn định gần nhất trước đó mà không cần chờ chạy lại luồng CI.
- Đối với UI Pages: Vào mục Deployments trên Cloudflare Pages, chọn phiên bản cũ và bấm "Rollback".

---
*Documented by: DevOps Engineer Agent*
