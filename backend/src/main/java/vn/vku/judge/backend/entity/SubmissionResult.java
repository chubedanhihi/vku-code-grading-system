package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Kết quả chấm của từng test case trong một bài nộp. */
@Entity
@Table(name = "submission_results", indexes = @Index(name = "idx_sr_submission", columnList = "submission_id"))
@Data
@NoArgsConstructor
public class SubmissionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "test_case_id")
    private Long testCaseId;

    @Column(name = "test_index", nullable = false)
    private Integer testIndex;

    @Column(nullable = false, length = 50)
    private String verdict;

    @Column(name = "time_ms")
    private Integer timeMs = 0;

    @Column(name = "memory_kb")
    private Integer memoryKb = 0;

    @Column(name = "is_sample")
    private Boolean sample = false;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "actual_output", columnDefinition = "TEXT")
    private String actualOutput;
}
