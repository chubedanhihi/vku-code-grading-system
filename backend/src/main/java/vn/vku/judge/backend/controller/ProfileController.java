package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.Data;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.UserRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class ProfileController {
    private final UserRepository userRepo;
    private final SubmissionRepository subRepo;
    private final ProblemRepository problemRepo;

    public ProfileController(UserRepository userRepo, SubmissionRepository subRepo, ProblemRepository problemRepo) {
        this.userRepo = userRepo;
        this.subRepo = subRepo;
        this.problemRepo = problemRepo;
    }

    @Data
    @Builder
    public static class SolvedProblemInfo {
        private Long id;
        private String title;
        private String difficulty;
    }

    @Data
    @Builder
    public static class ProfileStatsView {
        private Long id;
        private String username;
        private String email;
        private String role;
        private int totalSubmissions;
        private int acceptedSubmissions;
        private int solvedCount;
        private double accuracyRate;
        private Map<String, Integer> languageBreakdown;
        private Map<String, Integer> dailyHeatmap;
        private List<SolvedProblemInfo> solvedProblems;
    }

    @GetMapping("/me/profile")
    public ProfileStatsView myProfile(HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        return buildProfile(u.id());
    }

    @GetMapping("/{id}/profile")
    public ProfileStatsView userProfile(@PathVariable Long id) {
        return buildProfile(id);
    }

    private ProfileStatsView buildProfile(long userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng."));
        List<Submission> subs = subRepo.findByUserIdOrderByIdDesc(userId);

        int acCount = 0;
        Set<Long> solvedIds = new LinkedHashSet<>();
        Map<String, Integer> langMap = new LinkedHashMap<>();
        Map<String, Integer> heatmap = new LinkedHashMap<>();
        LocalDate cutoff = LocalDate.now().minusDays(180);

        for (Submission s : subs) {
            langMap.merge(s.getLanguage(), 1, Integer::sum);
            if (Verdict.ACCEPTED.equals(s.getStatus())) {
                acCount++;
                solvedIds.add(s.getProblemId());
            }
            if (s.getSubmittedAt() != null) {
                LocalDate d = s.getSubmittedAt().toLocalDate();
                if (!d.isBefore(cutoff)) {
                    heatmap.merge(d.toString(), 1, Integer::sum);
                }
            }
        }

        Map<Long, Problem> pMap = problemRepo.findAllById(solvedIds).stream()
                .collect(Collectors.toMap(Problem::getId, p -> p));
        List<SolvedProblemInfo> solvedList = solvedIds.stream()
                .map(pMap::get)
                .filter(Objects::nonNull)
                .map(p -> SolvedProblemInfo.builder()
                        .id(p.getId())
                        .title(p.getTitle())
                        .difficulty(p.getDifficulty().name())
                        .build())
                .toList();

        double acc = subs.isEmpty() ? 0.0 : Math.round((acCount * 1000.0) / subs.size()) / 10.0;
        return ProfileStatsView.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole())
                .totalSubmissions(subs.size())
                .acceptedSubmissions(acCount)
                .solvedCount(solvedList.size())
                .accuracyRate(acc)
                .languageBreakdown(langMap)
                .dailyHeatmap(heatmap)
                .solvedProblems(solvedList)
                .build();
    }
}
