package vn.vku.judge.backend.dto;

import lombok.Builder;
import lombok.Data;
import vn.vku.judge.backend.entity.Problem.Difficulty;

import java.time.LocalDateTime;

@Data
@Builder
public class ProblemSummaryView {
    private Long id;
    private String title;
    private String description;
    private Difficulty difficulty;
    private Integer timeLimit;
    private Integer memoryLimit;
    private String checkerMode;
    private Long createdBy;
    private LocalDateTime createdAt;
    private long totalSubmissions;
    private long acceptedSubmissions;
    private double acRate;
    /** SOLVED | ATTEMPTED | NONE (dành cho user đang đăng nhập). */
    private String myStatus;
}
