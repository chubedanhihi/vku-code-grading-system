# VKU Code Grading System ⚡
> **Hệ thống chấm bài lập trình tự động trực tuyến (Online Judge Platform)** dành cho sinh viên và giảng viên ngành CNTT — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU).

---

## 🚀 Giới thiệu & Tính năng nổi bật
* **Bộ máy chấm tự động (Judge Engine):** Biên dịch và thực thi cách ly đa ngôn ngữ (**C++, Java, Python**) bằng `ProcessBuilder`, kiểm soát giới hạn thời gian (Time Limit) và bộ nhớ (Memory Limit).
* **Phán quyết thời gian thực:** `ACCEPTED (AC)`, `WRONG_ANSWER (WA)`, `TIME_LIMIT_EXCEEDED (TLE)`, `COMPILE_ERROR (CE)`, `RUNTIME_ERROR (RE)` qua cơ chế Asynchronous Polling.
* **Code Editor chuẩn VS Code:** Tích hợp **Monaco Editor** với syntax highlighting, phím tắt và thụt lề thông minh.
* **Hệ thống xác thực & phân quyền (Role-Based Access Control):** Phân chia rõ vai trò **Sinh viên** (Làm bài, nộp code) và **Giảng viên** (Ra đề, quản lý bộ test cases).
* **🏆 Bảng xếp hạng sinh viên (Leaderboard):** Bục vinh danh Top 3 Podium (Quán quân 👑, Á quân 🥈, Quý quân 🥉), hệ thống danh hiệu (💎 Master, 🥇 Gold, 🥈 Silver, 🥉 Bronze), tỷ lệ AC% và điểm số tích lũy.
* **Kiến trúc Client - Server (3-Tier):**
  * **Frontend:** React 19, TypeScript, Vite, CSS Glassmorphism Dark Mode.
  * **Backend:** Java 17, Spring Boot 3.3.5, Spring Data JPA, Hibernate, BCrypt.
  * **Database:** MySQL 8.0 đóng gói qua Docker.
  * **CI/CD:** GitHub Actions tự động build & push Docker images lên Docker Hub.

---

## 🔑 Danh sách tài khoản thử nghiệm (Demo Accounts)

Tất cả các tài khoản demo đều dùng chung mật khẩu mặc định: **`123456`**

### 1. Tài khoản Giảng viên (Teacher)
| Tên tài khoản | Email | Mật khẩu | Quyền hạn |
| :--- | :--- | :---: | :--- |
| **`demo_teacher`** | teacher@vku.edu.vn | `123456` | 👨‍🏫 **Giảng viên** (Tạo đề bài mới, xóa bài, thêm/xóa test cases) |

### 2. Danh sách 11 Tài khoản Sinh viên (Student Leaderboard)
| STT | Tên tài khoản | Họ và tên sinh viên | Mật khẩu | Danh hiệu | Điểm | Số bài AC | Tỷ lệ AC% |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 🥇 1 | **`nguyen_van_an`** | Nguyễn Văn An | `123456` | 💎 **MASTER** | **400** | 3 / 3 | 100% |
| 🥈 2 | **`tran_thi_binh`** | Trần Thị Bình | `123456` | 🥇 **GOLD** | **300** | 2 / 3 | 66.7% |
| 🥉 3 | **`le_hoang_nam`** | Lê Hoàng Nam | `123456` | 🥇 **GOLD** | **200** | 2 / 3 | 100% |
| 4 | **`demo_student`** | Sinh viên Demo | `123456` | 🥇 **GOLD** | **200** | 2 / 3 | 66.7% |
| 5 | **`pham_quoc_huy`** | Phạm Quốc Huy | `123456` | 🥇 **GOLD** | **200** | 2 / 3 | 66.7% |
| 6 | **`dang_thu_thao`** | Đặng Thu Thảo | `123456` | 🥇 **GOLD** | **200** | 1 / 3 | 100% |
| 7 | **`vo_minh_tri`** | Võ Minh Trí | `123456` | 🥈 **SILVER** | **100** | 1 / 3 | 50.0% |
| 8 | **`hoang_gia_bao`** | Hoàng Gia Bảo | `123456` | 🥈 **SILVER** | **100** | 1 / 3 | 33.3% |
| 9 | **`bui_phuong_linh`** | Bùi Phương Linh | `123456` | 🥉 **BRONZE** | **0** | 0 / 3 | 0% |
| 10 | **`doan_van_hau`** | Đoàn Văn Hậu | `123456` | 🥉 **BRONZE** | **0** | 0 / 3 | 0% |
| 11 | **`truong_quynh_nga`** | Trương Quỳnh Nga | `123456` | 🥉 **BRONZE** | **0** | 0 / 3 | 0% |

> 💡 **Mẹo:** Trên giao diện Đăng nhập, bạn có thể bấm nút **⚡ Sinh viên (demo_student)** hoặc **⚡ Giảng viên (demo_teacher)** để tự động điền tài khoản chỉ với 1 cú click!

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### Cách 1: Khởi chạy 1-Click (Khuyên dùng trên Windows)
Chỉ cần nhấp đúp vào file **`start.bat`** ở thư mục gốc dự án:
```cmd
start.bat
```
Script sẽ tự động khởi động:
1. Docker MySQL Container (port `3307`)
2. Spring Boot Backend (port `8080`)
3. React Vite Frontend (port `5173`)

### Cách 2: Khởi chạy thủ công từng phần
1. **Khởi động Database:**
   ```bash
   docker-compose up -d
   ```
2. **Khởi động Backend:**
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
3. **Khởi động Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Truy cập hệ thống tại: **[http://localhost:5173/](http://localhost:5173/)**
