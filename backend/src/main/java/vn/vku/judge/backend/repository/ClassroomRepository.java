package vn.vku.judge.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.vku.judge.backend.entity.Classroom;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Optional<Classroom> findByJoinCodeIgnoreCase(String joinCode);
    List<Classroom> findAllByOrderByIdDesc();
    List<Classroom> findByTeacherIdOrderByIdDesc(Long teacherId);
}
