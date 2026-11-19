package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "problems")
@Data
@NoArgsConstructor
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Difficulty difficulty = Difficulty.EASY;

    // Khớp với tên cột trong DB (time_limit_ms)
    @Column(name = "time_limit_ms")
    private Integer timeLimit = 1000;

    // Khớp với tên cột trong DB (memory_limit_mb)
    @Column(name = "memory_limit_mb")
    private Integer memoryLimit = 256;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}