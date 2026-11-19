USE vku_judge;

-- 1. Insert Demo Teacher and 10 Demo Students
-- Mật khẩu mặc định cho tất cả: 123456
INSERT INTO users (id, username, email, password_hash, role) VALUES 
(2, 'demo_teacher', 'teacher@vku.edu.vn', '123456', 'TEACHER'),
(3, 'nguyen_van_an', 'an.nv@vku.udn.vn', '123456', 'STUDENT'),
(4, 'tran_thi_binh', 'binh.tt@vku.udn.vn', '123456', 'STUDENT'),
(5, 'le_hoang_nam', 'nam.lh@vku.udn.vn', '123456', 'STUDENT'),
(6, 'pham_quoc_huy', 'huy.pq@vku.udn.vn', '123456', 'STUDENT'),
(7, 'dang_thu_thao', 'thao.dt@vku.udn.vn', '123456', 'STUDENT'),
(8, 'vo_minh_tri', 'tri.vm@vku.udn.vn', '123456', 'STUDENT'),
(9, 'hoang_gia_bao', 'bao.hg@vku.udn.vn', '123456', 'STUDENT'),
(10, 'bui_phuong_linh', 'linh.bp@vku.udn.vn', '123456', 'STUDENT'),
(11, 'doan_van_hau', 'hau.dv@vku.udn.vn', '123456', 'STUDENT'),
(12, 'truong_quynh_nga', 'nga.tq@vku.udn.vn', '123456', 'STUDENT')
ON DUPLICATE KEY UPDATE 
    username=VALUES(username),
    email=VALUES(email),
    password_hash=VALUES(password_hash),
    role=VALUES(role);

-- 2. Insert Submissions for Demo Students to create diverse Leaderboard
-- Problem 1 (Hello World - EASY - 100 pts)
-- Problem 2 (A + B - EASY - 100 pts)
-- Problem 3 (Fibonacci - MEDIUM - 200 pts)

INSERT INTO submissions (user_id, problem_id, language, source_code, status, execution_time_ms, memory_used_kb) VALUES
-- nguyen_van_an (ID 3): Giải được cả 3 bài (Top 1 Master - 400 pts, 100% AC)
(3, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 85, 2048),
(3, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){long long a,b;cin>>a>>b;cout<<a+b;return 0;}', 'ACCEPTED', 92, 2048),
(3, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int n;cin>>n;long long f[45]={0,1,1};for(int i=3;i<=n;i++)f[i]=f[i-1]+f[i-2];cout<<f[n];return 0;}', 'ACCEPTED', 110, 2048),

-- tran_thi_binh (ID 4): Giải được 2 bài: #2 và #3 (Top 2 Gold - 300 pts, 3 lần nộp, 1 WA)
(4, 2, 'PYTHON', 'a, b = map(int, input().split())\nprint(a + b)', 'ACCEPTED', 120, 4096),
(4, 3, 'PYTHON', 'def fib(n):\n    a, b = 1, 1\n    for _ in range(n-1): a, b = b, a+b\n    return a\nprint(fib(int(input())))', 'ACCEPTED', 145, 4096),
(4, 1, 'PYTHON', 'print("Hello World")', 'WRONG_ANSWER', 105, 4096),

-- le_hoang_nam (ID 5): Giải được 2 bài: #1 và #2 (Top 3 Gold - 200 pts, 2 lần nộp)
(5, 1, 'JAVA', 'public class Main{public static void main(String[] args){System.out.println("Hello, World!");}}', 'ACCEPTED', 150, 16384),
(5, 2, 'JAVA', 'import java.util.Scanner;\npublic class Main{public static void main(String[] args){Scanner sc=new Scanner(System.in);System.out.println(sc.nextLong()+sc.nextLong());}}', 'ACCEPTED', 170, 16384),

-- pham_quoc_huy (ID 6): Giải được 2 bài: #1 và #2 (Top 4 Gold - 200 pts, 3 lần nộp, 1 TLE)
(6, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 88, 2048),
(6, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){long long a,b;cin>>a>>b;cout<<a+b;return 0;}', 'ACCEPTED', 95, 2048),
(6, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){while(true); return 0;}', 'TIME_LIMIT_EXCEEDED', 2000, 2048),

-- dang_thu_thao (ID 7): Giải được 1 bài: #3 (Top 5 Silver - 200 pts)
(7, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int n;cin>>n;long long f[45]={0,1,1};for(int i=3;i<=n;i++)f[i]=f[i-1]+f[i-2];cout<<f[n];return 0;}', 'ACCEPTED', 98, 2048),

-- vo_minh_tri (ID 8): Giải được 1 bài: #2 (Top 6 Silver - 100 pts, 2 lần nộp)
(8, 2, 'PYTHON', 'a, b = map(int, input().split())\nprint(a + b)', 'ACCEPTED', 130, 4096),
(8, 1, 'PYTHON', 'print("hello world")', 'WRONG_ANSWER', 110, 4096),

-- hoang_gia_bao (ID 9): Giải được 1 bài: #1 (Top 7 Silver - 100 pts, 3 lần nộp, 2 WA)
(9, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 82, 2048),
(9, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a-b;return 0;}', 'WRONG_ANSWER', 90, 2048),
(9, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout<<0;return 0;}', 'WRONG_ANSWER', 92, 2048),

-- bui_phuong_linh (ID 10): Chưa giải được bài nào (Bronze - 0 pts, 1 lần nộp Compile Error)
(10, 1, 'CPP', 'int main(){cout << Hello World;}', 'COMPILE_ERROR', 0, 0),

-- doan_van_hau (ID 11): Chưa giải được bài nào (Bronze - 0 pts, 2 lần nộp WA)
(11, 2, 'PYTHON', 'print("0")', 'WRONG_ANSWER', 120, 4096),
(11, 3, 'PYTHON', 'print("0")', 'WRONG_ANSWER', 115, 4096),

-- truong_quynh_nga (ID 12): Mới tạo tài khoản, chưa nộp bài nào (Bronze - 0 pts)
(12, 1, 'JAVA', 'class Main{public static void main(String[] args){}}', 'WRONG_ANSWER', 160, 16384);
