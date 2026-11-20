package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.JudgeJob;
import vn.vku.judge.backend.judge.RunTypes.JudgeOutcome;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.RunSpec;
import vn.vku.judge.backend.judge.RunTypes.TestData;
import vn.vku.judge.backend.judge.RunTypes.TestOutcome;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Bộ máy chấm thuần (không đụng DB): biên dịch -> chạy từng test -> phân loại verdict -> tổng hợp.
 * Chạy hết các test (không dừng ở test sai đầu tiên) để có kết quả "x/y passed".
 */
@Slf4j
@Component
public class JudgeEngine {
    private static final int MSG_LIMIT = 2000;

    private final JudgeProperties props;
    private final SandboxSelector selector;

    public JudgeEngine(JudgeProperties props, SandboxSelector selector) {
        this.props = props;
        this.selector = selector;
    }

    public JudgeOutcome judge(JudgeJob job) {
        return judge(job, selector.current());
    }

    public JudgeOutcome judge(JudgeJob job, SandboxRunner runner) {
        Path dir = null;
        try {
            Path root = Path.of(props.getWorkDir());
            Files.createDirectories(root);
            dir = Files.createDirectory(root.resolve("sub-" + job.submissionId() + "-"
                    + UUID.randomUUID().toString().substring(0, 8)));
            Files.writeString(dir.resolve(job.language().fileName()), job.sourceCode(), StandardCharsets.UTF_8);

            CompileResult cr = runner.compile(dir, job.language());
            if (!cr.ok()) {
                return new JudgeOutcome(Verdict.COMPILE_ERROR, 0, job.tests().size(), 0, 0,
                        truncate(cr.log()), List.of());
            }
            return runTests(job, runner, dir);
        } catch (Exception e) {
            log.error("Lỗi hệ thống khi chấm submission {}", job.submissionId(), e);
            return new JudgeOutcome(Verdict.SYSTEM_ERROR, 0, job.tests().size(), 0, 0,
                    "Lỗi hệ thống khi chấm bài: " + e.getMessage(), List.of());
        } finally {
            deleteQuietly(dir);
        }
    }

    private JudgeOutcome runTests(JudgeJob job, SandboxRunner runner, Path dir) throws Exception {
        List<TestOutcome> outcomes = new ArrayList<>();
        int passed = 0, maxTime = 0, maxMem = 0, fatal = 0, idx = 0;
        String firstError = null;

        for (TestData t : job.tests()) {
            idx++;
            if (fatal >= props.getStopAfterFatal()) {
                outcomes.add(new TestOutcome(t.id(), idx, Verdict.SKIPPED, 0, 0, t.sample(), null));
                continue;
            }
            RunResult r = runner.run(new RunSpec(dir, job.language(), job.timeLimitMs(),
                    job.memoryLimitMb(), t.input()));
            TestOutcome o = classify(job, t, idx, r);
            outcomes.add(o);
            maxTime = Math.max(maxTime, o.timeMs());
            maxMem = Math.max(maxMem, o.memoryKb());
            if (Verdict.ACCEPTED.equals(o.verdict())) passed++;
            if (Verdict.isFatal(o.verdict())) fatal++;
            if (firstError == null && o.message() != null && Verdict.RUNTIME_ERROR.equals(o.verdict())) {
                firstError = o.message();
            }
        }
        String verdict = Verdict.aggregate(outcomes.stream().map(TestOutcome::verdict)
                .filter(v -> !Verdict.SKIPPED.equals(v)).toList());
        return new JudgeOutcome(verdict, passed, job.tests().size(), maxTime, maxMem, firstError, outcomes);
    }

    /** Phân loại kết quả chạy của 1 test (public để unit test). */
    TestOutcome classify(JudgeJob job, TestData t, int idx, RunResult r) {
        long extra = switch (job.language()) {
            case JAVA -> props.getJavaExtraMs();
            case PYTHON -> props.getPythonExtraMs();
            default -> 0;
        };
        long effectiveMs = job.timeLimitMs() + extra;
        long memKb = job.memoryLimitMb() * 1024L;
        int timeMs = (int) (r.cpuTimeMs() >= 0 ? r.cpuTimeMs() : r.wallTimeMs());
        int memUsed = (int) Math.max(0, r.peakMemoryKb());
        long timeForLimit = r.cpuTimeMs() >= 0 ? r.cpuTimeMs() : r.wallTimeMs();
        String err = r.stderr() == null ? "" : r.stderr();

        String verdict;
        String message = null;
        if (r.outputExceeded()) {
            verdict = Verdict.OUTPUT_LIMIT_EXCEEDED;
            message = "Output vượt quá giới hạn " + (props.getMaxOutputBytes() / 1024) + " KB.";
        } else if (r.oomKilled()) {
            verdict = Verdict.MEMORY_LIMIT_EXCEEDED;
        } else if (r.timedOut() || timeForLimit > effectiveMs) {
            verdict = Verdict.TIME_LIMIT_EXCEEDED;
            timeMs = (int) Math.max(timeMs, job.timeLimitMs());
        } else if (looksLikeMemoryError(job.language(), err, r.peakMemoryKb(), memKb)) {
            verdict = Verdict.MEMORY_LIMIT_EXCEEDED;
        } else if (r.exitCode() != 0) {
            verdict = Verdict.RUNTIME_ERROR;
            message = truncate(err.isBlank() ? "Chương trình kết thúc với mã lỗi " + r.exitCode() : err);
        } else if (OutputComparator.matches(t.expectedOutput(), r.stdout())) {
            verdict = Verdict.ACCEPTED;
        } else {
            verdict = Verdict.WRONG_ANSWER;
            if (t.sample()) {
                message = truncate("Mong đợi:\n" + preview(t.expectedOutput()) + "\nNhận được:\n" + preview(r.stdout()));
            }
        }
        // memory > limit nhưng vẫn thoát bình thường -> MLE (không áp dụng Java vì RSS gồm cả JVM overhead)
        if (Verdict.ACCEPTED.equals(verdict) && job.language() != Language.JAVA && r.peakMemoryKb() > memKb) {
            verdict = Verdict.MEMORY_LIMIT_EXCEEDED;
        }
        return new TestOutcome(t.id(), idx, verdict, timeMs, memUsed, t.sample(), message);
    }

    private static boolean looksLikeMemoryError(Language lang, String stderr, long peakKb, long limitKb) {
        if (stderr.contains("std::bad_alloc") || stderr.contains("MemoryError")
                || stderr.contains("java.lang.OutOfMemoryError") || stderr.contains("Cannot allocate memory")) {
            return true;
        }
        return lang != Language.JAVA && peakKb > limitKb;
    }

    private static String preview(String s) {
        String n = OutputComparator.normalize(s);
        return n.length() > 300 ? n.substring(0, 300) + "…" : n;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() > MSG_LIMIT ? s.substring(0, MSG_LIMIT) + "\n…(đã cắt bớt)" : s;
    }

    private static void deleteQuietly(Path dir) {
        if (dir == null) return;
        try (var s = Files.walk(dir)) {
            s.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        } catch (IOException ignored) {
            // best-effort
        }
    }
}
