USE vku_judge;

-- =========================================================================
-- 1. THÊM 10 BÀI TẬP TỪ DỄ ĐẾN KHÓ (ID 4 -> 13)
-- =========================================================================

-- Bài 4: Kiểm tra số nguyên tố (EASY)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  4,
  'Kiểm tra số nguyên tố',
  'Cho một số nguyên dương N. Hãy kiểm tra xem N có phải là số nguyên tố hay không.\n\nMột số nguyên tố là số nguyên lớn hơn 1 và chỉ chia hết cho 1 và chính nó.\n\n**Đầu vào (Input):**\n- Một dòng duy nhất chứa số nguyên N (1 ≤ N ≤ 10^9).\n\n**Đầu ra (Output):**\n- In ra `YES` nếu N là số nguyên tố, ngược lại in ra `NO`.\n\n**Ví dụ:**\n- Input: `7` → Output: `YES`\n- Input: `10` → Output: `NO`',
  'EASY',
  1000,
  256,
  'EXACT',
  'Math,Number Theory',
  'Cơ bản năm nhất',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 5: Đảo ngược chuỗi ký tự (EASY)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  5,
  'Đảo ngược chuỗi ký tự',
  'Cho một chuỗi ký tự S có độ dài không vượt quá 1000 ký tự. Hãy in ra chuỗi đảo ngược của S.\n\n**Đầu vào (Input):**\n- Một dòng duy nhất chứa chuỗi ký tự S (có thể bao gồm khoảng trắng).\n\n**Đầu ra (Output):**\n- In ra chuỗi S sau khi đã đảo ngược thứ tự các ký tự.\n\n**Ví dụ:**\n- Input: `hello` → Output: `olleh`\n- Input: `VKU Judge` → Output: `egduJ UKV`',
  'EASY',
  1000,
  256,
  'EXACT',
  'String,Implementation',
  'Cơ bản năm nhất',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 6: Tìm phần tử lớn nhất và nhỏ nhất trong mảng (EASY)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  6,
  'Phần tử lớn nhất và nhỏ nhất',
  'Cho dãy số gồm N số nguyên A1, A2, ..., AN. Hãy tìm giá trị nhỏ nhất (Min) và giá trị lớn nhất (Max) trong dãy số đó.\n\n**Đầu vào (Input):**\n- Dòng đầu tiên chứa số nguyên N (1 ≤ N ≤ 10^5).\n- Dòng thứ hai chứa N số nguyên A1, A2, ..., AN (-10^9 ≤ Ai ≤ 10^9), mỗi số cách nhau bởi một dấu cách.\n\n**Đầu ra (Output):**\n- In ra giá trị nhỏ nhất và lớn nhất cách nhau bởi một dấu cách.\n\n**Ví dụ:**\n- Input:\n```\n5\n3 1 4 1 5\n```\n→ Output: `1 5`',
  'EASY',
  1000,
  256,
  'EXACT',
  'Array,Implementation',
  'Cơ bản năm nhất',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 7: Kiểm tra chuỗi đối xứng (Palindrome) (EASY)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  7,
  'Chuỗi đối xứng (Palindrome)',
  'Một chuỗi ký tự được gọi là Palindrome nếu đọc từ trái sang phải hay từ phải sang trái đều giống nhau. Cho chuỗi S chỉ gồm các chữ cái in thường, kiểm tra xem S có phải là Palindrome không.\n\n**Đầu vào (Input):**\n- Một dòng duy nhất chứa chuỗi S (độ dài 1 ≤ |S| ≤ 10^5).\n\n**Đầu ra (Output):**\n- In ra `YES` nếu chuỗi là Palindrome, ngược lại in ra `NO`.\n\n**Ví dụ:**\n- Input: `radar` → Output: `YES`\n- Input: `algorithm` → Output: `NO`',
  'EASY',
  1000,
  256,
  'EXACT',
  'String,Two Pointers',
  'Cơ bản năm nhất',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 8: Giai thừa số lớn chia dư (MEDIUM)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  8,
  'Giai thừa số lớn chia dư',
  'Cho một số nguyên dương N. Hãy tính giá trị của N! = 1 × 2 × 3 × ... × N theo modulo (10^9 + 7).\n\n**Đầu vào (Input):**\n- Một dòng chứa số nguyên dương N (1 ≤ N ≤ 10^6).\n\n**Đầu ra (Output):**\n- In ra phần dư của N! khi chia cho 10^9 + 7.\n\n**Ví dụ:**\n- Input: `5` → Output: `120`\n- Input: `10` → Output: `3628800`',
  'MEDIUM',
  1000,
  256,
  'EXACT',
  'Math,Modulo',
  'Toán rời rạc & Thuật toán',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 9: Tìm kiếm nhị phân (Binary Search) (MEDIUM)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  9,
  'Tìm kiếm nhị phân (Binary Search)',
  'Cho dãy số đã được sắp xếp tăng dần gồm N số nguyên và một giá trị cần tìm X. Hãy xác định vị trí đầu tiên xuất hiện của X trong dãy (vị trí tính từ 1). Nếu không tìm thấy, in ra `-1`.\n\n**Đầu vào (Input):**\n- Dòng 1: Hai số nguyên N và X (1 ≤ N ≤ 2 × 10^5, -10^9 ≤ X ≤ 10^9).\n- Dòng 2: N số nguyên tăng dần cách nhau dấu cách.\n\n**Đầu ra (Output):**\n- Chỉ số đầu tiên (1-based index) của phần tử có giá trị bằng X, hoặc `-1` nếu không có.\n\n**Ví dụ:**\n- Input:\n```\n5 3\n1 2 3 4 5\n```\n→ Output: `3`',
  'MEDIUM',
  1000,
  256,
  'EXACT',
  'Binary Search,Array',
  'Cấu trúc dữ liệu & Giải thuật',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 10: Dãy con có tổng lớn nhất (Kadane) (MEDIUM)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  10,
  'Dãy con liên tiếp có tổng lớn nhất',
  'Cho mảng A gồm N số nguyên. Hãy tìm một đoạn con liên tiếp khác rỗng của mảng có tổng các phần tử đạt giá trị lớn nhất (Thuật toán Kadane).\n\n**Đầu vào (Input):**\n- Dòng 1 chứa số nguyên N (1 ≤ N ≤ 10^5).\n- Dòng 2 chứa N số nguyên A1, A2, ..., AN (-10^9 ≤ Ai ≤ 10^9).\n\n**Đầu ra (Output):**\n- In ra tổng lớn nhất tìm được.\n\n**Ví dụ:**\n- Input:\n```\n8\n-2 -3 4 -1 -2 1 5 -3\n```\n→ Output: `7` (Đoạn `4, -1, -2, 1, 5`)',
  'MEDIUM',
  1000,
  256,
  'EXACT',
  'Dynamic Programming,Array',
  'Cấu trúc dữ liệu & Giải thuật',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 11: Bài toán xếp ba lô 0/1 (0/1 Knapsack) (MEDIUM)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  11,
  'Bài toán xếp ba lô 0/1 (Knapsack)',
  'Có N đồ vật, đồ vật thứ i có khối lượng Wi và giá trị Vi. Bạn có một chiếc ba lô có thể mang tải trọng tối đa là M. Hãy chọn một tập hợp các đồ vật sao cho tổng khối lượng không vượt quá M và tổng giá trị thu được là lớn nhất.\n\n**Đầu vào (Input):**\n- Dòng 1: Hai số nguyên N và M (1 ≤ N ≤ 100, 1 ≤ M ≤ 1000).\n- N dòng tiếp theo, mỗi dòng chứa hai số nguyên Wi và Vi (1 ≤ Wi ≤ M, 1 ≤ Vi ≤ 10000).\n\n**Đầu ra (Output):**\n- Giá trị lớn nhất có thể đạt được.\n\n**Ví dụ:**\n- Input:\n```\n4 10\n4 20\n3 15\n5 25\n2 12\n```\n→ Output: `52`',
  'MEDIUM',
  1000,
  256,
  'EXACT',
  'Dynamic Programming',
  'Cấu trúc dữ liệu & Giải thuật',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 12: Đường đi ngắn nhất Dijkstra (HARD)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  12,
  'Đường đi ngắn nhất (Dijkstra)',
  'Cho đồ thị có hướng gồm N đỉnh (đánh số từ 1 đến N) và M cạnh có trọng số dương. Hãy tìm độ dài đường đi ngắn nhất từ đỉnh 1 đến đỉnh N. Nếu không tồn tại đường đi, in ra `-1`.\n\n**Đầu vào (Input):**\n- Dòng 1: Hai số nguyên N và M (2 ≤ N ≤ 10^4, 1 ≤ M ≤ 10^5).\n- M dòng tiếp theo, mỗi dòng gồm 3 số nguyên u, v, w mô tả cạnh có hướng từ u đến v với trọng số w (1 ≤ u, v ≤ N, 1 ≤ w ≤ 10^4).\n\n**Đầu ra (Output):**\n- Khoảng cách ngắn nhất từ đỉnh 1 đến đỉnh N, hoặc `-1` nếu không đến được.\n\n**Ví dụ:**\n- Input:\n```\n4 5\n1 2 1\n2 4 4\n1 3 2\n3 4 1\n1 4 10\n```\n→ Output: `3`',
  'HARD',
  2000,
  256,
  'EXACT',
  'Graph,Dijkstra,Shortest Path',
  'Lập trình thi đấu nâng cao',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);

