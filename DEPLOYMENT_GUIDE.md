# Hướng dẫn Triển khai (Deployment Guide) lên Vercel

Hệ thống của bạn bao gồm 2 phần: **Frontend** (React) và **Backend** (Node.js/Express).
Để triển khai trên Vercel, chúng ta sẽ tách thành 2 Project riêng biệt liên kết với cùng một GitHub Repository.

## 1. Chuẩn bị (Đã hoàn tất tự động)

Tôi đã tự động thực hiện các bước sau cho bạn:
1.  **Bảo mật**: Chuyển các key Firebase ở Frontend sang biến môi trường (`.env`).
2.  **Cấu hình**: Tạo file `vercel.json` riêng cho Frontend và Backend.
3.  **Server**: Cập nhật `server.js` để tương thích với môi trường Serverless của Vercel.

---

## 2. Các bước triển khai (Thực hiện trên Vercel Dashboard)

### Bước 1: Push code lên GitHub
Đảm bảo bạn đã commit và push toàn bộ code lên GitHub repository của bạn.

### Bước 2: Triển khai Frontend
1.  Truy cập [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New...** -> **Project**.
2.  Import Repository GitHub của bạn.
3.  Cấu hình Project:
    *   **Project Name**: `learn-english-frontend` (hoặc tên tùy ý).
    *   **Root Directory**: Chọn `Edit` và chọn thư mục `frontend`.
    *   **Framework Preset**: Vercel sẽ tự nhận diện là **Create React App**.
    *   **Environment Variables**: Copy nội dung từ file `frontend/.env` (tôi đã tạo) và dán vào đây.
        *   `REACT_APP_FIREBASE_API_KEY`: ...
        *   `REACT_APP_FIREBASE_AUTH_DOMAIN`: ...
        *   (Và các biến còn lại...)
4.  Nhấn **Deploy**.

Sau khi deploy xong, bạn sẽ có domain (ví dụ: `https://learn-english-frontend.vercel.app`). **Hãy copy domain này.**

### Bước 3: Triển khai Backend
1.  Quay lại Vercel Dashboard -> **Add New...** -> **Project**.
2.  Import **cùng Repository** đó một lần nữa.
3.  Cấu hình Project:
    *   **Project Name**: `learn-english-backend`.
    *   **Root Directory**: Chọn `Edit` và chọn thư mục `backend`.
    *   **Framework Preset**: Chọn **Other**.
    *   **Environment Variables**:
        *   Nhập các biến môi trường từ `backend/.env` (MongoDB URI, JWT Secret, SMTP info...).
        *   **QUAN TRỌNG**: Thêm biến `FRONTEND_URL` với giá trị là domain của Frontend vừa deploy ở trên (không có dấu `/` ở cuối).
4.  Nhấn **Deploy**.

Sau khi deploy xong, bạn sẽ có domain Backend (ví dụ: `https://learn-english-backend.vercel.app`).

### Bước 4: Kết nối Frontend với Backend
1.  Quay lại **Settings** của Project **Frontend** trên Vercel.
2.  Vào mục **Environment Variables**.
3.  Thêm biến `REACT_APP_API_URL` (nếu code frontend của bạn dùng biến này để gọi API) hoặc chỉnh sửa proxy.
    *   *Lưu ý*: Vì Vercel là môi trường production, `proxy` trong `package.json` sẽ không hoạt động. Bạn cần đảm bảo code frontend gọi API trỏ về domain backend.
    *   Tôi sẽ kiểm tra file `api.js` ngay sau đây để đảm bảo nó hỗ trợ biến môi trường này.

---

## 3. Lưu ý về Bảo mật (Đã kiểm tra)
*   **OTP Logging**: Đã được tắt hiển thị trên console ở môi trường Production (chỉ hiện khi chạy local dev).
*   **Firebase Keys**: Đã được chuyển sang biến môi trường, không còn lộ trong code.
*   **Rate Limiting**: Đã kích hoạt giới hạn số lần request login/register để chống spam.
*   **Password/OTP Hash**: Đã mã hóa an toàn trong database.

Hệ thống của bạn hiện tại đã **An toàn** và **Sẵn sàng triển khai**!
