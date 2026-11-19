-- ========================================================
-- VKU Code Grading System — Database Schema + Sample Data
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'TEACHER', 'ADMIN') DEFAULT 'STUDENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo user mặc định để demo (không cần đăng nhập)
INSERT IGNORE INTO users (id, username, email, password_hash, role) VALUES 
(1, 'demo_student', 'demo@vku.edu.vn', '123456', 'STUDENT'),
(2, 'demo_teacher', 'teacher@vku.edu.vn', '123456', 'TEACHER');

CREATE TABLE IF NOT EXISTS problems (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'EASY',
    time_limit_ms INT DEFAULT 1000,
    memory_limit_mb INT DEFAULT 256,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS test_cases (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    problem_id BIGINT NOT NULL,
    language ENUM('C', 'CPP', 'JAVA', 'PYTHON') NOT NULL,
    source_code TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    execution_time_ms INT DEFAULT 0,
    memory_used_kb INT DEFAULT 0,
    error_message TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- ========================================================
-- Sample Data: 3 bài tập mẫu
-- ========================================================

-- Bài 1: Hello World (EASY)
INSERT IGNORE INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, created_by)
VALUES (1, 'Hello World', 
'In ra màn hình dòng chữ "Hello, World!" (không có dấu ngoặc kép).\n\n**Input:** Không có input.\n\n**Output:** In ra một dòng: Hello, World!\n\n**Ví dụ:**\n- Output: `Hello, World!`',
'EASY', 1000, 256, 1);

INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample)
VALUES (1, '', 'Hello, World!', true);

-- Bài 2: Tổng hai số (EASY)
INSERT IGNORE INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, created_by)
VALUES (2, 'Tổng hai số A+B',
'Cho hai số nguyên A và B, tính và in ra tổng A + B.\n\n**Input:** Một dòng chứa hai số nguyên A và B cách nhau bởi dấu cách. (-10^9 ≤ A, B ≤ 10^9)\n\n**Output:** In ra một số nguyên là tổng A + B.\n\n**Ví dụ:**\n- Input: `3 5` → Output: `8`\n- Input: `-1 1` → Output: `0`',
'EASY', 1000, 256, 1);

INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (2, '3 5', '8', true);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (2, '-1 1', '0', false);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (2, '1000000000 1000000000', '2000000000', false);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (2, '0 0', '0', false);

-- Bài 3: Số Fibonacci (MEDIUM)
INSERT IGNORE INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, created_by)
VALUES (3, 'Số Fibonacci thứ N',
'Dãy Fibonacci được định nghĩa như sau: F(1) = 1, F(2) = 1, F(n) = F(n-1) + F(n-2).\n\nCho số nguyên N, hãy in ra số Fibonacci thứ N.\n\n**Input:** Một số nguyên N (1 ≤ N ≤ 40)\n\n**Output:** In ra F(N).\n\n**Ví dụ:**\n- Input: `1` → Output: `1`\n- Input: `10` → Output: `55`',
'MEDIUM', 2000, 256, 1);

INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (3, '1', '1', true);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (3, '10', '55', true);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (3, '20', '6765', false);
INSERT IGNORE INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES (3, '40', '102334155', false);
