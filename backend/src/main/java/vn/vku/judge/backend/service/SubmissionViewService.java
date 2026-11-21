package vn.vku.judge.backend.service;

import org.springframework.stereotype.Service;
import vn.vku.judge.backend.dto.SubmissionResultView;
import vn.vku.judge.backend.dto.SubmissionView;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.repository.SubmissionResultRepository;
import vn.vku.judge.backend.repository.UserRepository;
import vn.vku.judge.backend.security.AuthUser;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Chuyển entity -> DTO, áp dụng quy tắc riêng tư: chỉ chủ bài nộp/giảng viên thấy mã nguồn và lỗi chi tiết. */
@Service
public class SubmissionViewService {
    private final UserRepository userRepository;
    private final SubmissionResultRepository resultRepository;

    public SubmissionViewService(UserRepository userRepository, SubmissionResultRepository resultRepository) {
        this.userRepository = userRepository;
        this.resultRepository = resultRepository;
    }

    public List<SubmissionView> toViews(List<Submission> list, AuthUser viewer) {
        Set<Long> ids = list.stream().map(Submission::getUserId).collect(Collectors.toSet());
        Map<Long, String> names = new HashMap<>();
        userRepository.findAllById(ids).forEach((User u) -> names.put(u.getId(), u.getUsername()));
        return list.stream().map(s -> build(s, names.get(s.getUserId()), viewer, false)).toList();
    }

    public SubmissionView toDetail(Submission s, AuthUser viewer) {
        String name = userRepository.findById(s.getUserId()).map(User::getUsername).orElse(null);
        return build(s, name, viewer, true);
    }

    private SubmissionView build(Submission s, String username, AuthUser viewer, boolean withResults) {
        boolean privileged = viewer != null && (viewer.isTeacher() || viewer.id().equals(s.getUserId()));
        List<SubmissionResultView> results = null;
        if (withResults) {
            results = resultRepository.findBySubmissionIdOrderByTestIndexAsc(s.getId()).stream()
                    .map(r -> SubmissionResultView.builder()
                            .testIndex(r.getTestIndex()).verdict(r.getVerdict())
                            .timeMs(r.getTimeMs()).memoryKb(r.getMemoryKb()).sample(r.getSample())
                            .message(privileged ? r.getMessage() : null)
                            .expectedOutput(privileged && Boolean.TRUE.equals(r.getSample()) ? r.getExpectedOutput() : null)
                            .actualOutput(privileged && Boolean.TRUE.equals(r.getSample()) ? r.getActualOutput() : null)
                            .build())
                    .toList();
        }
        return SubmissionView.builder()
                .id(s.getId()).userId(s.getUserId()).username(username).problemId(s.getProblemId())
                .contestId(s.getContestId())
                .language(s.getLanguage()).status(s.getStatus())
                .executionTime(s.getExecutionTime()).memoryUsed(s.getMemoryUsed())
                .passedTests(s.getPassedTests()).totalTests(s.getTotalTests())
                .score(s.getScore()).maxScore(s.getMaxScore())
                .errorMessage(privileged ? s.getErrorMessage() : null)
                .submittedAt(s.getSubmittedAt())
                .sourceCode(privileged ? s.getSourceCode() : null)
                .results(results).build();
    }
}
