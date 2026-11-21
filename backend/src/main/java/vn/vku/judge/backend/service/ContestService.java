package vn.vku.judge.backend.service;

import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vku.judge.backend.entity.*;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.*;
import vn.vku.judge.backend.security.AuthUser;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ContestService {
    private final ContestRepository contestRepo;
    private final ContestProblemRepository cpRepo;
    private final ContestRegistrationRepository regRepo;
    private final ProblemRepository problemRepo;
    private final SubmissionRepository subRepo;
    private final UserRepository userRepo;

    public ContestService(ContestRepository contestRepo, ContestProblemRepository cpRepo,
                          ContestRegistrationRepository regRepo, ProblemRepository problemRepo,
                          SubmissionRepository subRepo, UserRepository userRepo) {
        this.contestRepo = contestRepo;
        this.cpRepo = cpRepo;
        this.regRepo = regRepo;
        this.problemRepo = problemRepo;
        this.subRepo = subRepo;
        this.userRepo = userRepo;
    }

    @Data
    @Builder
    public static class ContestView {
        private Long id;
        private String title;
        private String description;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String status; // UPCOMING, RUNNING, ENDED
        private long participantCount;
        private int problemCount;
        private boolean registered;
        private List<ContestProblemView> problems;
    }

    @Data
    @Builder
    public static class ContestProblemView {
        private Long problemId;
        private String title;
        private String difficulty;
        private Integer timeLimit;
        private Integer memoryLimit;
        private Integer orderIndex;
        private Integer points;
    }

    @Data
    @Builder
    public static class StandingRow {
        private int rank;
        private Long userId;
        private String username;
        private int solved;
        private long penaltyMinutes;
        private Map<Long, ProblemCell> cells;
    }

    @Data
    @Builder
    public static class ProblemCell {
        private boolean solved;
        private int wrongAttempts;
        private long solvedMinutes;
    }

    public List<ContestView> list(AuthUser viewer) {
        return contestRepo.findAllByOrderByStartTimeDesc().stream()
                .map(c -> toView(c, viewer, false))
                .toList();
    }

    public ContestView detail(long id, AuthUser viewer) {
        Contest c = contestRepo.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy kỳ thi."));
        return toView(c, viewer, true);
    }

    @Transactional
    public ContestView create(String title, String description, LocalDateTime start, LocalDateTime end,
                              List<Long> problemIds, AuthUser creator) {
        if (title == null || title.isBlank()) throw ApiException.badRequest("Tiêu đề kỳ thi không được để trống.");
        if (start == null || end == null || !end.isAfter(start)) {
            throw ApiException.badRequest("Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
        Contest c = new Contest();
        c.setTitle(title.trim());
        c.setDescription(description == null ? "" : description.trim());
        c.setStartTime(start);
        c.setEndTime(end);
        c.setCreatedBy(creator.id());
        Contest saved = contestRepo.save(c);

        if (problemIds != null) {
            int idx = 0;
            for (Long pid : problemIds) {
                if (problemRepo.existsById(pid)) {
                    ContestProblem cp = new ContestProblem();
                    cp.setContestId(saved.getId());
                    cp.setProblemId(pid);
                    cp.setOrderIndex(idx++);
                    cp.setPoints(100);
                    cpRepo.save(cp);
                }
            }
        }
        return toView(saved, creator, true);
    }

    @Transactional
    public void delete(long id) {
        if (!contestRepo.existsById(id)) throw ApiException.notFound("Không tìm thấy kỳ thi.");
        cpRepo.deleteByContestId(id);
        contestRepo.deleteById(id);
    }

    public void register(long contestId, AuthUser user) {
        Contest c = contestRepo.findById(contestId).orElseThrow(() -> ApiException.notFound("Không tìm thấy kỳ thi."));
        if (LocalDateTime.now().isAfter(c.getEndTime())) {
            throw ApiException.badRequest("Kỳ thi đã kết thúc.");
        }
        if (!regRepo.existsByContestIdAndUserId(contestId, user.id())) {
            ContestRegistration reg = new ContestRegistration();
            reg.setContestId(contestId);
            reg.setUserId(user.id());
            regRepo.save(reg);
        }
    }

    /** Bảng xếp hạng ICPC: sắp xếp theo số bài giải giảm dần, tổng phạt thời gian (phút + 20*WA) tăng dần. */
    public List<StandingRow> standings(long contestId) {
        Contest c = contestRepo.findById(contestId).orElseThrow(() -> ApiException.notFound("Không tìm thấy kỳ thi."));
        List<Submission> subs = subRepo.findByContestIdOrderByIdAsc(contestId);
        List<ContestRegistration> regs = regRepo.findByContestId(contestId);

        Set<Long> userIds = new LinkedHashSet<>();
        regs.forEach(r -> userIds.add(r.getUserId()));
        subs.forEach(s -> userIds.add(s.getUserId()));
        if (userIds.isEmpty()) return List.of();

        Map<Long, String> names = userRepo.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        Map<Long, Map<Long, ProblemCell>> grid = new HashMap<>();
        userIds.forEach(uid -> grid.put(uid, new LinkedHashMap<>()));

        for (Submission s : subs) {
            if (Verdict.PENDING.equals(s.getStatus()) || Verdict.RUNNING.equals(s.getStatus())
                    || Verdict.COMPILE_ERROR.equals(s.getStatus())) {
                continue;
            }
            Map<Long, ProblemCell> row = grid.computeIfAbsent(s.getUserId(), k -> new LinkedHashMap<>());
            ProblemCell cell = row.computeIfAbsent(s.getProblemId(), k -> ProblemCell.builder().build());
            if (cell.isSolved()) continue;
            if (Verdict.ACCEPTED.equals(s.getStatus())) {
                long mins = s.getSubmittedAt() != null
                        ? Math.max(0, Duration.between(c.getStartTime(), s.getSubmittedAt()).toMinutes())
                        : 0;
                cell.setSolved(true);
                cell.setSolvedMinutes(mins);
            } else {
                cell.setWrongAttempts(cell.getWrongAttempts() + 1);
            }
        }

        List<StandingRow> rows = new ArrayList<>();
        for (Long uid : userIds) {
            Map<Long, ProblemCell> cells = grid.get(uid);
            int solved = 0;
            long penalty = 0;
            for (ProblemCell cell : cells.values()) {
                if (cell.isSolved()) {
                    solved++;
                    penalty += cell.getSolvedMinutes() + cell.getWrongAttempts() * 20L;
                }
            }
            rows.add(StandingRow.builder()
                    .userId(uid)
                    .username(names.getOrDefault(uid, "User #" + uid))
                    .solved(solved)
                    .penaltyMinutes(penalty)
                    .cells(cells)
                    .build());
        }

        rows.sort(Comparator.comparingInt(StandingRow::getSolved).reversed()
                .thenComparingLong(StandingRow::getPenaltyMinutes)
                .thenComparing(StandingRow::getUsername));
        for (int i = 0; i < rows.size(); i++) {
            rows.get(i).setRank(i + 1);
        }
        return rows;
    }

    private ContestView toView(Contest c, AuthUser viewer, boolean withProblems) {
        LocalDateTime now = LocalDateTime.now();
        String status = now.isBefore(c.getStartTime()) ? "UPCOMING"
                : now.isAfter(c.getEndTime()) ? "ENDED" : "RUNNING";
        List<ContestProblem> cps = cpRepo.findByContestIdOrderByOrderIndexAsc(c.getId());
        List<ContestProblemView> probViews = null;
        if (withProblems) {
            Map<Long, Problem> pMap = problemRepo.findAllById(
                    cps.stream().map(ContestProblem::getProblemId).toList())
                    .stream().collect(Collectors.toMap(Problem::getId, p -> p));
            probViews = new ArrayList<>();
            for (ContestProblem cp : cps) {
                Problem p = pMap.get(cp.getProblemId());
                if (p != null) {
                    probViews.add(ContestProblemView.builder()
                            .problemId(p.getId())
                            .title(p.getTitle())
                            .difficulty(p.getDifficulty().name())
                            .timeLimit(p.getTimeLimit())
                            .memoryLimit(p.getMemoryLimit())
                            .orderIndex(cp.getOrderIndex())
                            .points(cp.getPoints())
                            .build());
                }
            }
        }
        boolean reg = viewer != null && regRepo.existsByContestIdAndUserId(c.getId(), viewer.id());
        return ContestView.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .startTime(c.getStartTime())
                .endTime(c.getEndTime())
                .status(status)
                .participantCount(regRepo.countByContestId(c.getId()))
                .problemCount(cps.size())
                .registered(reg)
                .problems(probViews)
                .build();
    }
}
