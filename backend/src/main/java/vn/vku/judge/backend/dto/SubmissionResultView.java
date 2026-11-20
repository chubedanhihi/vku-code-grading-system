package vn.vku.judge.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubmissionResultView {
    private Integer testIndex;
    private String verdict;
    private Integer timeMs;
    private Integer memoryKb;
    private Boolean sample;
    /** Chỉ có nội dung với test mẫu hoặc lỗi runtime; test ẩn không lộ expected/actual. */
    private String message;
}
