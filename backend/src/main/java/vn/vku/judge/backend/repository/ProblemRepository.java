package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.Problem;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {
}