package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "contest_registrations",
       uniqueConstraints = @UniqueConstraint(name = "uk_cr_contest_user", columnNames = {"contest_id", "user_id"}))
@Data
@NoArgsConstructor
public class ContestRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "registered_at", insertable = false, updatable = false)
    private LocalDateTime registeredAt;
}
