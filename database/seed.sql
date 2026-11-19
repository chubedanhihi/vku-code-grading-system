USE vku_judge;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE submissions;
TRUNCATE TABLE test_cases;
TRUNCATE TABLE problems;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Demo Users (1 Giảng viên + 11 Sinh viên)
INSERT INTO users (id, username, email, password_hash, role) VALUES 
(1, 'demo_student', 'demo@vku.edu.vn', '123456', 'STUDENT'),
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
(12, 'truong_quynh_nga', 'nga.tq@vku.udn.vn', '123456', 'STUDENT');

-- 2. Problems
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, created_by) VALUES 
(1, 'Hello World', 'In ra màn hình dòng chữ "Hello, World!" (không có dấu ngoặc kép).\n\n**Output:** In ra một dòng: `Hello, World!`', 'EASY', 1000, 256, 2),
(2, 'Tính tổng hai số A + B', 'Cho hai số nguyên A và B, tính và in ra tổng A + B.\n\n**Input:** Một dòng chứa hai số nguyên A và B cách nhau bởi dấu cách (-10^9 ≤ A, B ≤ 10^9).\n\n**Output:** In ra một số nguyên là tổng A + B.\n\n**Ví dụ:**\n- Input: `3 5` → Output: `8`\n- Input: `-1 1` → Output: `0`', 'EASY', 1000, 256, 2),
(3, 'Số Fibonacci thứ N', 'Dãy Fibonacci: F(1) = 1, F(2) = 1, F(n) = F(n-1) + F(n-2).\n\nCho số nguyên N, in ra số Fibonacci thứ N.\n\n**Input:** Một số nguyên N (1 ≤ N ≤ 40)\n\n**Output:** In ra F(N).\n\n**Ví dụ:**\n- Input: `1` → Output: `1`\n- Input: `10` → Output: `55`', 'MEDIUM', 2000, 256, 2);

-- 3. Test cases
-- Problem 1 (Hello World)
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES 
(1, '', 'Hello, World!', true);

-- Problem 2 (A + B)
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES 
(2, '3 5', '8', true),
(2, '-1 1', '0', false),
(2, '1000000000 1000000000', '2000000000', false),
(2, '0 0', '0', false);

-- Problem 3 (Fibonacci)
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES 
(3, '1', '1', true),
(3, '10', '55', true),
(3, '20', '6765', false),
(3, '40', '102334155', false);

-- 4. Submissions (Dữ liệu thi đấu Bảng xếp hạng)
INSERT INTO submissions (user_id, problem_id, language, source_code, status, execution_time_ms, memory_used_kb) VALUES
(1, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 123, 2048),
(1, 2, 'PYTHON', 'a, b = map(int, input().split())\nprint(a + b)', 'ACCEPTED', 192, 4096),
(1, 2, 'PYTHON', 'print("wrong")', 'WRONG_ANSWER', 100, 4096),
(3, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 85, 2048),
(3, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){long long a,b;cin>>a>>b;cout<<a+b;return 0;}', 'ACCEPTED', 92, 2048),
(3, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int n;cin>>n;long long f[45]={0,1,1};for(int i=3;i<=n;i++)f[i]=f[i-1]+f[i-2];cout<<f[n];return 0;}', 'ACCEPTED', 110, 2048),
(4, 2, 'PYTHON', 'a, b = map(int, input().split())\nprint(a + b)', 'ACCEPTED', 120, 4096),
(4, 3, 'PYTHON', 'def fib(n): return 1 if n<=2 else fib(n-1)+fib(n-2)\nprint(fib(int(input())))', 'ACCEPTED', 145, 4096),
(4, 1, 'PYTHON', 'print("Hello World")', 'WRONG_ANSWER', 105, 4096),
(5, 1, 'JAVA', 'public class Main{public static void main(String[] args){System.out.println("Hello, World!");}}', 'ACCEPTED', 150, 16384),
(5, 2, 'JAVA', 'import java.util.Scanner;\npublic class Main{public static void main(String[] args){Scanner sc=new Scanner(System.in);System.out.println(sc.nextLong()+sc.nextLong());}}', 'ACCEPTED', 170, 16384),
(6, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 88, 2048),
(6, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){long long a,b;cin>>a>>b;cout<<a+b;return 0;}', 'ACCEPTED', 95, 2048),
(6, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){while(true); return 0;}', 'TIME_LIMIT_EXCEEDED', 2000, 2048),
(7, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int n;cin>>n;long long f[45]={0,1,1};for(int i=3;i<=n;i++)f[i]=f[i-1]+f[i-2];cout<<f[n];return 0;}', 'ACCEPTED', 98, 2048),
(8, 2, 'PYTHON', 'a, b = map(int, input().split())\nprint(a + b)', 'ACCEPTED', 130, 4096),
(8, 1, 'PYTHON', 'print("hello world")', 'WRONG_ANSWER', 110, 4096),
(9, 1, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout << "Hello, World!"; return 0;}', 'ACCEPTED', 82, 2048),
(9, 2, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a-b;return 0;}', 'WRONG_ANSWER', 90, 2048),
(9, 3, 'CPP', '#include <iostream>\nusing namespace std;\nint main(){cout<<0;return 0;}', 'WRONG_ANSWER', 92, 2048),
(10, 1, 'CPP', 'int main(){cout << Hello World;}', 'COMPILE_ERROR', 0, 0),
(11, 2, 'PYTHON', 'print("0")', 'WRONG_ANSWER', 120, 4096),
(11, 3, 'PYTHON', 'print("0")', 'WRONG_ANSWER', 115, 4096),
(12, 1, 'JAVA', 'class Main{public static void main(String[] args){}}', 'WRONG_ANSWER', 160, 16384);