-- Bài 13: Đếm số đường đi trên ma trận có chướng ngại vật (HARD)
INSERT INTO problems (id, title, description, difficulty, time_limit_ms, memory_limit_mb, checker_mode, tags, study_plan, created_by)
VALUES (
  13,
  'Đường đi ma trận có chướng ngại vật',
  'Cho một ma trận kích thước R × C. Một robot bắt đầu từ ô (1, 1) muốn đi đến ô đích (R, C). Tại mỗi bước, robot chỉ có thể di chuyển sang phải một ô hoặc xuống dưới một ô. Trên ma trận có một số ô chứa chướng ngại vật (giá trị 1) mà robot không thể đi qua, các ô trống có giá trị 0.\n\nHãy đếm số cách di chuyển khác nhau từ (1, 1) đến (R, C). Vì kết quả có thể rất lớn, hãy in ra phần dư của kết quả khi chia cho (10^9 + 7).\n\n**Đầu vào (Input):**\n- Dòng 1: Hai số nguyên R và C (1 ≤ R, C ≤ 1000).\n- R dòng tiếp theo, mỗi dòng chứa C số nguyên (0 hoặc 1).\n\n**Đầu ra (Output):**\n- Số đường đi hợp lệ modulo (10^9 + 7).\n\n**Ví dụ:**\n- Input:\n```\n3 3\n0 0 0\n0 1 0\n0 0 0\n```\n→ Output: `2`',
  'HARD',
  2000,
  256,
  'EXACT',
  'Dynamic Programming,Grid',
  'Lập trình thi đấu nâng cao',
  2
) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), difficulty=VALUES(difficulty), tags=VALUES(tags), study_plan=VALUES(study_plan);


