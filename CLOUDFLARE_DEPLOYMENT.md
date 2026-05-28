# Cloudflare Deployment Guide (Zero DevOps Setup)

Tài liệu này hướng dẫn cách thức thiết lập và deploy toàn bộ Monorepo của hệ thống Aura Store lên hệ sinh thái của Cloudflare thông qua Cloudflare Dashboard (Phương pháp Native CI/CD). 

Bằng phương pháp này, bạn không cần phải thiết lập Github Actions. Thay vào đó, Cloudflare sẽ tự động theo dõi nhánh `main` và thực hiện build / deploy mỗi khi có cập nhật.

---

## 1. Khởi tạo Cơ Sở Dữ Liệu (Cloudflare D1)

Trước tiên, bạn cần khởi tạo database trên Cloudflare để lấy ID. Bạn có thể sử dụng Cloudflare Dashboard hoặc Wrangler CLI.

**Lệnh tạo Database qua CLI:**
```bash
npx wrangler d1 create aura-db
```

Sau khi chạy xong, terminal sẽ trả về một `database_id`. Bạn cần copy ID này và dán vào 2 file cấu hình API của dự án:
- `apps/public-api/wrangler.toml`
- `apps/admin-api/wrangler.toml`

Thay thế cấu hình mẫu sau:
```toml
[[d1_databases]]
binding = "DB"
database_name = "aura-db"
database_id = "<PASTE_DATABASE_ID_CUA_BAN_VAO_DAY>"
```

**Chạy Migrations (Tạo bảng):**
Để apply các cấu trúc bảng lên Database thật trên Cloudflare:
```bash
pnpm --filter @ecommerce/database run db:migrate --remote
```

---

## 2. Triển khai Front-end (Cloudflare Pages)

Dự án có 2 ứng dụng Front-end. Bạn vào Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git** và cấu hình lần lượt:

### A. Storefront UI (Next.js)
- **Project name:** `aura-storefront`
- **Production branch:** `main`
- **Framework preset:** `Next.js`
- **Build command:** `pnpm install && pnpm run build --filter @ecommerce/storefront-ui`
- **Build output directory:** `apps/storefront-ui/.vercel/output/static`

### B. Admin UI (Vite / React)
- **Project name:** `aura-admin-ui`
- **Production branch:** `main`
- **Framework preset:** `Vite`
- **Build command:** `pnpm install && pnpm run build --filter @ecommerce/admin-ui`
- **Build output directory:** `apps/admin-ui/dist`

*(Lưu ý: Vì đây là Turbo Repo / Pnpm workspace, bạn cần đảm bảo biến môi trường `YARN_VERSION` hoặc lệnh `npm install -g pnpm` được chạy ở Cloudflare nếu Cloudflare yêu cầu).*

---

## 3. Triển khai Back-end API (Cloudflare Workers)

Cloudflare Workers hiện nay cũng hỗ trợ kết nối trực tiếp với GitHub, hoặc bạn có thể tự deploy thủ công bằng lệnh. 

**Option 1: Khuyên dùng (Kết nối qua Dashboard)**
1. Vào Cloudflare Dashboard -> Workers -> Create Worker.
2. Tại màn hình Worker, chọn **Connect to GitHub**.
3. Chọn repo và chỉ định thư mục gốc (**Root directory**) lần lượt là:
   - `apps/public-api` (Cho Public API)
   - `apps/admin-api` (Cho Admin API)
4. Hệ thống sẽ tự đọc file `wrangler.toml` trong các thư mục đó và thực hiện deploy tự động.

**Option 2: Deploy thủ công qua CLI (Từ máy tính của bạn)**
Chỉ cần chạy 2 lệnh sau ở thư mục gốc của dự án:
```bash
# Deploy Public API
pnpm --filter @ecommerce/public-api deploy

# Deploy Admin API
pnpm --filter @ecommerce/admin-api deploy
```

---

## 4. Kiểm Tra (Verification)

1. Truy cập vào domain `.pages.dev` của Storefront UI và Admin UI.
2. Kiểm tra log của Workers xem API có lấy được danh sách sản phẩm từ D1 Database không.
3. Thử đăng nhập trên Admin UI để test middleware RBAC nội bộ.
