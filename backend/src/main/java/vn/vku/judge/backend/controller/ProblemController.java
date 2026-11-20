package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.repository.ProblemRepository;

import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;

import java.util.List;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemRepository problemRepository;

    public ProblemController(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
    }

    // 1. Lấy danh sách toàn bộ bài tập (mới nhất trước)
    @Public
    @GetMapping
    public List<Problem> getAllProblems() {
        return problemRepository.findAll();
    }

    // 2. Xem chi tiết 1 bài tập theo ID
    @Public
    @GetMapping("/{id}")
    public ResponseEntity<Problem> getProblemById(@PathVariable Long id) {
        return problemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Tạo bài tập mới
    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public Problem createProblem(@RequestBody Problem problem, HttpServletRequest req) {
        validate(problem);
        problem.setId(null);
        problem.setCreatedBy(AuthInterceptor.current(req).map(u -> u.id()).orElse(null));
        return problemRepository.save(problem);
    }

    // 4. Cập nhật bài tập
    @RequireRole({"TEACHER", "ADMIN"})
    @PutMapping("/{id}")
    public ResponseEntity<Problem> updateProblem(@PathVariable Long id, @RequestBody Problem updated) {
        validate(updated);
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
    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProblem(@PathVariable Long id) {
        if (!problemRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        problemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void validate(Problem p) {
        if (p.getTitle() == null || p.getTitle().isBlank() || p.getTitle().length() > 255) {
            throw ApiException.badRequest("Tiêu đề bắt buộc và tối đa 255 ký tự.");
        }
        if (p.getDescription() == null || p.getDescription().isBlank()) {
            throw ApiException.badRequest("Mô tả đề bài không được để trống.");
        }
        if (p.getTimeLimit() == null) p.setTimeLimit(1000);
        if (p.getMemoryLimit() == null) p.setMemoryLimit(256);
        if (p.getTimeLimit() < 100 || p.getTimeLimit() > 10_000) {
            throw ApiException.badRequest("Giới hạn thời gian phải trong khoảng 100–10000 ms.");
        }
        if (p.getMemoryLimit() < 16 || p.getMemoryLimit() > 1024) {
            throw ApiException.badRequest("Giới hạn bộ nhớ phải trong khoảng 16–1024 MB.");
        }
    }
}
