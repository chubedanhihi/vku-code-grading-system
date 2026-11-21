package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.ProblemSummaryView;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;
import vn.vku.judge.backend.service.PlagiarismService;
import vn.vku.judge.backend.service.PlagiarismService.PlagiarismMatch;

import java.util.*;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {
    private static final Set<String> CHECKER_MODES = Set.of("EXACT", "FLOAT_1E6", "FLOAT_1E4", "TOKENS_IGNORE_CASE");

    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final PlagiarismService plagiarismService;

    public ProblemController(ProblemRepository problemRepository,
                             SubmissionRepository submissionRepository,
                             PlagiarismService plagiarismService) {
        this.problemRepository = problemRepository;
        this.submissionRepository = submissionRepository;
        this.plagiarismService = plagiarismService;
    }

    @Public
    @GetMapping
    public List<ProblemSummaryView> getAllProblems(HttpServletRequest req) {
        AuthUser viewer = AuthInterceptor.current(req).orElse(null);
        List<Problem> problems = problemRepository.findAll();
        List<Submission> allSubs = submissionRepository.findAll();

        Map<Long, long[]> counts = new HashMap<>();
        Map<Long, String> myStatus = new HashMap<>();
        for (Submission s : allSubs) {
            long[] c = counts.computeIfAbsent(s.getProblemId(), k -> new long[2]);
            c[0]++;
            if (Verdict.ACCEPTED.equals(s.getStatus())) c[1]++;

            if (viewer != null && viewer.id().equals(s.getUserId())) {
                String cur = myStatus.getOrDefault(s.getProblemId(), "NONE");
                if (Verdict.ACCEPTED.equals(s.getStatus())) {
                    myStatus.put(s.getProblemId(), "SOLVED");
                } else if (!"SOLVED".equals(cur)) {
                    myStatus.put(s.getProblemId(), "ATTEMPTED");
                }
            }
        }

        return problems.stream().map(p -> {
            long[] c = counts.getOrDefault(p.getId(), new long[]{0, 0});
            double rate = c[0] == 0 ? 0.0 : Math.round((c[1] * 1000.0) / c[0]) / 10.0;
            return ProblemSummaryView.builder()
                    .id(p.getId())
                    .title(p.getTitle())
                    .description(p.getDescription())
                    .difficulty(p.getDifficulty())
                    .timeLimit(p.getTimeLimit())
                    .memoryLimit(p.getMemoryLimit())
                    .checkerMode(p.getCheckerMode() == null ? "EXACT" : p.getCheckerMode())
                    .createdBy(p.getCreatedBy())
                    .createdAt(p.getCreatedAt())
                    .totalSubmissions(c[0])
                    .acceptedSubmissions(c[1])
                    .acRate(rate)
                    .myStatus(viewer == null ? "NONE" : myStatus.getOrDefault(p.getId(), "NONE"))
                    .build();
        }).toList();
    }

    @Public
    @GetMapping("/{id}")
    public ResponseEntity<Problem> getProblemById(@PathVariable Long id) {
        return problemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public Problem createProblem(@RequestBody Problem problem, HttpServletRequest req) {
        validate(problem);
        problem.setId(null);
        problem.setCreatedBy(AuthInterceptor.current(req).map(u -> u.id()).orElse(null));
        return problemRepository.save(problem);
    }

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
            existing.setCheckerMode(updated.getCheckerMode());
            return ResponseEntity.ok(problemRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProblem(@PathVariable Long id) {
        if (!problemRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        problemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Kiểm tra độ tương đồng mã nguồn (Plagiarism Check) giữa các bài AC. */
    @RequireRole({"TEACHER", "ADMIN"})
    @GetMapping("/{id}/plagiarism")
    public List<PlagiarismMatch> checkPlagiarism(@PathVariable Long id) {
        if (!problemRepository.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy bài tập.");
        }
        return plagiarismService.checkProblem(id);
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
        if (p.getCheckerMode() == null || p.getCheckerMode().isBlank()) {
            p.setCheckerMode("EXACT");
        } else {
            String m = p.getCheckerMode().trim().toUpperCase(Locale.ROOT);
            if (!CHECKER_MODES.contains(m)) {
                throw ApiException.badRequest("checkerMode không hợp lệ (EXACT, FLOAT_1E6, FLOAT_1E4, TOKENS_IGNORE_CASE).");
            }
            p.setCheckerMode(m);
        }
    }
}
