package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.JudgeJob;
import vn.vku.judge.backend.judge.RunTypes.JudgeOutcome;
import vn.vku.judge.backend.judge.RunTypes.ProgressListener;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Bộ máy chấm thuần: biên dịch -> chạy batch test trong sandbox -> phân loại verdict -> tính điểm subtask/từng test -> tổng hợp.
 */
@Slf4j
@Component
public class JudgeEngine {
    private static final int MSG_LIMIT = 2000;
    private static final int DIFF_LIMIT = 4000;

    private final JudgeProperties props;
    private final SandboxSelector selector;

    public JudgeEngine(JudgeProperties props, SandboxSelector selector) {
        this.props = props;
        this.selector = selector;
    }

    public JudgeOutcome judge(JudgeJob job) {
        return judge(job, selector.current(), null);
    }

    public JudgeOutcome judge(JudgeJob job, ProgressListener listener) {
        return judge(job, selector.current(), listener);
    }

    public JudgeOutcome judge(JudgeJob job, SandboxRunner runner) {
        return judge(job, runner, null);
    }

    public JudgeOutcome judge(JudgeJob job, SandboxRunner runner, ProgressListener listener) {
        Path dir = null;
        try {
            Path root = Path.of(props.getWorkDir());
            Files.createDirectories(root);
            dir = Files.createDirectory(root.resolve("sub-" + job.submissionId() + "-"
                    + UUID.randomUUID().toString().substring(0, 8)));
            Files.writeString(dir.resolve(job.language().fileName()), job.sourceCode(), StandardCharsets.UTF_8);

            CompileResult cr = runner.compile(dir, job.language());
            if (!cr.ok()) {
                return new JudgeOutcome(Verdict.COMPILE_ERROR, 0, job.tests().size(), 0, totalPoints(job.tests()),
                        0, 0, truncate(cr.log(), MSG_LIMIT), List.of());
            }
            return runTests(job, runner, dir, listener);
        } catch (Exception e) {
            log.error("Lỗi hệ thống khi chấm submission {}", job.submissionId(), e);
            return new JudgeOutcome(Verdict.SYSTEM_ERROR, 0, job.tests().size(), 0, totalPoints(job.tests()),
                    0, 0, "Lỗi hệ thống khi chấm bài: " + e.getMessage(), List.of());
        } finally {
            deleteQuietly(dir);
        }
    }

    /** Chạy thử nhanh với Custom Input (không lưu DB). */
    public RunResult runCustom(Language language, String sourceCode, int timeLimitMs, int memoryLimitMb,
                               String stdin) throws Exception {
        SandboxRunner runner = selector.current();
        Path root = Path.of(props.getWorkDir());
        Files.createDirectories(root);
        Path dir = Files.createDirectory(root.resolve("custom-" + UUID.randomUUID().toString().substring(0, 8)));
        try {
            Files.writeString(dir.resolve(language.fileName()), sourceCode, StandardCharsets.UTF_8);
            CompileResult cr = runner.compile(dir, language);
            if (!cr.ok()) {
                return new RunResult(-99, false, false, false, 0, 0, 0, "", cr.log());
            }
            return runner.run(new RunSpec(dir, language, timeLimitMs, memoryLimitMb, stdin == null ? "" : stdin));
        } finally {
            deleteQuietly(dir);
        }
    }

