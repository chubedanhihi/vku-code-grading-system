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

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClassroomService {
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    private final ClassroomRepository classRepo;
    private final ClassroomMemberRepository memberRepo;
    private final ClassroomAssignmentRepository assignRepo;
    private final ProblemRepository problemRepo;
    private final SubmissionRepository subRepo;
    private final UserRepository userRepo;

    public ClassroomService(ClassroomRepository classRepo, ClassroomMemberRepository memberRepo,
                            ClassroomAssignmentRepository assignRepo, ProblemRepository problemRepo,
                            SubmissionRepository subRepo, UserRepository userRepo) {
        this.classRepo = classRepo;
        this.memberRepo = memberRepo;
        this.assignRepo = assignRepo;
        this.problemRepo = problemRepo;
        this.subRepo = subRepo;
        this.userRepo = userRepo;
    }

    @Data
    @Builder
    public static class ClassroomView {
        private Long id;
        private String name;
        private String description;
        private String joinCode;
        private Long teacherId;
        private String teacherName;
        private long memberCount;
        private int assignmentCount;
        private boolean joined;
        private List<AssignmentView> assignments;
    }

    @Data
    @Builder
    public static class AssignmentView {
        private Long id;
        private Long problemId;
        private String title;
        private String difficulty;
        private String weekLabel;
        private LocalDateTime dueAt;
        private boolean allowLate;
        private boolean overdue;
        private String myStatus; // SOLVED, LATE_SOLVED, ATTEMPTED, NONE
    }

    @Data
    @Builder
    public static class GradebookRow {
        private Long userId;
        private String username;
        private String email;
        private int solvedCount;
        private int totalScore;
        private Map<Long, String> statuses;
    }

    public List<ClassroomView> listForUser(AuthUser user) {
        List<Classroom> all = classRepo.findAllByOrderByIdDesc();
        if (user.isTeacher()) {
            return all.stream().map(c -> toView(c, user, false)).toList();
        }
        Set<Long> myClassIds = memberRepo.findByUserId(user.id()).stream()
                .map(ClassroomMember::getClassroomId).collect(Collectors.toSet());
        return all.stream()
                .filter(c -> myClassIds.contains(c.getId()))
                .map(c -> toView(c, user, false))
                .toList();
    }

    public ClassroomView detail(long id, AuthUser user) {
        Classroom c = classRepo.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy lớp học."));
        if (!user.isTeacher() && !memberRepo.existsByClassroomIdAndUserId(id, user.id())) {
            throw ApiException.forbidden("Bạn chưa tham gia lớp học này.");
        }
        return toView(c, user, true);
    }

    public ClassroomView create(String name, String description, AuthUser teacher) {
        if (name == null || name.isBlank()) throw ApiException.badRequest("Tên lớp không được để trống.");
        Classroom c = new Classroom();
        c.setName(name.trim());
        c.setDescription(description == null ? "" : description.trim());
        c.setTeacherId(teacher.id());
        c.setJoinCode(generateCode());
        return toView(classRepo.save(c), teacher, true);
    }

    public ClassroomView joinByCode(String joinCode, AuthUser user) {
        if (joinCode == null || joinCode.isBlank()) throw ApiException.badRequest("Vui lòng nhập mã lớp.");
        Classroom c = classRepo.findByJoinCodeIgnoreCase(joinCode.trim())
                .orElseThrow(() -> ApiException.notFound("Mã lớp không tồn tại."));
        if (!memberRepo.existsByClassroomIdAndUserId(c.getId(), user.id())) {
            ClassroomMember m = new ClassroomMember();
            m.setClassroomId(c.getId());
            m.setUserId(user.id());
            memberRepo.save(m);
        }
        return toView(c, user, true);
    }

    public AssignmentView addAssignment(long classroomId, Long problemId, String weekLabel,
                                        LocalDateTime dueAt, Boolean allowLate) {
        if (!classRepo.existsById(classroomId)) throw ApiException.notFound("Không tìm thấy lớp học.");
        Problem p = problemRepo.findById(problemId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài tập."));
        ClassroomAssignment a = assignRepo.findByClassroomIdAndProblemId(classroomId, problemId)
                .orElseGet(ClassroomAssignment::new);
        a.setClassroomId(classroomId);
        a.setProblemId(problemId);
        a.setWeekLabel(weekLabel == null || weekLabel.isBlank() ? "Tuần 1" : weekLabel.trim());
        a.setDueAt(dueAt);
        a.setAllowLate(allowLate == null || allowLate);
        ClassroomAssignment saved = assignRepo.save(a);
        return AssignmentView.builder()
                .id(saved.getId()).problemId(p.getId()).title(p.getTitle())
                .difficulty(p.getDifficulty().name()).weekLabel(saved.getWeekLabel())
                .dueAt(saved.getDueAt()).allowLate(Boolean.TRUE.equals(saved.getAllowLate()))
                .overdue(saved.getDueAt() != null && LocalDateTime.now().isAfter(saved.getDueAt()))
                .myStatus("NONE").build();
    }

    public void removeAssignment(long assignmentId) {
        assignRepo.deleteById(assignmentId);
    }

    @Transactional
    public void deleteClassroom(long id) {
        assignRepo.deleteByClassroomId(id);
        classRepo.deleteById(id);
    }

    public List<GradebookRow> gradebook(long classroomId) {
        if (!classRepo.existsById(classroomId)) throw ApiException.notFound("Không tìm thấy lớp học.");
        List<ClassroomMember> members = memberRepo.findByClassroomId(classroomId);
        List<ClassroomAssignment> assigns = assignRepo.findByClassroomIdOrderByIdAsc(classroomId);
        List<Submission> subs = subRepo.findByClassroomIdOrderByIdAsc(classroomId);

        Set<Long> uids = members.stream().map(ClassroomMember::getUserId).collect(Collectors.toCollection(LinkedHashSet::new));
        subs.forEach(s -> uids.add(s.getUserId()));
        Map<Long, User> userMap = userRepo.findAllById(uids).stream().collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, Map<Long, String>> statusGrid = new HashMap<>();
        Map<Long, Map<Long, Integer>> scoreGrid = new HashMap<>();
        for (Submission s : subs) {
            Map<Long, String> row = statusGrid.computeIfAbsent(s.getUserId(), k -> new HashMap<>());
            Map<Long, Integer> sRow = scoreGrid.computeIfAbsent(s.getUserId(), k -> new HashMap<>());
            if (Verdict.ACCEPTED.equals(s.getStatus())) {
                String tag = Boolean.TRUE.equals(s.getIsLate()) ? "LATE_AC" : "AC";
                if (!"AC".equals(row.get(s.getProblemId()))) row.put(s.getProblemId(), tag);
                sRow.put(s.getProblemId(), 100);
            } else if (!row.containsKey(s.getProblemId())) {
                row.put(s.getProblemId(), "ATTEMPTED");
                sRow.put(s.getProblemId(), s.getScore() != null ? s.getScore() : 0);
            }
        }

        List<GradebookRow> rows = new ArrayList<>();
        for (Long uid : uids) {
            User u = userMap.get(uid);
            if (u == null) continue;
            Map<Long, String> st = statusGrid.getOrDefault(uid, Map.of());
            Map<Long, Integer> sc = scoreGrid.getOrDefault(uid, Map.of());
            int solved = 0;
            int total = 0;
            Map<Long, String> finalSt = new LinkedHashMap<>();
            for (ClassroomAssignment a : assigns) {
                String v = st.getOrDefault(a.getProblemId(), "NONE");
                finalSt.put(a.getProblemId(), v);
                if ("AC".equals(v) || "LATE_AC".equals(v)) solved++;
                total += sc.getOrDefault(a.getProblemId(), 0);
            }
            rows.add(GradebookRow.builder()
                    .userId(uid).username(u.getUsername()).email(u.getEmail())
                    .solvedCount(solved).totalScore(total).statuses(finalSt).build());
        }
        rows.sort(Comparator.comparingInt(GradebookRow::getTotalScore).reversed()
                .thenComparing(GradebookRow::getUsername));
        return rows;
    }

    public String exportCsv(long classroomId) {
        List<ClassroomAssignment> assigns = assignRepo.findByClassroomIdOrderByIdAsc(classroomId);
        Map<Long, Problem> pMap = problemRepo.findAllById(
                assigns.stream().map(ClassroomAssignment::getProblemId).toList())
                .stream().collect(Collectors.toMap(Problem::getId, p -> p));
        List<GradebookRow> rows = gradebook(classroomId);

        StringBuilder sb = new StringBuilder("\uFEFF"); // UTF-8 BOM cho Excel
        sb.append("Username,Email,So bai AC,Tong diem");
        for (ClassroomAssignment a : assigns) {
            Problem p = pMap.get(a.getProblemId());
            String title = p != null ? p.getTitle().replace("\"", "\"\"") : ("Problem #" + a.getProblemId());
            sb.append(",\"").append(a.getWeekLabel()).append(" - ").append(title).append("\"");
        }
        sb.append("\n");

        for (GradebookRow r : rows) {
            sb.append(csvCell(r.getUsername())).append(',')
              .append(csvCell(r.getEmail())).append(',')
              .append(r.getSolvedCount()).append(',')
              .append(r.getTotalScore());
            for (ClassroomAssignment a : assigns) {
                sb.append(',').append(csvCell(r.getStatuses().getOrDefault(a.getProblemId(), "NONE")));
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private static String csvCell(String v) {
        if (v == null) return "";
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    private ClassroomView toView(Classroom c, AuthUser user, boolean withAssignments) {
        String teacherName = userRepo.findById(c.getTeacherId()).map(User::getUsername).orElse("Giảng viên");
        List<ClassroomAssignment> assigns = assignRepo.findByClassroomIdOrderByIdAsc(c.getId());
        List<AssignmentView> views = null;
        if (withAssignments) {
            Map<Long, Problem> pMap = problemRepo.findAllById(
                    assigns.stream().map(ClassroomAssignment::getProblemId).toList())
                    .stream().collect(Collectors.toMap(Problem::getId, p -> p));
            List<Submission> mySubs = subRepo.findByClassroomIdOrderByIdAsc(c.getId()).stream()
                    .filter(s -> s.getUserId().equals(user.id())).toList();
            Map<Long, String> mySt = new HashMap<>();
            for (Submission s : mySubs) {
                if (Verdict.ACCEPTED.equals(s.getStatus())) {
                    String tag = Boolean.TRUE.equals(s.getIsLate()) ? "LATE_SOLVED" : "SOLVED";
                    if (!"SOLVED".equals(mySt.get(s.getProblemId()))) mySt.put(s.getProblemId(), tag);
                } else if (!mySt.containsKey(s.getProblemId())) {
                    mySt.put(s.getProblemId(), "ATTEMPTED");
                }
            }

            views = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            for (ClassroomAssignment a : assigns) {
                Problem p = pMap.get(a.getProblemId());
                if (p == null) continue;
                views.add(AssignmentView.builder()
                        .id(a.getId()).problemId(p.getId()).title(p.getTitle())
                        .difficulty(p.getDifficulty().name()).weekLabel(a.getWeekLabel())
                        .dueAt(a.getDueAt()).allowLate(Boolean.TRUE.equals(a.getAllowLate()))
                        .overdue(a.getDueAt() != null && now.isAfter(a.getDueAt()))
                        .myStatus(mySt.getOrDefault(p.getId(), "NONE"))
                        .build());
            }
        }
        return ClassroomView.builder()
                .id(c.getId()).name(c.getName()).description(c.getDescription())
                .joinCode(c.getJoinCode()).teacherId(c.getTeacherId()).teacherName(teacherName)
                .memberCount(memberRepo.countByClassroomId(c.getId()))
                .assignmentCount(assigns.size())
                .joined(memberRepo.existsByClassroomIdAndUserId(c.getId(), user.id()))
                .assignments(views).build();
    }

    private static String generateCode() {
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RNG.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
