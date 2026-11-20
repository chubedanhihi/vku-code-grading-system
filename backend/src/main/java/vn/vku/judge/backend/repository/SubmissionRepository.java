package vn.vku.judge.backend.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import vn.vku.judge.backend.entity.Submission;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByProblemIdOrderByIdDesc(Long problemId);
    List<Submission> findAllByOrderByIdDesc();
    List<Submission> findByUserIdOrderByIdDesc(Long userId);
    List<Submission> findByProblemIdAndUserIdOrderByIdDesc(Long problemId, Long userId);

    // Bản có phân trang cho API (tránh trả về toàn bộ lịch sử)
    List<Submission> findAllByOrderByIdDesc(Pageable pageable);
    List<Submission> findByProblemIdOrderByIdDesc(Long problemId, Pageable pageable);
    List<Submission> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);
    List<Submission> findByProblemIdAndUserIdOrderByIdDesc(Long problemId, Long userId, Pageable pageable);

    long countByUserIdAndStatusIn(Long userId, Collection<String> statuses);

    long countByStatus(String status);

    /** Hàng đợi: các job đang chờ, cũ nhất trước. */
    @Query("select s.id from Submission s where s.status = 'PENDING' order by s.id asc")
    List<Long> findPendingIds(Pageable pageable);

    /** Nhận job nguyên tử: chỉ một worker thắng khi nhiều worker cùng thấy một job PENDING. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("update Submission s set s.status = 'RUNNING', s.startedAt = :now where s.id = :id and s.status = 'PENDING'")
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** Đưa job RUNNING bị treo (worker chết/restart) về PENDING để chấm lại. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("update Submission s set s.status = 'PENDING' where s.status = 'RUNNING' "
            + "and (s.startedAt is null or s.startedAt < :cutoff)")
    int requeueStale(@Param("cutoff") LocalDateTime cutoff);
}
