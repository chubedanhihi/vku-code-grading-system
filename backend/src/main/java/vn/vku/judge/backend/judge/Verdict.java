package vn.vku.judge.backend.judge;

import java.util.List;

/** Các trạng thái chấm bài (lưu dạng chuỗi trong DB để tương thích với dữ liệu cũ). */
public final class Verdict {
    private Verdict() {}

    public static final String PENDING = "PENDING";
    public static final String RUNNING = "RUNNING";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String WRONG_ANSWER = "WRONG_ANSWER";
    public static final String TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED";
    public static final String MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED";
    public static final String OUTPUT_LIMIT_EXCEEDED = "OUTPUT_LIMIT_EXCEEDED";
    public static final String RUNTIME_ERROR = "RUNTIME_ERROR";
    public static final String COMPILE_ERROR = "COMPILE_ERROR";
    public static final String SYSTEM_ERROR = "SYSTEM_ERROR";
    /** Test bị bỏ qua vì đã có quá nhiều lỗi nặng liên tiếp. */
    public static final String SKIPPED = "SKIPPED";

    /** Thứ tự ưu tiên khi tổng hợp verdict cuối cùng (đứng trước = nặng hơn). */
    private static final List<String> PRIORITY = List.of(
            COMPILE_ERROR, SYSTEM_ERROR, RUNTIME_ERROR, MEMORY_LIMIT_EXCEEDED,
            OUTPUT_LIMIT_EXCEEDED, TIME_LIMIT_EXCEEDED, WRONG_ANSWER);

    public static boolean isFatal(String v) {
        return RUNTIME_ERROR.equals(v) || MEMORY_LIMIT_EXCEEDED.equals(v)
                || OUTPUT_LIMIT_EXCEEDED.equals(v) || TIME_LIMIT_EXCEEDED.equals(v);
    }

    /** Tổng hợp verdict của cả bài nộp từ verdict từng test. */
    public static String aggregate(List<String> perTest) {
        for (String p : PRIORITY) {
            if (perTest.contains(p)) return p;
        }
        return perTest.stream().allMatch(ACCEPTED::equals) && !perTest.isEmpty() ? ACCEPTED : WRONG_ANSWER;
    }
}
