package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.vku.judge.backend.dto.RunCustomRequest;
import vn.vku.judge.backend.dto.RunCustomResponse;
import vn.vku.judge.backend.dto.SubmissionView;
import vn.vku.judge.backend.dto.SubmitRequest;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.SubmissionProgressBus;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.service.JudgeService;
import vn.vku.judge.backend.service.SubmissionViewService;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private static final int MAX_PAGE_SIZE = 200;

    private final SubmissionRepository submissionRepository;
    private final JudgeService judgeService;
    private final SubmissionViewService views;
    private final SubmissionProgressBus progressBus;

    public SubmissionController(SubmissionRepository submissionRepository, JudgeService judgeService,
                                SubmissionViewService views, SubmissionProgressBus progressBus) {
        this.submissionRepository = submissionRepository;
        this.judgeService = judgeService;
        this.views = views;
        this.progressBus = progressBus;
    }

    private static AuthUser me(HttpServletRequest req) {
        return AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
    }

    private static Pageable page(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));
    }

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

    @GetMapping("/{id}")
    public SubmissionView detail(@PathVariable Long id, HttpServletRequest req) {
        Submission s = submissionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài nộp."));
        return views.toDetail(s, me(req));
    }

    /** Chạy thử với Custom Input trong sandbox, không lưu lịch sử. */
    @PostMapping("/run")
    public RunCustomResponse runCustom(@RequestBody RunCustomRequest req, HttpServletRequest httpReq) {
        me(httpReq);
        return judgeService.runCustom(req);
    }

    /** Stream tiến trình chấm bài theo thời gian thực qua SSE. */
    @GetMapping(value = "/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable Long id, HttpServletRequest req) {
        AuthUser u = me(req);
        Submission s = submissionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài nộp."));
        SseEmitter emitter = progressBus.subscribe(id);
        if (!Verdict.PENDING.equals(s.getStatus()) && !Verdict.RUNNING.equals(s.getStatus())) {
            try {
                emitter.send(SseEmitter.event().name("complete").data(views.toDetail(s, u)));
                emitter.complete();
            } catch (IOException ignored) {
                emitter.completeWithError(ignored);
            }
        }
        return emitter;
    }

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
