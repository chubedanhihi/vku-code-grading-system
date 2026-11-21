package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@NoArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // user_id: có thể null khi chưa có hệ thống xác thực
    @Column(name = "user_id")
    private Long userId = 1L;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(nullable = false, length = 20)
    private String language; // CPP, JAVA, PYTHON

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(length = 50)
    private String status = "PENDING";
    // PENDING, RUNNING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED,
    // OUTPUT_LIMIT_EXCEEDED, COMPILE_ERROR, RUNTIME_ERROR, SYSTEM_ERROR

    @Column(name = "execution_time_ms")
    private Integer executionTime = 0;

    @Column(name = "memory_used_kb")
    private Integer memoryUsed = 0;

    // Lưu thông báo lỗi biên dịch nếu có
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "passed_tests")
    private Integer passedTests = 0;

    @Column(name = "total_tests")
    private Integer totalTests = 0;

    @Column(name = "score")
    private Integer score = 0;

    @Column(name = "max_score")
    private Integer maxScore = 0;

    @Column(name = "contest_id")
    private Long contestId;

    @Column(name = "classroom_id")
    private Long classroomId;

    @Column(name = "is_late")
    private Boolean isLate = false;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "submitted_at", insertable = false, updatable = false)
    private LocalDateTime submittedAt;
}