package vn.vku.judge.backend.judge;

import java.nio.file.Path;
import java.util.List;

/** Các kiểu dữ liệu dùng chung giữa JudgeEngine và các SandboxRunner. */
public final class RunTypes {
    private RunTypes() {}

    public record CompileResult(boolean ok, String log) {}

    public record RunSpec(Path workDir, Language language, int timeLimitMs, int memoryLimitMb, String stdin) {}

    /** cpuTimeMs / peakMemoryKb = -1 nếu không đo được. */
    public record RunResult(int exitCode, boolean timedOut, boolean oomKilled, boolean outputExceeded,
                            long cpuTimeMs, long wallTimeMs, long peakMemoryKb, String stdout, String stderr) {}

    public record TestData(Long id, String input, String expectedOutput, boolean sample, int points, int subtask) {
        public TestData(Long id, String input, String expectedOutput, boolean sample) {
            this(id, input, expectedOutput, sample, 10, 1);
        }
    }

    public record JudgeJob(long submissionId, Language language, String sourceCode,
                           int timeLimitMs, int memoryLimitMb, String checkerMode, List<TestData> tests) {
        public JudgeJob(long submissionId, Language language, String sourceCode,
                        int timeLimitMs, int memoryLimitMb, List<TestData> tests) {
            this(submissionId, language, sourceCode, timeLimitMs, memoryLimitMb, "EXACT", tests);
        }
    }

    public record TestOutcome(Long testCaseId, int index, String verdict, int timeMs, int memoryKb,
                              boolean sample, String message, String expectedOutput, String actualOutput) {
        public TestOutcome(Long testCaseId, int index, String verdict, int timeMs, int memoryKb,
                           boolean sample, String message) {
            this(testCaseId, index, verdict, timeMs, memoryKb, sample, message, null, null);
        }
    }

    public record JudgeOutcome(String verdict, int passed, int total, int score, int maxScore,
                               int maxTimeMs, int maxMemoryKb, String errorMessage, List<TestOutcome> tests) {
        public JudgeOutcome(String verdict, int passed, int total, int maxTimeMs, int maxMemoryKb,
                            String errorMessage, List<TestOutcome> tests) {
            this(verdict, passed, total, 0, 0, maxTimeMs, maxMemoryKb, errorMessage, tests);
        }
    }

    public interface ProgressListener {
        void onTestCompleted(TestOutcome outcome, int totalTests);
    }
}
