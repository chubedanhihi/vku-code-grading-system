package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ProblemCommentLike;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ProblemCommentLikeRepository extends JpaRepository<ProblemCommentLike, Long> {
    Optional<ProblemCommentLike> findByCommentIdAndUserId(Long commentId, Long userId);
    void deleteByCommentIdAndUserId(Long commentId, Long userId);
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
    List<ProblemCommentLike> findByUserIdAndCommentIdIn(Long userId, Set<Long> commentIds);
    long countByCommentId(Long commentId);
    void deleteByCommentId(Long commentId);
}
