package vn.vku.judge.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionResultView {
    private Integer testIndex;
    private String verdict;
    private Integer timeMs;
    private Integer memoryKb;
    private Boolean sample;
    /** Chỉ có nội dung với test mẫu hoặc lỗi runtime; test ẩn không lộ expected/actual. */
    private String message;
    /** Chỉ có với test mẫu bị Wrong Answer để hiển thị Diff Viewer. */
    private String expectedOutput;
    private String actualOutput;
}
