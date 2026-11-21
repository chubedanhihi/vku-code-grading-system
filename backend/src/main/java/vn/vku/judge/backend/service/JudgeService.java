package vn.vku.judge.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.dto.RunCustomRequest;
import vn.vku.judge.backend.dto.RunCustomResponse;
import vn.vku.judge.backend.dto.SubmitRequest;
import vn.vku.judge.backend.entity.ClassroomAssignment;
import vn.vku.judge.backend.entity.Contest;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.JudgeEngine;
import vn.vku.judge.backend.judge.JudgeProperties;
import vn.vku.judge.backend.judge.JudgeResultWriter;
import vn.vku.judge.backend.judge.Language;
import vn.vku.judge.backend.judge.RunTypes.JudgeJob;
import vn.vku.judge.backend.judge.RunTypes.JudgeOutcome;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.TestData;
import vn.vku.judge.backend.judge.SubmissionProgressBus;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.queue.RabbitJudgeConfig.RabbitJudgeBroker;
import vn.vku.judge.backend.repository.ClassroomAssignmentRepository;
import vn.vku.judge.backend.repository.ContestRepository;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.TestCaseRepository;
import vn.vku.judge.backend.security.AuthUser;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Nhận bài nộp, chạy thử Custom Input, và xử lý job chấm kèm phát tiến trình SSE.
 */
@Slf4j
@Service
public class JudgeService {
    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final ContestRepository contestRepository;
    private final ClassroomAssignmentRepository assignmentRepository;
    private final JudgeEngine engine;
    private final JudgeResultWriter writer;
    private final JudgeProperties props;
    private final SubmissionProgressBus progressBus;
    private final SubmissionViewService viewService;
    private final RabbitJudgeBroker rabbitBroker;

