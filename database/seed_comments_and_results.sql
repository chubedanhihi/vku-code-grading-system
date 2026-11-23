USE vku_judge;

-- =========================================================================
-- 1. THÊM DỮ LIỆU MẪU CHO BẢNG problem_comments (Thảo luận bài toán)
-- =========================================================================
DELETE FROM problem_comments;
INSERT INTO problem_comments (id, problem_id, user_id, content, created_at) VALUES
-- Bài 1: Hello World
(1, 1, 3, 'Chào cả lớp, bài này lưu ý in đúng từng ký tự và dấu chấm than nhé!', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 4, 'Em cảm ơn bạn An, ban đầu em quên in dấu chấm than nên bị Wrong Answer.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 1, 2, 'Thầy nhắc các em: Chú ý định dạng đầu ra không in thừa khoảng trắng nhé.', DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- Bài 2: Tổng A + B
(4, 2, 5, 'Bài này A, B lên đến 10^9 nên tổng có thể vượt quá giới hạn 2*10^9 của int, mọi người nhớ dùng kiểu long long trong C++ nhé!', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(5, 2, 6, 'Cảm ơn bạn Nam! Nhờ bạn mà mình AC bài này ngay lần nộp thứ 2.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6, 2, 2, 'Rất tốt! Việc quan sát giới hạn biến (Constraints) là kỹ năng cốt lõi trong lập trình thi đấu.', DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- Bài 3: Fibonacci thứ N
(7, 3, 7, 'Nếu dùng đệ quy ngây thơ fib(n) = fib(n-1) + fib(n-2) thì N=40 sẽ bị Time Limit Exceeded (TLE) ngay. Phải dùng mảng lưu kết quả hoặc biến chạy O(N).', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, 3, 3, 'Chính xác! Hoặc có thể tối ưu bộ nhớ xuống O(1) chỉ bằng 2 biến a và b.', DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- Bài 4: Số nguyên tố
(9, 4, 8, 'Kiểm tra số nguyên tố chỉ cần duyệt vòng lặp đến căn bậc 2 của N (i*i <= n) là đủ, không cần duyệt đến N.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(10, 4, 2, 'Đúng rồi, chú ý trường hợp biên N <= 1 không phải là số nguyên tố nhé.', DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- Bài 9: Tìm kiếm nhị phân
(11, 9, 9, 'Khi tính mid = (left + right) / 2 có thể bị tràn số nếu mảng rất lớn. Mẹo là viết: mid = left + (right - left) / 2.', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(12, 9, 10, 'Tuyệt vời, tip hay quá bạn Bảo ơi!', DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- Bài 10: Dãy con lớn nhất (Kadane)
(13, 10, 3, 'Thuật toán Kadane xử lý bài này trong thời gian O(N) rất thanh lịch. Lưu ý trường hợp tất cả phần tử trong mảng đều là số âm!', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(14, 10, 2, 'Lời giải của An rất chuẩn mực, các bạn có thể tham khảo thêm ở tab Lời giải mẫu (Editorial) của bài.', DATE_SUB(NOW(), INTERVAL 12 HOUR)),

-- Bài 12: Dijkstra
(15, 12, 5, 'Dùng priority_queue<pair<long long, int>> để tối ưu độ phức tạp xuống O((V + E) log V) nhé mọi người.', DATE_SUB(NOW(), INTERVAL 6 HOUR));


-- =========================================================================
-- 2. TỰ ĐỘNG SINH DỮ LIỆU CHI TIẾT CHO BẢNG submission_results
-- (Khớp từng lượt nộp trong submissions với các test_case của bài toán đó)
-- =========================================================================
DELETE FROM submission_results;

-- Sinh chi tiết kết quả cho các lượt nộp ACCEPTED
INSERT INTO submission_results (submission_id, test_case_id, test_index, verdict, time_ms, memory_kb, is_sample, actual_output, expected_output, message)
SELECT 
    s.id AS submission_id,
    tc.id AS test_case_id,
    ROW_NUMBER() OVER(PARTITION BY s.id ORDER BY tc.id) AS test_index,
    'ACCEPTED' AS verdict,
    COALESCE(s.execution_time_ms, 85) + (tc.id % 15) AS time_ms,
    COALESCE(s.memory_used_kb, 2048) AS memory_kb,
    tc.is_sample,
    tc.expected_output AS actual_output,
    tc.expected_output AS expected_output,
    'Khớp đáp án mẫu hoàn toàn.' AS message
FROM submissions s
JOIN test_cases tc ON tc.problem_id = s.problem_id
WHERE s.status = 'ACCEPTED';

-- Sinh chi tiết kết quả cho các lượt nộp WRONG_ANSWER (test 1 AC, test tiếp theo WA)
INSERT INTO submission_results (submission_id, test_case_id, test_index, verdict, time_ms, memory_kb, is_sample, actual_output, expected_output, message)
SELECT 
    s.id AS submission_id,
    tc.id AS test_case_id,
    ROW_NUMBER() OVER(PARTITION BY s.id ORDER BY tc.id) AS test_index,
    CASE WHEN tc.is_sample = 1 THEN 'ACCEPTED' ELSE 'WRONG_ANSWER' END AS verdict,
    COALESCE(s.execution_time_ms, 95) AS time_ms,
    COALESCE(s.memory_used_kb, 2048) AS memory_kb,
    tc.is_sample,
    CASE WHEN tc.is_sample = 1 THEN tc.expected_output ELSE 'Kết quả không khớp đáp án' END AS actual_output,
    tc.expected_output AS expected_output,
    CASE WHEN tc.is_sample = 1 THEN 'Khớp đáp án mẫu.' ELSE 'Sai khác đầu ra (Wrong Answer).' END AS message
FROM submissions s
JOIN test_cases tc ON tc.problem_id = s.problem_id
WHERE s.status = 'WRONG_ANSWER';

-- Sinh chi tiết kết quả cho các lượt nộp TIME_LIMIT_EXCEEDED
INSERT INTO submission_results (submission_id, test_case_id, test_index, verdict, time_ms, memory_kb, is_sample, actual_output, expected_output, message)
SELECT 
    s.id AS submission_id,
    tc.id AS test_case_id,
    ROW_NUMBER() OVER(PARTITION BY s.id ORDER BY tc.id) AS test_index,
    CASE WHEN tc.is_sample = 1 THEN 'ACCEPTED' ELSE 'TIME_LIMIT_EXCEEDED' END AS verdict,
    CASE WHEN tc.is_sample = 1 THEN 80 ELSE 2005 END AS time_ms,
    COALESCE(s.memory_used_kb, 4096) AS memory_kb,
    tc.is_sample,
    CASE WHEN tc.is_sample = 1 THEN tc.expected_output ELSE '' END AS actual_output,
    tc.expected_output AS expected_output,
    CASE WHEN tc.is_sample = 1 THEN 'Khớp đáp án.' ELSE 'Vượt quá giới hạn thời gian (Time Limit Exceeded).' END AS message
FROM submissions s
JOIN test_cases tc ON tc.problem_id = s.problem_id
WHERE s.status = 'TIME_LIMIT_EXCEEDED';
