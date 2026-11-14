package vn.vku.judge.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.repository.ProblemRepository;

import java.util.List;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemRepository problemRepository;

    public ProblemController(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
    }

    // 1. Lấy danh sách toàn bộ bài tập (mới nhất trước)
    @GetMapping
    public List<Problem> getAllProblems() {
        return problemRepository.findAll();
    }

    // 2. Xem chi tiết 1 bài tập theo ID
    @GetMapping("/{id}")
    public ResponseEntity<Problem> getProblemById(@PathVariable Long id) {
        return problemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Tạo bài tập mới
    @PostMapping
    public Problem createProblem(@RequestBody Problem problem) {
        return problemRepository.save(problem);
    }

    // 4. Cập nhật bài tập
    @PutMapping("/{id}")
    public ResponseEntity<Problem> updateProblem(@PathVariable Long id, @RequestBody Problem updated) {
        return problemRepository.findById(id).map(existing -> {
            existing.setTitle(updated.getTitle());
            existing.setDescription(updated.getDescription());
            existing.setDifficulty(updated.getDifficulty());
            existing.setTimeLimit(updated.getTimeLimit());
            existing.setMemoryLimit(updated.getMemoryLimit());
            return ResponseEntity.ok(problemRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 5. Xóa bài tập
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProblem(@PathVariable Long id) {
        if (!problemRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        problemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}