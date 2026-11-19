package vn.vku.judge.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntry {
    private int rank;
    private Long userId;
    private String username;
    private String email;
    private String role;
    private long solvedCount;        // Số bài khác nhau đã giải (ACCEPTED)
    private long totalSubmissions;    // Tổng số lần nộp bài
    private long acceptedSubmissions; // Tổng số lần AC
    private double accuracyRate;      // Tỷ lệ thành công (%)
    private int totalScore;           // Điểm tích lũy (EASY: 100, MEDIUM: 200, HARD: 300)
    private String tier;              // MASTER, GOLD, SILVER, BRONZE
}
