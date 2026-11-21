package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.SubmissionResult;

import java.util.List;

@Repository
public interface SubmissionResultRepository extends JpaRepository<SubmissionResult, Long> {
    List<SubmissionResult> findBySubmissionIdOrderByTestIndexAsc(Long submissionId);

    void deleteBySubmissionId(Long submissionId);
}
