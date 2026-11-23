package vn.vku.judge.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "problem_comment_likes",
       uniqueConstraints = @UniqueConstraint(name = "uk_pcl_comment_user", columnNames = {"comment_id", "user_id"}),
       indexes = @Index(name = "idx_pcl_comment", columnList = "comment_id"))
@Data
@NoArgsConstructor
public class ProblemCommentLike {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public ProblemCommentLike(Long commentId, Long userId) {
        this.commentId = commentId;
        this.userId = userId;
    }
}
