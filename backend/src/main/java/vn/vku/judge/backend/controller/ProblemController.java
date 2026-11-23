package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.ProblemSummaryView;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.ProblemComment;
import vn.vku.judge.backend.entity.ProblemCommentLike;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.ProblemCommentLikeRepository;
import vn.vku.judge.backend.repository.ProblemCommentRepository;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.UserRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;
import vn.vku.judge.backend.service.PlagiarismService;
import vn.vku.judge.backend.service.PlagiarismService.PlagiarismMatch;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {
    private static final Set<String> CHECKER_MODES = Set.of("EXACT", "FLOAT_1E6", "FLOAT_1E4", "TOKENS_IGNORE_CASE");

    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final ProblemCommentRepository commentRepository;
    private final ProblemCommentLikeRepository commentLikeRepository;
    private final UserRepository userRepository;
    private final PlagiarismService plagiarismService;

    public ProblemController(ProblemRepository problemRepository,
                             SubmissionRepository submissionRepository,
                             ProblemCommentRepository commentRepository,
                             ProblemCommentLikeRepository commentLikeRepository,
                             UserRepository userRepository,
                             PlagiarismService plagiarismService) {
        this.problemRepository = problemRepository;
        this.submissionRepository = submissionRepository;
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.userRepository = userRepository;
        this.plagiarismService = plagiarismService;
    }

    @Data
    @Builder
    public static class CommentView {
        private Long id;
        private Long problemId;
        private Long userId;
        private String username;
        private String role;
        private String content;
        private Integer likes;
        private Boolean liked;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateCommentRequest {
        private String content;
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
                    .tags(p.getTags() == null ? "" : p.getTags())
                    .studyPlan(p.getStudyPlan() == null ? "" : p.getStudyPlan())
                    .hasEditorial(p.getEditorial() != null && !p.getEditorial().isBlank())
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
                .map(p -> {
                    p.setEditorial(null); // Editorial chỉ mở qua endpoint riêng sau khi AC
                    return ResponseEntity.ok(p);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Lời giải mẫu (Editorial): chỉ mở khóa cho Giảng viên hoặc Sinh viên đã AC bài này. */
    @GetMapping("/{id}/editorial")
    public Map<String, Object> getEditorial(@PathVariable Long id, HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        Problem p = problemRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy bài tập."));
        boolean unlocked = u.isTeacher()
                || submissionRepository.existsByProblemIdAndUserIdAndStatus(id, u.id(), Verdict.ACCEPTED);
        if (!unlocked) {
            return Map.of("unlocked", false, "editorial", "");
        }
        return Map.of("unlocked", true, "editorial", p.getEditorial() == null ? "" : p.getEditorial());
    }

    @Public
    @GetMapping("/{id}/comments")
    public List<CommentView> getComments(@PathVariable Long id, HttpServletRequest req) {
        AuthUser viewer = AuthInterceptor.current(req).orElse(null);
        List<ProblemComment> list = commentRepository.findByProblemIdOrderByIdDesc(id);
        Set<Long> uids = list.stream().map(ProblemComment::getUserId).collect(Collectors.toSet());
        Map<Long, User> users = userRepository.findAllById(uids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        Set<Long> commentIds = list.stream().map(ProblemComment::getId).collect(Collectors.toSet());
        Set<Long> likedCommentIds = (viewer != null && !commentIds.isEmpty())
                ? commentLikeRepository.findByUserIdAndCommentIdIn(viewer.id(), commentIds).stream()
                    .map(ProblemCommentLike::getCommentId).collect(Collectors.toSet())
                : Collections.emptySet();

        return list.stream().map(c -> {
            User u = users.get(c.getUserId());
            return CommentView.builder()
                    .id(c.getId())
                    .problemId(c.getProblemId())
                    .userId(c.getUserId())
                    .username(u != null ? u.getUsername() : "User #" + c.getUserId())
                    .role(u != null ? u.getRole() : "STUDENT")
                    .content(c.getContent())
                    .likes(c.getLikes() != null ? c.getLikes() : 0)
                    .liked(likedCommentIds.contains(c.getId()))
                    .createdAt(c.getCreatedAt())
                    .build();
        }).toList();
    }

    @PostMapping("/{id}/comments")
    public CommentView addComment(@PathVariable Long id, @RequestBody CreateCommentRequest body,
                                  HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        if (!problemRepository.existsById(id)) throw ApiException.notFound("Không tìm thấy bài tập.");
        if (body == null || body.getContent() == null || body.getContent().isBlank()) {
            throw ApiException.badRequest("Nội dung bình luận không được để trống.");
        }
        ProblemComment c = new ProblemComment();
        c.setProblemId(id);
        c.setUserId(u.id());
        c.setContent(body.getContent().trim());
        c.setLikes(0);
        ProblemComment saved = commentRepository.save(c);
        return CommentView.builder()
                .id(saved.getId()).problemId(id).userId(u.id())
                .username(u.username()).role(u.role()).content(saved.getContent())
                .likes(0).liked(false)
                .createdAt(saved.getCreatedAt()).build();
    }

    @Transactional
    @PostMapping("/comments/{commentId}/like")
    public Map<String, Object> toggleLikeComment(@PathVariable Long commentId, HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        ProblemComment c = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bình luận."));

        Optional<ProblemCommentLike> existing = commentLikeRepository.findByCommentIdAndUserId(commentId, u.id());
        boolean liked;
        if (existing.isPresent()) {
            commentLikeRepository.delete(existing.get());
            int cur = c.getLikes() != null ? c.getLikes() : 1;
            c.setLikes(Math.max(0, cur - 1));
            liked = false;
        } else {
            commentLikeRepository.save(new ProblemCommentLike(commentId, u.id()));
            int cur = c.getLikes() != null ? c.getLikes() : 0;
            c.setLikes(cur + 1);
            liked = true;
        }
        commentRepository.save(c);

        return Map.of(
                "commentId", commentId,
                "likes", c.getLikes(),
                "liked", liked
        );
    }

    @Transactional
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId, HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        ProblemComment c = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bình luận."));
        if (!u.isTeacher() && !u.id().equals(c.getUserId())) {
            throw ApiException.forbidden("Bạn không có quyền xóa bình luận này.");
        }
        commentLikeRepository.deleteByCommentId(commentId);
        commentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
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
            existing.setTags(updated.getTags() == null ? "" : updated.getTags().trim());
            existing.setStudyPlan(updated.getStudyPlan() == null ? "" : updated.getStudyPlan().trim());
            if (updated.getEditorial() != null) existing.setEditorial(updated.getEditorial());
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
                throw ApiException.badRequest("checkerMode không hợp lệ.");
            }
            p.setCheckerMode(m);
        }
    }
}
