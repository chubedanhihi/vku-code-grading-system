package vn.vku.judge.backend.judge;

import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.RunSpec;

import java.nio.file.Path;

public interface SandboxRunner {
    String name();

    boolean isReady();

    CompileResult compile(Path workDir, Language language) throws Exception;

    RunResult run(RunSpec spec) throws Exception;
}
