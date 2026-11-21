package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ContestRegistration;

import java.util.List;

@Repository
public interface ContestRegistrationRepository extends JpaRepository<ContestRegistration, Long> {
    boolean existsByContestIdAndUserId(Long contestId, Long userId);
    long countByContestId(Long contestId);
    List<ContestRegistration> findByContestId(Long contestId);
}
