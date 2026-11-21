package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "classroom_members",
       uniqueConstraints = @UniqueConstraint(name = "uk_cm_class_user", columnNames = {"classroom_id", "user_id"}))
@Data
@NoArgsConstructor
public class ClassroomMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "classroom_id", nullable = false)
    private Long classroomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at", insertable = false, updatable = false)
    private LocalDateTime joinedAt;
}
