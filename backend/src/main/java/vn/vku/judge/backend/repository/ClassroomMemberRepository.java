package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.ClassroomMember;

import java.util.List;

@Repository
public interface ClassroomMemberRepository extends JpaRepository<ClassroomMember, Long> {
    boolean existsByClassroomIdAndUserId(Long classroomId, Long userId);
    List<ClassroomMember> findByClassroomId(Long classroomId);
    List<ClassroomMember> findByUserId(Long userId);
    long countByClassroomId(Long classroomId);
}
