package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ClassroomAssignment;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomAssignmentRepository extends JpaRepository<ClassroomAssignment, Long> {
    List<ClassroomAssignment> findByClassroomIdOrderByIdAsc(Long classroomId);
    Optional<ClassroomAssignment> findByClassroomIdAndProblemId(Long classroomId, Long problemId);
    void deleteByClassroomId(Long classroomId);
}
