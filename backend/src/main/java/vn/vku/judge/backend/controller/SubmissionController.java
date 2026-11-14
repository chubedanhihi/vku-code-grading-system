package vn.vku.judge.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.service.JudgeService;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final JudgeService judgeService;

    public SubmissionController(SubmissionRepository submissionRepository, JudgeService judgeService) {
        this.submissionRepository = submissionRepository;
        this.judgeService = judgeService;
    }

    // Lấy toàn bộ lịch sử nộp bài (mới nhất trước)
    @GetMapping
    public List<Submission> getAllSubmissions() {
        return submissionRepository.findAllByOrderByIdDesc();
    }

    // Lấy lịch sử nộp bài theo từng bài tập
    @GetMapping("/problem/{problemId}")
    public List<Submission> getSubmissionsByProblem(@PathVariable Long problemId) {
        return submissionRepository.findByProblemIdOrderByIdDesc(problemId);
    }

    // Lấy chi tiết 1 submission theo ID (dùng cho polling)
    @GetMapping("/{id}")
    public ResponseEntity<Submission> getSubmissionById(@PathVariable Long id) {
        return submissionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Nộp code: lưu PENDING ngay → chấm bài async trong background
     * → Frontend polling GET /{id} để lấy kết quả cuối cùng.
     */
    @PostMapping
    public Submission submitCode(@RequestBody Submission submission) {
        return judgeService.submitAndJudgeAsync(submission);
    }
}