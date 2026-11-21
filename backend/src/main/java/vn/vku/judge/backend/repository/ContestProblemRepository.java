package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ContestProblem;

import java.util.List;

@Repository
public interface ContestProblemRepository extends JpaRepository<ContestProblem, Long> {
    List<ContestProblem> findByContestIdOrderByOrderIndexAsc(Long contestId);
    void deleteByContestId(Long contestId);
}
