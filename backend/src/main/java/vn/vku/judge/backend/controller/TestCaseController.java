package vn.vku.judge.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.TestCase;
import vn.vku.judge.backend.repository.TestCaseRepository;

import java.util.List;

@RestController
@RequestMapping("/api/testcases")
public class TestCaseController {

    private final TestCaseRepository testCaseRepository;

    public TestCaseController(TestCaseRepository testCaseRepository) {
        this.testCaseRepository = testCaseRepository;
    }

    // Lấy toàn bộ test cases của 1 bài tập theo problemId
    @GetMapping("/problem/{problemId}")
    public List<TestCase> getTestCasesByProblem(@PathVariable Long problemId) {
        return testCaseRepository.findByProblemId(problemId);
    }

    // Thêm 1 test case mới cho bài tập
    @PostMapping
    public TestCase createTestCase(@RequestBody TestCase testCase) {
        return testCaseRepository.save(testCase);
    }

    // Xóa 1 test case theo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestCase(@PathVariable Long id) {
        if (!testCaseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        testCaseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}