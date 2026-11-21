package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "classroom_assignments", indexes = @Index(name = "idx_ca_class", columnList = "classroom_id"))
@Data
@NoArgsConstructor
public class ClassroomAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "classroom_id", nullable = false)
    private Long classroomId;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(name = "week_label", length = 60)
    private String weekLabel = "Tuần 1";

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "allow_late")
    private Boolean allowLate = true;
}
