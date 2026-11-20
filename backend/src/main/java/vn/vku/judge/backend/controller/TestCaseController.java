package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.TestCase;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.TestCaseRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;

import java.util.List;

@RestController
@RequestMapping("/api/testcases")
public class TestCaseController {
    private static final int MAX_FIELD_CHARS = 1_000_000;

    private final TestCaseRepository testCaseRepository;
    private final ProblemRepository problemRepository;

    public TestCaseController(TestCaseRepository testCaseRepository, ProblemRepository problemRepository) {
        this.testCaseRepository = testCaseRepository;
        this.problemRepository = problemRepository;
    }

    /** Giảng viên thấy toàn bộ; sinh viên/khách chỉ thấy test mẫu (test ẩn không bị lộ đáp án). */
    @Public
    @GetMapping("/problem/{problemId}")
    public List<TestCase> getTestCasesByProblem(@PathVariable Long problemId, HttpServletRequest req) {
        boolean teacher = AuthInterceptor.current(req).map(u -> u.isTeacher()).orElse(false);
        List<TestCase> all = testCaseRepository.findByProblemId(problemId);
        return teacher ? all : all.stream().filter(t -> Boolean.TRUE.equals(t.getIsSample())).toList();
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public TestCase createTestCase(@RequestBody TestCase testCase) {
        if (testCase.getProblemId() == null || !problemRepository.existsById(testCase.getProblemId())) {
            throw ApiException.badRequest("problemId không hợp lệ.");
        }
        if (testCase.getInput() == null) testCase.setInput("");
        if (testCase.getExpectedOutput() == null) throw ApiException.badRequest("Thiếu expectedOutput.");
        if (testCase.getInput().length() > MAX_FIELD_CHARS || testCase.getExpectedOutput().length() > MAX_FIELD_CHARS) {
            throw ApiException.badRequest("Test case quá lớn (tối đa 1.000.000 ký tự mỗi trường).");
        }
        testCase.setId(null);
        return testCaseRepository.save(testCase);
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestCase(@PathVariable Long id) {
        if (!testCaseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        testCaseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