-- =========================================================================
-- 2. THÊM BỘ TEST CASES CHO 10 BÀI TẬP MỚI
-- =========================================================================
DELETE FROM test_cases WHERE problem_id >= 4 AND problem_id <= 13;

-- Test cases Bài 4: Số nguyên tố
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(4, '7', 'YES', 1),
(4, '10', 'NO', 1),
(4, '1', 'NO', 0),
(4, '999999937', 'YES', 0);

-- Test cases Bài 5: Đảo ngược chuỗi
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(5, 'hello', 'olleh', 1),
(5, 'VKU Judge', 'egduJ UKV', 1),
(5, 'a', 'a', 0),
(5, 'Competitive Programming', 'gnimmargorP evititepmoC', 0);

-- Test cases Bài 6: Min Max
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(6, '5\n3 1 4 1 5', '1 5', 1),
(6, '3\n-10 0 10', '-10 10', 1),
(6, '1\n42', '42 42', 0),
(6, '6\n-999999999 5 0 123 999999999 -500', '-999999999 999999999', 0);

-- Test cases Bài 7: Palindrome
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(7, 'radar', 'YES', 1),
(7, 'algorithm', 'NO', 1),
(7, 'racecar', 'YES', 0),
(7, 'ab', 'NO', 0);

-- Test cases Bài 8: Factorial Modulo
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(8, '5', '120', 1),
(8, '10', '3628800', 1),
(8, '1', '1', 0),
(8, '20', '146326063', 0);

