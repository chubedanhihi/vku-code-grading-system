package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.judge.ProcessSupport.ExecResult;
import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.RunSpec;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Runner chạy trực tiếp trên host với ulimit (CPU, RAM, kích thước file). KHÔNG cách ly mạng/filesystem
 * nên chỉ dùng cho dev/test (judge.sandbox=local). Production phải dùng {@link DockerSandboxRunner}.
 */
@Slf4j
@Component
public class LocalSandboxRunner implements SandboxRunner {
    private static final String TIME_BIN = "/usr/bin/time";
    private final JudgeProperties props;

    public LocalSandboxRunner(JudgeProperties props) {
        this.props = props;
    }

    @Override
    public String name() {
        return "local";
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    public CompileResult compile(Path workDir, Language lang) throws Exception {
        ExecResult r = ProcessSupport.exec(lang.compileCommand(workDir.toAbsolutePath().toString()),
                workDir.toFile(), null, props.getCompileTimeoutMs(), 64 * 1024, null);
        if (r.timedOut()) return new CompileResult(false, "Biên dịch quá thời gian cho phép.");
        String log = (r.stderr() + "\n" + r.stdout()).strip().replace(workDir.toAbsolutePath() + "/", "");
        return new CompileResult(r.exitCode() == 0, log);
    }

    @Override
    public RunResult run(RunSpec spec) throws Exception {
        Path dir = spec.workDir().toAbsolutePath();
        Path statsDir = Files.createTempDirectory("vku_stats_");
        Path stats = statsDir.resolve("stats");
        boolean java = spec.language() == Language.JAVA;
        long effectiveMs = spec.timeLimitMs() + extra(spec.language());
        long cpuSeconds = (effectiveMs + 999) / 1000 + 1;
        long wallMs = effectiveMs * 2 + 1500;
        boolean hasTime = Files.isExecutable(Path.of(TIME_BIN));

        StringBuilder sh = new StringBuilder("ulimit -c 0; ulimit -f 65536; ulimit -t " + cpuSeconds + ";");
        if (!java) sh.append(" ulimit -v ").append((spec.memoryLimitMb() + 128L) * 1024).append(';');
        sh.append(" exec \"$@\"");

        List<String> cmd = new ArrayList<>(List.of("bash", "-c", sh.toString(), "_"));
        if (hasTime) cmd.addAll(List.of(TIME_BIN, "-f", GnuTimeStats.FORMAT, "-o", stats.toString()));
        cmd.addAll(spec.language().runCommand(dir.toString(), spec.memoryLimitMb()));
        try {
            ExecResult r = ProcessSupport.exec(cmd, dir.toFile(), spec.stdin(), wallMs,
                    props.getMaxOutputBytes(), null);
            GnuTimeStats st = hasTime ? GnuTimeStats.read(stats) : GnuTimeStats.unknown();
            return new RunResult(r.exitCode(), r.timedOut(), false, r.outputExceeded(),
                    st.cpuMs, r.wallMs(), st.peakKb, r.stdout(), r.stderr());
        } finally {
            try {
                Files.deleteIfExists(stats);
                Files.deleteIfExists(statsDir);
            } catch (IOException ignored) {
                // best-effort
            }
        }
    }

    private long extra(Language l) {
        return switch (l) {
            case JAVA -> props.getJavaExtraMs();
            case PYTHON -> props.getPythonExtraMs();
            default -> 0;
        };
    }
}
