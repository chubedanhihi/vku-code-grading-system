package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ProblemComment;

import java.util.List;

@Repository
public interface ProblemCommentRepository extends JpaRepository<ProblemComment, Long> {
    List<ProblemComment> findByProblemIdOrderByIdDesc(Long problemId);
}