-- Test cases Bài 9: Binary Search
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(9, '5 3\n1 2 3 4 5', '3', 1),
(9, '4 6\n1 3 5 7', '-1', 1),
(9, '6 2\n2 2 2 4 5 6', '1', 0),
(9, '3 100\n10 20 30', '-1', 0);

-- Test cases Bài 10: Kadane
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(10, '8\n-2 -3 4 -1 -2 1 5 -3', '7', 1),
(10, '5\n-1 -2 -3 -4 -5', '-1', 1),
(10, '4\n1 2 3 4', '10', 0),
(10, '6\n5 -2 3 -1 2 -5', '7', 0);

-- Test cases Bài 11: 0/1 Knapsack
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(11, '4 10\n4 20\n3 15\n5 25\n2 12', '52', 1),
(11, '3 5\n2 3\n3 4\n4 5', '7', 1),
(11, '1 10\n5 50', '50', 0),
(11, '3 2\n3 10\n4 20\n5 30', '0', 0);

-- Test cases Bài 12: Dijkstra
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(12, '4 5\n1 2 1\n2 4 4\n1 3 2\n3 4 1\n1 4 10', '3', 1),
(12, '3 1\n1 2 5', '-1', 1),
(12, '2 1\n1 2 100', '100', 0),
(12, '5 6\n1 2 2\n2 3 3\n3 5 4\n1 4 5\n4 5 2\n1 5 15', '7', 0);

-- Test cases Bài 13: Grid Obstacles
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(13, '3 3\n0 0 0\n0 1 0\n0 0 0', '2', 1),
(13, '2 2\n0 1\n1 0', '0', 1),
(13, '1 1\n0', '1', 0),
(13, '3 3\n0 0 0\n0 0 0\n0 0 0', '6', 0);


-- =========================================================================
-- 3. THÊM 10 LỚP HỌC LMS (CLASSROOMS)
-- =========================================================================
INSERT INTO classrooms (id, name, description, join_code, teacher_id) VALUES
(1, 'Cơ sở Lập trình C/C++ - 24IT1', 'Học phần lập trình cơ sở dành cho tân sinh viên khóa 2024. Thực hành cú pháp, rẽ nhánh, vòng lặp và mảng.', 'VKU101', 2),
(2, 'Kỹ thuật Lập trình nâng cao - 24IT2', 'Nghiên cứu con trỏ, quản lý bộ nhớ động, đệ quy, chuỗi ký tự và cấu trúc dữ liệu struct.', 'VKU102', 2),
(3, 'Cấu trúc Dữ liệu & Giải thuật - 23IT1', 'Thực hành danh sách liên kết, ngăn xếp (Stack), hàng đợi (Queue), cây nhị phân và bảng băm.', 'VKU201', 2),
(4, 'Cấu trúc Dữ liệu & Giải thuật - 23IT2', 'Trọng tâm thuật toán: Tìm kiếm nhị phân, các thuật toán sắp xếp (QuickSort, MergeSort) và Quy hoạch động.', 'VKU202', 2),
(5, 'Lập trình Hướng đối tượng Java - 23IT3', 'Lớp học phần OOP Java: Đóng gói, Kế thừa, Đa hình, Trừu tượng hóa và Xử lý ngoại lệ chuẩn doanh nghiệp.', 'VKU203', 2),
(6, 'Lý thuyết Đồ thị & Ứng dụng - 22IT1', 'Chuyên đề thuật toán đồ thị: Duyệt BFS/DFS, Tìm đường đi ngắn nhất Dijkstra/Bellman-Ford, Cây khung tối thiểu.', 'VKU301', 2),
(7, 'Thiết kế & Phân tích Thuật toán - 22IT2', 'Độ phức tạp thuật toán Big-O, thuật toán Chia để trị, Tham lam (Greedy) và Quy hoạch động nhiều chiều.', 'VKU302', 2),
(8, 'Luyện thi Olympic Tin học Sinh viên - ĐT1', 'Lớp chuyên ban Olympic Tin học và kỳ thi lập trình sinh viên ICPC Quốc gia.', 'VKU401', 2),
(9, 'Luyện thi Olympic Tin học Sinh viên - ĐT2', 'Chuyên đề rèn luyện các thuật toán cấu trúc dữ liệu nâng cao: Segment Tree, Fenwick, Trie, DSU.', 'VKU402', 2),
(10, 'Lập trình Python cho Khoa học Dữ liệu - 23DS1', 'Xử lý chuỗi, mảng đa chiều, thư viện thuật toán với ngôn ngữ Python dành cho sinh viên ngành Khoa học dữ liệu.', 'VKU501', 2)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), join_code=VALUES(join_code);

