package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "contest_problems", indexes = @Index(name = "idx_cp_contest", columnList = "contest_id"))
@Data
@NoArgsConstructor
public class ContestProblem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(name = "order_index")
    private Integer orderIndex = 0;

    @Column(name = "points")
    private Integer points = 100;
}
