package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.SubmissionView;
import vn.vku.judge.backend.dto.SubmitRequest;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.service.JudgeService;
import vn.vku.judge.backend.service.SubmissionViewService;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private static final int MAX_PAGE_SIZE = 200;

    private final SubmissionRepository submissionRepository;
    private final JudgeService judgeService;
    private final SubmissionViewService views;

    public SubmissionController(SubmissionRepository submissionRepository, JudgeService judgeService,
                                SubmissionViewService views) {
        this.submissionRepository = submissionRepository;
        this.judgeService = judgeService;
        this.views = views;
    }

    private static AuthUser me(HttpServletRequest req) {
        return AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
    }

    private static Pageable page(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));
    }

    /** Lịch sử nộp bài gần đây (mã nguồn của người khác được ẩn). */
    @GetMapping
    public List<SubmissionView> getAll(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "100") int size, HttpServletRequest req) {
        return views.toViews(submissionRepository.findAllByOrderByIdDesc(page(page, size)), me(req));
    }

    @GetMapping("/problem/{problemId}")
    public List<SubmissionView> byProblem(@PathVariable Long problemId, @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "100") int size, HttpServletRequest req) {
        return views.toViews(submissionRepository.findByProblemIdOrderByIdDesc(problemId, page(page, size)), me(req));
    }

    @GetMapping("/problem/{problemId}/user/{userId}")
    public List<SubmissionView> byProblemAndUser(@PathVariable Long problemId, @PathVariable Long userId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "100") int size, HttpServletRequest req) {
        AuthUser u = me(req);
        requireSelfOrTeacher(u, userId);
        return views.toViews(submissionRepository.findByProblemIdAndUserIdOrderByIdDesc(problemId, userId,
                page(page, size)), u);
    }

    @GetMapping("/user/{userId}")
    public List<SubmissionView> byUser(@PathVariable Long userId, @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "100") int size, HttpServletRequest req) {
        AuthUser u = me(req);
        requireSelfOrTeacher(u, userId);
        return views.toViews(submissionRepository.findByUserIdOrderByIdDesc(userId, page(page, size)), u);
    }

    /** Chi tiết 1 bài nộp kèm kết quả từng test (dùng cho polling). */
    @GetMapping("/{id}")
    public SubmissionView detail(@PathVariable Long id, HttpServletRequest req) {
        Submission s = submissionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài nộp."));
        return views.toDetail(s, me(req));
    }

    /** Nộp code: user lấy từ JWT (không tin userId do client gửi). Trả PENDING ngay, client polling GET /{id}. */
    @PostMapping
    public SubmissionView submit(@RequestBody SubmitRequest body, HttpServletRequest req) {
        AuthUser u = me(req);
        return views.toDetail(judgeService.submit(u, body), u);
    }

    private static void requireSelfOrTeacher(AuthUser u, Long userId) {
        if (!u.isTeacher() && !u.id().equals(userId)) {
            throw ApiException.forbidden("Bạn chỉ được xem bài nộp của chính mình.");
        }
    }
}