    private JudgeOutcome runTests(JudgeJob job, SandboxRunner runner, Path dir, ProgressListener listener)
            throws Exception {
        List<TestData> tests = job.tests();
        List<TestOutcome> outcomes = new ArrayList<>(tests.size());
        int[] stats = {0, 0, 0, 0}; // passed, maxTime, maxMem, fatal
        String[] firstErr = {null};
        boolean useBatch = runner instanceof DockerSandboxRunner && tests.size() > 1;

        if (useBatch) {
            runner.runBatch(dir, job.language(), job.timeLimitMs(), job.memoryLimitMb(), tests, (i, r) -> {
                TestData t = tests.get(i);
                TestOutcome o = classify(job, t, i + 1, r);
                outcomes.add(o);
                stats[1] = Math.max(stats[1], o.timeMs());
                stats[2] = Math.max(stats[2], o.memoryKb());
                if (Verdict.ACCEPTED.equals(o.verdict())) stats[0]++;
                if (firstErr[0] == null && o.message() != null && Verdict.RUNTIME_ERROR.equals(o.verdict())) {
                    firstErr[0] = o.message();
                }
                if (listener != null) listener.onTestCompleted(o, tests.size());
            });
        } else {
            for (int i = 0; i < tests.size(); i++) {
                TestData t = tests.get(i);
                if (stats[3] >= props.getStopAfterFatal()) {
                    TestOutcome skipped = new TestOutcome(t.id(), i + 1, Verdict.SKIPPED, 0, 0, t.sample(), null);
                    outcomes.add(skipped);
                    if (listener != null) listener.onTestCompleted(skipped, tests.size());
                    continue;
                }
                RunResult r = runner.run(new RunSpec(dir, job.language(), job.timeLimitMs(),
                        job.memoryLimitMb(), t.input()));
                TestOutcome o = classify(job, t, i + 1, r);
                outcomes.add(o);
                stats[1] = Math.max(stats[1], o.timeMs());
                stats[2] = Math.max(stats[2], o.memoryKb());
                if (Verdict.ACCEPTED.equals(o.verdict())) stats[0]++;
                if (Verdict.isFatal(o.verdict())) stats[3]++;
                if (firstErr[0] == null && o.message() != null && Verdict.RUNTIME_ERROR.equals(o.verdict())) {
                    firstErr[0] = o.message();
                }
                if (listener != null) listener.onTestCompleted(o, tests.size());
            }
        }

        String verdict = Verdict.aggregate(outcomes.stream().map(TestOutcome::verdict)
                .filter(v -> !Verdict.SKIPPED.equals(v)).toList());
        int[] scorePair = computeScore(tests, outcomes);
        return new JudgeOutcome(verdict, stats[0], tests.size(), scorePair[0], scorePair[1],
                stats[1], stats[2], firstErr[0], outcomes);
    }

    /** Tính điểm theo Subtask (nếu có nhiều subtask) hoặc tổng điểm từng test. */
    private static int[] computeScore(List<TestData> tests, List<TestOutcome> outcomes) {
        if (tests.isEmpty()) return new int[]{0, 0};
        Map<Integer, Integer> subPoints = new LinkedHashMap<>();
        Map<Integer, Boolean> subPassed = new LinkedHashMap<>();
        for (int i = 0; i < tests.size(); i++) {
            TestData t = tests.get(i);
            int sub = t.subtask() > 0 ? t.subtask() : 1;
            int pts = Math.max(0, t.points());
            subPoints.merge(sub, pts, Integer::sum);
            boolean ok = i < outcomes.size() && Verdict.ACCEPTED.equals(outcomes.get(i).verdict());
            subPassed.merge(sub, ok, (a, b) -> a && b);
        }
        int maxScore = subPoints.values().stream().mapToInt(Integer::intValue).sum();
        if (subPoints.size() <= 1) {
            int earned = 0;
            for (int i = 0; i < tests.size() && i < outcomes.size(); i++) {
                if (Verdict.ACCEPTED.equals(outcomes.get(i).verdict())) {
                    earned += Math.max(0, tests.get(i).points());
                }
            }
            return new int[]{earned, maxScore};
        }
        int earned = 0;
        for (var e : subPoints.entrySet()) {
            if (Boolean.TRUE.equals(subPassed.get(e.getKey()))) {
                earned += e.getValue();
            }
        }
        return new int[]{earned, maxScore};
    }

    private static int totalPoints(List<TestData> tests) {
        return tests.stream().mapToInt(t -> Math.max(0, t.points())).sum();
    }

    /** Phân loại kết quả chạy của 1 test. */
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
        String expSample = null;
        String actSample = null;

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
            message = truncate(err.isBlank() ? "Chương trình kết thúc với mã lỗi " + r.exitCode() : err, MSG_LIMIT);
        } else if (OutputComparator.matches(t.expectedOutput(), r.stdout(), job.checkerMode())) {
            verdict = Verdict.ACCEPTED;
        } else {
            verdict = Verdict.WRONG_ANSWER;
            if (t.sample()) {
                expSample = truncate(OutputComparator.normalize(t.expectedOutput()), DIFF_LIMIT);
                actSample = truncate(OutputComparator.normalize(r.stdout()), DIFF_LIMIT);
                message = truncate("Mong đợi:\n" + preview(t.expectedOutput())
                        + "\nNhận được:\n" + preview(r.stdout()), MSG_LIMIT);
            }
        }
        if (Verdict.ACCEPTED.equals(verdict) && job.language() != Language.JAVA && r.peakMemoryKb() > memKb) {
            verdict = Verdict.MEMORY_LIMIT_EXCEEDED;
        }
        return new TestOutcome(t.id(), idx, verdict, timeMs, memUsed, t.sample(), message, expSample, actSample);
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

    private static String truncate(String s, int limit) {
        if (s == null) return null;
        return s.length() > limit ? s.substring(0, limit) + "\n…(đã cắt bớt)" : s;
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
