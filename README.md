# HDS Law Firm Landing Page

Dự án Landing Page tĩnh kết hợp quản trị nội dung linh hoạt, xây dựng bằng Node.js, Express, EJS và SQLite. Được tối ưu hóa cho tốc độ, SEO (schema markup, meta tags) và tỷ lệ chuyển đổi (Facebook Pixel, form liên hệ).

## Yêu cầu hệ thống
- Node.js >= 18.x
- NPM >= 9.x

## Cài đặt và Chạy ở môi trường Development
1. Copy file cấu hình môi trường:
   ```bash
   cp .env.example .env
   ```
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng:
   ```bash
   npm start
   ```
   *Ứng dụng sẽ chạy tại http://localhost:3001*

## Hướng dẫn Deploy lên Production (Render / VPS)

Ứng dụng này đã được cấu hình sẵn cho môi trường Production (trust proxy, secure cookies, helmet, rate limiting).

### 1. Biến Môi Trường (.env)
Trên môi trường Production, bạn BẮT BUỘC phải thiết lập các biến sau:
- `NODE_ENV=production`
- `PORT=3001` (hoặc cổng bất kỳ tùy server)
- `SITE_URL=https://domain-cua-ban.com` (Quan trọng cho SEO: sitemap, robots, canonical)
- `SESSION_SECRET=một_chuỗi_ngẫu_nhiên_phức_tạp` (BẮT BUỘC, app sẽ crash nếu thiếu hoặc dùng key mặc định)
- `ADMIN_USERNAME=admin_thực_tế` (BẮT BUỘC)
- `ADMIN_PASSWORD=pass_thực_tế` (BẮT BUỘC)
- `FACEBOOK_PIXEL_ID=` (Tùy chọn: Nhập ID Pixel của bạn để bắt đầu tracking)

### 2. Persistent Storage (Lưu trữ bền vững)
Vì ứng dụng sử dụng SQLite và lưu trữ file ảnh trực tiếp trên ổ cứng, bạn **phải cấu hình Disk/Volume** để không bị mất dữ liệu mỗi khi server deploy lại.

**Cấu hình thư mục cần mount Persistent Volume:**
1. `data/`: Để lưu trữ file `database.sqlite` (Thông tin liên hệ, cấu hình text).
2. `public/uploads/`: Để lưu trữ các hình ảnh được upload từ trang Admin.

**Ví dụ trên Render:**
- Thêm *Disk* trong phần cài đặt của Web Service.
- Mount Path 1: `/opt/render/project/src/data`
- Mount Path 2: `/opt/render/project/src/public/uploads`

### 3. Khởi động (Start Command)
```bash
npm start
```
*(Lệnh này tương đương với `node app.js`)*

## Tính năng Tracking & SEO
- Facebook Pixel tự động render khi có `FACEBOOK_PIXEL_ID` trong biến môi trường.
- Hệ thống bắt event tự động cho các nút Call To Action (Zalo, Gọi điện, Form Submit thành công).
- Sitemap tự động cập nhật tại `/sitemap.xml`.
- SEO schema (`LegalService`, `Organization`, `LocalBusiness`, `FAQPage`) tích hợp sẵn.
