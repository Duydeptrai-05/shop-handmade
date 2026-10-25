# Cỏ May Handmade

Website bán đồ handmade (nến thơm, trang sức, quà tặng và phụ kiện) xây dựng bằng Next.js và MariaDB. Đây là đề tài thực tập tốt nghiệp ngành Công nghệ thông tin.

## Công nghệ sử dụng

- TypeScript, Next.js 16 (App Router, Turbopack)
- Tailwind CSS v4, thư viện `motion` cho hiệu ứng
- MariaDB 11.8, Prisma 7 (cấu hình trong `prisma7.config.ts`)
- Xác thực: `jsonwebtoken` + cookie httpOnly `session`, mật khẩu băm bằng `bcryptjs`
- Kiểm tra dữ liệu: `zod` (một schema dùng chung cho frontend và API)

## Chức năng

**Khách hàng**

- Xem danh sách sản phẩm, tìm theo tên, lọc theo danh mục
- Trang chi tiết sản phẩm, đánh giá và điểm sao trung bình
- Đăng ký, đăng nhập
- Giỏ hàng (lưu ở trình duyệt, giới hạn theo tồn kho)
- Đặt hàng, thanh toán COD hoặc chuyển khoản (có mã QR VietQR, đơn chuyển khoản quá 15 phút chưa thanh toán sẽ tự hủy và hoàn kho)
- Xem lịch sử đơn, tự hủy đơn hoặc đổi thông tin nhận hàng khi đơn chưa được xử lý
- Thông báo đơn đang giao trên thanh Header
- Viết đánh giá (chỉ khi đã có đơn hoàn tất chứa đúng sản phẩm đó)

**Quản trị (Admin)**

- Trang tổng quan: doanh thu, biểu đồ theo ngày, sản phẩm bán chạy, sản phẩm sắp hết hàng
- Quản lý đơn hàng: đổi trạng thái theo luật chuyển trạng thái, hủy đơn (hoàn kho), xác nhận đã nhận tiền chuyển khoản
- Quản lý sản phẩm: thêm, sửa, ẩn/hiện sản phẩm

**Phân quyền:** Guest, Customer, Admin. Tài khoản Admin chỉ tạo bằng seed, không có trang đăng ký Admin.

## Cài đặt và chạy

Yêu cầu: Node.js, MariaDB 11.x đang chạy trên máy.

1. Tải mã nguồn và cài thư viện:

   ```bash
   git clone https://github.com/Duydeptrai-05/shop-handmade.git
   cd shop-handmade
   npm install
   ```

2. Tạo file `.env` từ file mẫu rồi điền giá trị của bạn:

   ```bash
   cp .env.example .env
   ```

   Trên PowerShell dùng `Copy-Item .env.example .env`.

3. Tạo database trong MariaDB (tên trùng với `DATABASE_URL` trong `.env`), ví dụ:

   ```sql
   CREATE DATABASE shop_handmade_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. Tạo Prisma Client và bảng dữ liệu. Với Prisma 7 của project này, mọi lệnh Prisma đều phải kèm `--config prisma7.config.ts`:

   ```bash
   npx prisma generate --config prisma7.config.ts
   npx prisma migrate deploy --config prisma7.config.ts
   ```

5. Nạp dữ liệu mẫu:

   ```bash
   npx tsx prisma/seed.ts
   ```

6. Chạy web:

   ```bash
   npm run dev
   ```

   Mở http://localhost:3000.

## Tài khoản mẫu

| Vai trò  | Đăng nhập                                      | Mật khẩu       |
| -------- | ---------------------------------------------- | -------------- |
| Admin    | `admin` (tại `/admin/login`)                   | `Admin@123`    |
| Customer | email của các khách mẫu trong `prisma/seed.ts` | `Customer@123` |

Tài khoản Admin lấy từ `SEED_ADMIN_USERNAME` và `SEED_ADMIN_PASSWORD` trong `.env`. Admin và Customer dùng chung cookie `session`, nên khi thử cả hai vai trò hãy dùng thêm cửa sổ ẩn danh.

## Cấu trúc thư mục

```
prisma/             schema.prisma và seed.ts
lib/                mã dùng chung (auth, validation, prisma, hàm hủy đơn quá hạn...)
src/app/            các trang và API route (App Router)
src/components/     component giao diện
src/proxy.ts        chặn truy cập theo vai trò (Next 16 thay cho middleware)
docs/               tài liệu API (Postman collection)
```

Thư mục `lib/` nằm ở gốc project, ngang hàng `src/`. Project không dùng alias `@/`, mọi import dùng đường dẫn tương đối.

## Tài liệu API

File Postman collection nằm ở `docs/shop-handmade_postman_collection.json`. Cách dùng: mở Postman, chọn Import, chọn file này. Collection chia theo nhóm: xác thực, đơn hàng của khách, sản phẩm và đánh giá, quản trị.

Định dạng phản hồi thống nhất: thành công `{ "success": true, "data": ... }`, thất bại `{ "success": false, "message": "..." }`.

## Ghi chú thiết kế

- Giá tính lại từ database ở server, client chỉ gửi `productId` và `quantity`.
- `customerId` của đơn lấy từ token đăng nhập, không lấy từ dữ liệu client gửi lên.
- Trừ kho và hoàn kho nằm trong `prisma.$transaction`.
- Sản phẩm không bị xóa cứng mà chỉ ẩn (`isActive`), để không mất dữ liệu của các đơn cũ.
- Chuyển khoản là đối soát thủ công: khách chuyển theo nội dung `COMAY <mã đơn>`, Admin kiểm tra tiền về rồi bấm xác nhận. Cổng thanh toán tự động (VNPay, MoMo) chưa làm.
  & "C:\Program Files\MariaDB 11.8\bin\mysql.exe" -u root -p