    public JudgeService(SubmissionRepository submissionRepository, ProblemRepository problemRepository,
                        TestCaseRepository testCaseRepository, ContestRepository contestRepository,
                        ClassroomAssignmentRepository assignmentRepository,
                        JudgeEngine engine, JudgeResultWriter writer, JudgeProperties props,
                        SubmissionProgressBus progressBus, SubmissionViewService viewService,
                        @Autowired(required = false) RabbitJudgeBroker rabbitBroker) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
        this.contestRepository = contestRepository;
        this.assignmentRepository = assignmentRepository;
        this.engine = engine;
        this.writer = writer;
        this.props = props;
        this.progressBus = progressBus;
        this.viewService = viewService;
        this.rabbitBroker = rabbitBroker;
    }

    /** Chạy thử nhanh với Custom Input trong sandbox (không lưu DB). */
    public RunCustomResponse runCustom(RunCustomRequest req) {
        if (req == null || req.getSourceCode() == null || req.getSourceCode().isBlank()) {
            throw ApiException.badRequest("Mã nguồn không được để trống.");
        }
        Language lang = Language.parse(req.getLanguage())
                .orElseThrow(() -> ApiException.badRequest("Ngôn ngữ không được hỗ trợ (C, CPP, JAVA, PYTHON)."));
        if (req.getSourceCode().getBytes(StandardCharsets.UTF_8).length > props.getMaxSourceBytes()) {
            throw ApiException.badRequest("Mã nguồn quá lớn.");
        }

        int timeLimit = 2000;
        int memLimit = 256;
        if (req.getProblemId() != null) {
            Problem p = problemRepository.findById(req.getProblemId()).orElse(null);
            if (p != null) {
                timeLimit = Math.min(5000, p.getTimeLimit() != null ? p.getTimeLimit() : 2000);
                memLimit = Math.min(512, p.getMemoryLimit() != null ? p.getMemoryLimit() : 256);
            }
        }

        try {
            RunResult r = engine.runCustom(lang, req.getSourceCode(), timeLimit, memLimit, req.getInput());
            if (r.exitCode() == -99) {
                return RunCustomResponse.builder()
                        .verdict(Verdict.COMPILE_ERROR)
                        .compileError(r.stderr())
                        .build();
            }
            String verdict = r.outputExceeded() ? Verdict.OUTPUT_LIMIT_EXCEEDED
                    : r.oomKilled() ? Verdict.MEMORY_LIMIT_EXCEEDED
                    : r.timedOut() ? Verdict.TIME_LIMIT_EXCEEDED
                    : r.exitCode() != 0 ? Verdict.RUNTIME_ERROR
                    : "OK";
            int timeMs = (int) (r.cpuTimeMs() >= 0 ? r.cpuTimeMs() : r.wallTimeMs());
            return RunCustomResponse.builder()
                    .verdict(verdict)
                    .timeMs(timeMs)
                    .memoryKb((int) Math.max(0, r.peakMemoryKb()))
                    .stdout(r.stdout())
                    .stderr(r.stderr())
                    .build();
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi chạy thử: " + e.getMessage());
        }
    }

    /** Lưu bài nộp ở trạng thái PENDING; worker sẽ lấy từ hàng đợi (DB hoặc RabbitMQ). */
    public Submission submit(AuthUser user, SubmitRequest req) {
        if (req == null || req.getProblemId() == null) throw ApiException.badRequest("Thiếu problemId.");
        Language lang = Language.parse(req.getLanguage())
                .orElseThrow(() -> ApiException.badRequest("Ngôn ngữ không được hỗ trợ (C, CPP, JAVA, PYTHON)."));
        if (req.getSourceCode() == null || req.getSourceCode().isBlank()) {
            throw ApiException.badRequest("Mã nguồn không được để trống.");
        }
        if (req.getSourceCode().getBytes(StandardCharsets.UTF_8).length > props.getMaxSourceBytes()) {
            throw ApiException.badRequest("Mã nguồn quá lớn (tối đa " + props.getMaxSourceBytes() / 1024 + " KB).");
        }
        if (!problemRepository.existsById(req.getProblemId())) {
            throw ApiException.notFound("Không tìm thấy bài tập.");
        }
        if (req.getContestId() != null) {
            Contest c = contestRepository.findById(req.getContestId())
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy kỳ thi."));
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(c.getStartTime())) {
                throw ApiException.badRequest("Kỳ thi chưa bắt đầu.");
            }
            if (now.isAfter(c.getEndTime())) {
                throw ApiException.badRequest("Kỳ thi đã kết thúc, không thể nộp bài.");
            }
        }
        boolean isLate = false;
        if (req.getClassroomId() != null) {
            ClassroomAssignment assign = assignmentRepository
                    .findByClassroomIdAndProblemId(req.getClassroomId(), req.getProblemId())
                    .orElseThrow(() -> ApiException.notFound("Bài tập không thuộc lớp học này."));
            if (assign.getDueAt() != null && LocalDateTime.now().isAfter(assign.getDueAt())) {
                if (!Boolean.TRUE.equals(assign.getAllowLate())) {
                    throw ApiException.badRequest("Đã quá hạn nộp bài cho lớp học này.");
                }
                isLate = true;
            }
        }
        long mine = submissionRepository.countByUserIdAndStatusIn(user.id(), Set.of(Verdict.PENDING, Verdict.RUNNING));
        if (mine >= props.getMaxPendingPerUser()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đang có " + mine + " bài chờ chấm, vui lòng đợi kết quả rồi nộp tiếp.");
        }
        if (submissionRepository.countByStatus(Verdict.PENDING) >= props.getMaxBacklog()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Hệ thống đang quá tải, vui lòng thử lại sau.");
        }

        Submission s = new Submission();
        s.setUserId(user.id());
        s.setProblemId(req.getProblemId());
        s.setContestId(req.getContestId());
        s.setClassroomId(req.getClassroomId());
        s.setIsLate(isLate);
        s.setLanguage(lang.name());
        s.setSourceCode(req.getSourceCode());
        s.setStatus(Verdict.PENDING);
        Submission saved = submissionRepository.save(s);

        if (rabbitBroker != null) {
            rabbitBroker.enqueue(saved.getId());
        }
        return saved;
    }

    /** Chấm một submission đã được worker claim (RUNNING). */
    public void process(long submissionId) {
        try {
            Submission s = submissionRepository.findById(submissionId).orElse(null);
            if (s == null) return;
            progressBus.emit(submissionId, "status", Map.of("status", Verdict.RUNNING));

            Problem problem = problemRepository.findById(s.getProblemId()).orElse(null);
            if (problem == null) {
                completeAndNotify(submissionId, systemError("Không tìm thấy bài tập ID " + s.getProblemId()), s);
                return;
            }
            List<TestData> tests = testCaseRepository.findByProblemId(problem.getId()).stream()
                    .map(t -> new TestData(
                            t.getId(),
                            t.getInput(),
                            t.getExpectedOutput(),
                            Boolean.TRUE.equals(t.getIsSample()),
                            t.getPoints() != null ? t.getPoints() : 10,
                            t.getSubtask() != null ? t.getSubtask() : 1))
                    .toList();
            if (tests.isEmpty()) {
                completeAndNotify(submissionId, systemError("Bài tập chưa có test case nên chưa thể chấm."), s);
                return;
            }
            Language lang = Language.parse(s.getLanguage()).orElse(null);
            if (lang == null) {
                completeAndNotify(submissionId, systemError("Ngôn ngữ không được hỗ trợ: " + s.getLanguage()), s);
                return;
            }
            JudgeJob job = new JudgeJob(submissionId, lang, s.getSourceCode(),
                    problem.getTimeLimit() != null ? problem.getTimeLimit() : 1000,
                    problem.getMemoryLimit() != null ? problem.getMemoryLimit() : 256,
                    problem.getCheckerMode() != null ? problem.getCheckerMode() : "EXACT",
                    tests);
            JudgeOutcome outcome = engine.judge(job, (t, total) ->
                    progressBus.emit(submissionId, "test", Map.of(
                            "testIndex", t.index(),
                            "totalTests", total,
                            "verdict", t.verdict(),
                            "timeMs", t.timeMs(),
                            "memoryKb", t.memoryKb())));
            completeAndNotify(submissionId, outcome, s);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý submission {}", submissionId, e);
            try {
                writer.complete(submissionId, systemError("Lỗi hệ thống: " + e.getMessage()));
            } catch (Exception inner) {
                log.error("Không thể ghi lỗi hệ thống cho submission {}", submissionId, inner);
            }
        }
    }

    private void completeAndNotify(long submissionId, JudgeOutcome outcome, Submission sub) {
        writer.complete(submissionId, outcome);
        Submission refreshed = submissionRepository.findById(submissionId).orElse(sub);
        progressBus.complete(submissionId, viewService.toDetail(refreshed,
                new AuthUser(refreshed.getUserId(), "", "STUDENT")));
    }

    private static JudgeOutcome systemError(String msg) {
        return new JudgeOutcome(Verdict.SYSTEM_ERROR, 0, 0, 0, 0, 0, 0, msg, List.of());
    }
}