-- Gán sinh viên vào các lớp học (Classroom Members)
DELETE FROM classroom_members WHERE classroom_id >= 1 AND classroom_id <= 10;
INSERT INTO classroom_members (classroom_id, user_id) VALUES
-- Lớp 1 (VKU101): Tất cả sinh viên
(1, 1), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12),
-- Lớp 2 (VKU102)
(2, 1), (2, 3), (2, 4), (2, 5), (2, 6),
-- Lớp 3 (VKU201)
(3, 1), (3, 3), (3, 5), (3, 7), (3, 9), (3, 11),
-- Lớp 4 (VKU202)
(4, 1), (4, 4), (4, 6), (4, 8), (4, 10), (4, 12),
-- Lớp 5 (VKU203)
(5, 1), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7),
-- Lớp 6 (VKU301)
(6, 1), (6, 3), (6, 5), (6, 7),
-- Lớp 7 (VKU302)
(7, 1), (7, 3), (7, 4), (7, 5),
-- Lớp 8 (VKU401 - Đội tuyển)
(8, 1), (8, 3), (8, 4), (8, 5),
-- Lớp 9 (VKU402)
(9, 3), (9, 4), (9, 5), (9, 6),
-- Lớp 10 (VKU501)
(10, 1), (10, 7), (10, 8), (10, 9), (10, 10);

-- Giao bài tập cho các lớp học (Classroom Assignments)
DELETE FROM classroom_assignments WHERE classroom_id >= 1 AND classroom_id <= 10;
INSERT INTO classroom_assignments (classroom_id, problem_id, week_label, due_at, allow_late) VALUES
(1, 1, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 7 DAY), 1),
(1, 2, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 7 DAY), 1),
(1, 4, 'Tuần 2', DATE_ADD(NOW(), INTERVAL 14 DAY), 1),
(2, 5, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 5 DAY), 1),
(2, 6, 'Tuần 2', DATE_ADD(NOW(), INTERVAL 12 DAY), 1),
(3, 3, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 7 DAY), 1),
(3, 9, 'Tuần 2', DATE_ADD(NOW(), INTERVAL 14 DAY), 1),
(4, 10, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 8 DAY), 1),
(4, 11, 'Tuần 2', DATE_ADD(NOW(), INTERVAL 15 DAY), 1),
(6, 12, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 10 DAY), 1),
(7, 13, 'Tuần 1', DATE_ADD(NOW(), INTERVAL 10 DAY), 1),
(8, 10, 'Chuyên đề 1', DATE_ADD(NOW(), INTERVAL 3 DAY), 1),
(8, 11, 'Chuyên đề 2', DATE_ADD(NOW(), INTERVAL 6 DAY), 1),
(8, 12, 'Chuyên đề 3', DATE_ADD(NOW(), INTERVAL 9 DAY), 1);


-- =========================================================================
-- 4. THÊM 5 KỲ THI LẬP TRÌNH (CONTESTS)
-- =========================================================================
DELETE FROM contest_problems WHERE contest_id >= 1 AND contest_id <= 5;
DELETE FROM contest_registrations WHERE contest_id >= 1 AND contest_id <= 5;

-- Contest 1: ĐANG DIỄN RA (RUNNING)
INSERT INTO contests (id, title, description, start_time, end_time, created_by) VALUES
(1, '🔥 VKU Code Sprint 2026 - Vòng Khởi Động', 'Kỳ thi lập trình tốc độ dành cho toàn bộ sinh viên CNTT VKU. Thử thách giải quyết 4 bài toán trong 120 phút theo chuẩn luật ACM-ICPC.', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), 2)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), start_time=VALUES(start_time), end_time=VALUES(end_time);

