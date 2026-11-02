package vn.vku.judge.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.service.JudgeService;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "http://localhost:5173")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final JudgeService judgeService;

    public SubmissionController(SubmissionRepository submissionRepository, JudgeService judgeService) {
        this.submissionRepository = submissionRepository;
        this.judgeService = judgeService;
    }

    // Lấy toàn bộ lịch sử nộp bài
    @GetMapping
    public List<Submission> getAllSubmissions() {
        return submissionRepository.findAllByOrderByIdDesc();
    }

    // Lấy lịch sử nộp bài theo từng bài tập
    @GetMapping("/problem/{problemId}")
    public List<Submission> getSubmissionsByProblem(@PathVariable Long problemId) {
        return submissionRepository.findByProblemIdOrderByIdDesc(problemId);
    }

    // Nộp code và chấm tự động ngay lập tức
    @PostMapping
    public Submission submitCode(@RequestBody Submission submission) {
        return judgeService.judge(submission);
    }
}