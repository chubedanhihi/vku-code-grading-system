package vn.vku.judge.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** DTO trả về cho client, thay cho việc lộ trực tiếp entity (đặc biệt là sourceCode của người khác). */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionView {
    private Long id;
    private Long userId;
    private String username;
    private Long problemId;
    private Long contestId;
    private String language;
    private String status;
    private Integer executionTime;
    private Integer memoryUsed;
    private Integer passedTests;
    private Integer totalTests;
    private Integer score;
    private Integer maxScore;
    private String errorMessage;
    private LocalDateTime submittedAt;
    /** Chỉ có khi người xem là chủ bài nộp hoặc giảng viên. */
    private String sourceCode;
    private List<SubmissionResultView> results;
}