-- Contest 2: SẮP TỚI (UPCOMING)
INSERT INTO contests (id, title, description, start_time, end_time, created_by) VALUES
(2, '🏆 VKU ICPC Warm-up Contest 2026', 'Kỳ thi thử nghiệm trước thềm kỳ thi Olympic Tin học Sinh viên Việt Nam lần thứ 35. Đề thi gồm các bài toán cấu trúc dữ liệu và giải thuật.', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 2)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), start_time=VALUES(start_time), end_time=VALUES(end_time);

-- Contest 3: SẮP TỚI (UPCOMING)
INSERT INTO contests (id, title, description, start_time, end_time, created_by) VALUES
(3, '⚔️ Đấu trường Thuật toán & Quy hoạch Động', 'Chuyên đề tranh tài các bài toán Tối ưu hóa & Dynamic Programming từ trung bình đến nâng cao.', DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 7 DAY), INTERVAL 3 HOUR), 2)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), start_time=VALUES(start_time), end_time=VALUES(end_time);

-- Contest 4: ĐÃ KẾT THÚC (ENDED)
INSERT INTO contests (id, title, description, start_time, end_time, created_by) VALUES
(4, '🏅 Kỳ thi Lập trình Tân sinh viên VKU 2025', 'Kỳ thi chào đón tân sinh viên khóa 2024 làm quen với nền tảng chấm bài tự động và tư duy thuật toán.', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 30 DAY), INTERVAL 2 HOUR), 2)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), start_time=VALUES(start_time), end_time=VALUES(end_time);

-- Contest 5: ĐÃ KẾT THÚC (ENDED)
INSERT INTO contests (id, title, description, start_time, end_time, created_by) VALUES
(5, '🥇 VKU Code Championship Mùa Thu 2025', 'Giải đấu vô địch lập trình VKU mùa thu 2025 quy tụ các coder xuất sắc nhất tranh tài bảng xếp hạng.', DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 60 DAY), INTERVAL 3 HOUR), 2)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), start_time=VALUES(start_time), end_time=VALUES(end_time);

-- Gán bài tập vào các kỳ thi (Contest Problems)
INSERT INTO contest_problems (contest_id, problem_id, order_index, points) VALUES
-- Contest 1: 4 bài (#2, #4, #5, #9)
(1, 2, 1, 100),
(1, 4, 2, 100),
(1, 5, 3, 100),
(1, 9, 4, 200),

-- Contest 2: 3 bài (#6, #7, #10)
(2, 6, 1, 100),
(2, 7, 2, 100),
(2, 10, 3, 200),

-- Contest 3: 3 bài (#10, #11, #13)
(3, 10, 1, 200),
(3, 11, 2, 200),
(3, 13, 3, 300),

-- Contest 4: 3 bài (#1, #2, #5)
(4, 1, 1, 100),
(4, 2, 2, 100),
(4, 5, 3, 100),

-- Contest 5: 4 bài (#3, #8, #10, #12)
(5, 3, 1, 200),
(5, 8, 2, 200),
(5, 10, 3, 200),
(5, 12, 4, 300);

-- Đăng ký thí sinh tham gia kỳ thi (Contest Registrations)
INSERT INTO contest_registrations (contest_id, user_id, registered_at) VALUES
-- Contest 1 (RUNNING): demo_student + các bạn sinh viên
(1, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 4, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 5, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 6, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 7, DATE_SUB(NOW(), INTERVAL 2 HOUR)),

-- Contest 2 (UPCOMING): demo_student + 4 bạn
(2, 1, NOW()),
(2, 3, NOW()),
(2, 4, NOW()),
(2, 5, NOW()),

-- Contest 3 (UPCOMING): 3 bạn
(3, 3, NOW()),
(3, 4, NOW()),
(3, 5, NOW()),

-- Contest 4 (ENDED): 8 bạn
(4, 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(4, 3, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(4, 4, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(4, 5, DATE_SUB(NOW(), INTERVAL 30 DAY)),

-- Contest 5 (ENDED): 6 bạn
(5, 1, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(5, 3, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(5, 4, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(5, 5, DATE_SUB(NOW(), INTERVAL 60 DAY));
