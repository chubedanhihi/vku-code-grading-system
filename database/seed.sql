USE vku_judge;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE submissions;
TRUNCATE TABLE test_cases;
TRUNCATE TABLE problems;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Demo Users (Student & Teacher)
INSERT INTO users (id, username, email, password_hash, role) VALUES 
(1, 'demo_student', 'demo@vku.edu.vn', '123456', 'STUDENT'),
(2, 'demo_teacher', 'teacher@vku.edu.vn', '123456', 'TEACHER');

-- 2. Problems
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, created_by)
VALUES 
(1, 'Hello World', 'In ra màn hình dòng chữ "Hello, World!" (không có dấu ngoặc kép).\n\n**Output:** In ra một dòng: `Hello, World!`', 'EASY', 1000, 256, 1),
(2, 'Tính tổng hai số A + B', 'Cho hai số nguyên A và B, tính và in ra tổng A + B.\n\n**Input:** Một dòng chứa hai số nguyên A và B cách nhau bởi dấu cách (-10^9 ≤ A, B ≤ 10^9).\n\n**Output:** In ra một số nguyên là tổng A + B.\n\n**Ví dụ:**\n- Input: `3 5` → Output: `8`\n- Input: `-1 1` → Output: `0`', 'EASY', 1000, 256, 1),
(3, 'Số Fibonacci thứ N', 'Dãy Fibonacci: F(1) = 1, F(2) = 1, F(n) = F(n-1) + F(n-2).\n\nCho số nguyên N, in ra số Fibonacci thứ N.\n\n**Input:** Một số nguyên N (1 ≤ N ≤ 40)\n\n**Output:** In ra F(N).\n\n**Ví dụ:**\n- Input: `1` → Output: `1`\n- Input: `10` → Output: `55`', 'MEDIUM', 2000, 256, 1);

-- 3. Test cases
-- Problem 1 (Hello World)
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample)
VALUES (1, '', 'Hello, World!', true);

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
