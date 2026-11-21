package vn.vku.judge.backend.judge;

import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.RunSpec;
import vn.vku.judge.backend.judge.RunTypes.TestData;

import java.nio.file.Path;
import java.util.List;
import java.util.function.BiConsumer;

public interface SandboxRunner {
    String name();

    boolean isReady();

    CompileResult compile(Path workDir, Language language) throws Exception;

    RunResult run(RunSpec spec) throws Exception;

    /** Chạy hàng loạt test trong cùng 1 sandbox (mặc định fallback sang từng test). */
    default void runBatch(Path workDir, Language language, int timeLimitMs, int memoryLimitMb,
                          List<TestData> tests, BiConsumer<Integer, RunResult> onEach) throws Exception {
        for (int i = 0; i < tests.size(); i++) {
            RunResult r = run(new RunSpec(workDir, language, timeLimitMs, memoryLimitMb, tests.get(i).input()));
            onEach.accept(i, r);
        }
    }
}
