package vn.vku.judge.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.dto.SubmitRequest;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.JudgeEngine;
import vn.vku.judge.backend.judge.JudgeProperties;
import vn.vku.judge.backend.judge.JudgeResultWriter;
import vn.vku.judge.backend.judge.Language;
import vn.vku.judge.backend.judge.RunTypes.JudgeJob;
import vn.vku.judge.backend.judge.RunTypes.JudgeOutcome;
import vn.vku.judge.backend.judge.RunTypes.TestData;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.TestCaseRepository;
import vn.vku.judge.backend.security.AuthUser;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

/**
 * Nhận bài nộp (kiểm tra hợp lệ + chống spam) và xử lý một job chấm.
 * Việc lấy job ra khỏi hàng đợi do {@link vn.vku.judge.backend.queue.SubmissionQueueWorker} đảm nhiệm.
 */
@Slf4j
@Service
public class JudgeService {
    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final JudgeEngine engine;
    private final JudgeResultWriter writer;
    private final JudgeProperties props;

    public JudgeService(SubmissionRepository submissionRepository, ProblemRepository problemRepository,
                        TestCaseRepository testCaseRepository, JudgeEngine engine,
                        JudgeResultWriter writer, JudgeProperties props) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
        this.engine = engine;
        this.writer = writer;
        this.props = props;
    }

    /** Lưu bài nộp ở trạng thái PENDING; worker sẽ nhặt từ hàng đợi. */
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
        s.setLanguage(lang.name());
        s.setSourceCode(req.getSourceCode());
        s.setStatus(Verdict.PENDING);
        return submissionRepository.save(s);
    }

    /** Chấm một submission đã được worker claim (RUNNING). Không ném exception ra ngoài. */
    public void process(long submissionId) {
        try {
            Submission s = submissionRepository.findById(submissionId).orElse(null);
            if (s == null) return;
            Problem problem = problemRepository.findById(s.getProblemId()).orElse(null);
            if (problem == null) {
                writer.complete(submissionId, systemError("Không tìm thấy bài tập ID " + s.getProblemId()));
                return;
            }
            List<TestData> tests = testCaseRepository.findByProblemId(problem.getId()).stream()
                    .map(t -> new TestData(t.getId(), t.getInput(), t.getExpectedOutput(),
                            Boolean.TRUE.equals(t.getIsSample())))
                    .toList();
            if (tests.isEmpty()) {
                writer.complete(submissionId, systemError("Bài tập chưa có test case nên chưa thể chấm."));
                return;
            }
            Language lang = Language.parse(s.getLanguage()).orElse(null);
            if (lang == null) {
                writer.complete(submissionId, systemError("Ngôn ngữ không được hỗ trợ: " + s.getLanguage()));
                return;
            }
            JudgeJob job = new JudgeJob(submissionId, lang, s.getSourceCode(),
                    problem.getTimeLimit() != null ? problem.getTimeLimit() : 1000,
                    problem.getMemoryLimit() != null ? problem.getMemoryLimit() : 256, tests);
            writer.complete(submissionId, engine.judge(job));
        } catch (Exception e) {
            log.error("Lỗi khi xử lý submission {}", submissionId, e);
            try {
                writer.complete(submissionId, systemError("Lỗi hệ thống: " + e.getMessage()));
            } catch (Exception inner) {
                log.error("Không thể ghi lỗi hệ thống cho submission {}", submissionId, inner);
            }
        }
    }

    private static JudgeOutcome systemError(String msg) {
        return new JudgeOutcome(Verdict.SYSTEM_ERROR, 0, 0, 0, 0, msg, List.of());
    }
}
