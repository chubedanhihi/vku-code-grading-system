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
import java.util.UUID;

/**
 * Sandbox bằng Docker: mỗi lần biên dịch/chạy là một container tạm với
 * --network none, giới hạn RAM/CPU/pids, filesystem read-only, bỏ toàn bộ capabilities, chạy bằng user thường.
 */
@Slf4j
@Component
public class DockerSandboxRunner implements SandboxRunner {
    private static final String WORK = "/work";
    private static final String OUT = "/out";

    private final JudgeProperties props;
    private volatile long lastCheck = 0;
    private volatile boolean ready = false;
    private volatile String uidGid;

    public DockerSandboxRunner(JudgeProperties props) {
        this.props = props;
    }

    @Override
    public String name() {
        return "docker";
    }

    /** Docker daemon chạy được và image sandbox đã tồn tại (cache 10 giây). */
    @Override
    public boolean isReady() {
        long now = System.currentTimeMillis();
        if (now - lastCheck < 10_000) return ready;
        synchronized (this) {
            if (now - lastCheck < 10_000) return ready;
            ready = imageExists();
            lastCheck = System.currentTimeMillis();
        }
        return ready;
    }

    public boolean dockerAvailable() {
        return quick(List.of(props.getDockerBinary(), "info", "--format", "{{.ServerVersion}}"));
    }

    public boolean imageExists() {
        return quick(List.of(props.getDockerBinary(), "image", "inspect", props.getImage()));
    }

    public void invalidateCache() {
        lastCheck = 0;
    }

    private boolean quick(List<String> cmd) {
        try {
            return ProcessSupport.exec(cmd, null, null, 15_000, 4096, null).exitCode() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String uidGid() {
        if (uidGid == null) {
            try {
                String u = ProcessSupport.exec(List.of("id", "-u"), null, null, 3000, 64, null).stdout().trim();
                String g = ProcessSupport.exec(List.of("id", "-g"), null, null, 3000, 64, null).stdout().trim();
                uidGid = (u.matches("\\d+") && g.matches("\\d+")) ? u + ":" + g : "65534:65534";
            } catch (Exception e) {
                uidGid = "65534:65534";
            }
        }
        return uidGid;
    }

    private List<String> baseArgs(String name, int memMb, int pids) {
        List<String> c = new ArrayList<>(List.of(
                props.getDockerBinary(), "run", "--name", name,
                "--network", "none",
                "--memory", memMb + "m", "--memory-swap", memMb + "m",
                "--cpus", "1", "--pids-limit", String.valueOf(pids),
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                "--user", uidGid(),
                "--ulimit", "core=0", "--ulimit", "nofile=256",
                "--read-only", "--tmpfs", "/tmp:rw,nosuid,size=64m",
                "-e", "HOME=/tmp", "-e", "PYTHONDONTWRITEBYTECODE=1",
                "-w", WORK));
        return c;
    }

    @Override
    public CompileResult compile(Path workDir, Language lang) throws Exception {
        String name = "vku-c-" + UUID.randomUUID().toString().substring(0, 12);
        List<String> cmd = baseArgs(name, 1024, 256);
        cmd.addAll(List.of("-v", workDir.toAbsolutePath() + ":" + WORK + ":rw", props.getImage()));
        cmd.addAll(lang.compileCommand(WORK));
        try {
            ExecResult r = ProcessSupport.exec(cmd, null, null, props.getCompileTimeoutMs() + 5000L,
                    64 * 1024, () -> kill(name));
            if (r.timedOut()) return new CompileResult(false, "Biên dịch quá thời gian cho phép.");
            String log = (r.stderr() + "\n" + r.stdout()).strip().replace(WORK + "/", "");
            return new CompileResult(r.exitCode() == 0, log);
        } finally {
            remove(name);
        }
    }

    @Override
    public RunResult run(RunSpec spec) throws Exception {
        String name = "vku-r-" + UUID.randomUUID().toString().substring(0, 12);
        Path outDir = Files.createTempDirectory(Path.of(props.getWorkDir()), "out-");
        boolean java = spec.language() == Language.JAVA;
        int containerMem = spec.memoryLimitMb() + (java ? 192 : 0);
        long effectiveMs = spec.timeLimitMs() + extraMs(spec.language());
        long cpuSeconds = (effectiveMs + 999) / 1000 + 1;
        long wallMs = effectiveMs * 2 + 2500;

        List<String> cmd = baseArgs(name, containerMem, 64);
        cmd.addAll(List.of("-i", "--ulimit", "cpu=" + cpuSeconds, "--ulimit", "fsize=1048576"));
        cmd.addAll(List.of("-v", spec.workDir().toAbsolutePath() + ":" + WORK + ":ro",
                "-v", outDir.toAbsolutePath() + ":" + OUT + ":rw", props.getImage(),
                "/usr/bin/time", "-f", GnuTimeStats.FORMAT, "-o", OUT + "/stats"));
        cmd.addAll(spec.language().runCommand(WORK, spec.memoryLimitMb()));
        try {
            ExecResult r = ProcessSupport.exec(cmd, null, spec.stdin(), wallMs, props.getMaxOutputBytes(),
                    () -> kill(name));
            boolean oom = inspectOom(name);
            GnuTimeStats st = GnuTimeStats.read(outDir.resolve("stats"));
            return new RunResult(r.exitCode(), r.timedOut(), oom, r.outputExceeded(),
                    st.cpuMs, r.wallMs(), st.peakKb, r.stdout(), r.stderr());
        } finally {
            remove(name);
            deleteQuietly(outDir);
        }
    }

    long extraMs(Language l) {
        return switch (l) {
            case JAVA -> props.getJavaExtraMs();
            case PYTHON -> props.getPythonExtraMs();
            default -> 0;
        };
    }

    private boolean inspectOom(String name) {
        try {
            ExecResult r = ProcessSupport.exec(List.of(props.getDockerBinary(), "inspect", "-f",
                    "{{.State.OOMKilled}}", name), null, null, 10_000, 64, null);
            return r.stdout().trim().equals("true");
        } catch (Exception e) {
            return false;
        }
    }

    private void kill(String name) {
        quick(List.of(props.getDockerBinary(), "kill", name));
    }

    private void remove(String name) {
        quick(List.of(props.getDockerBinary(), "rm", "-f", name));
    }

    private static void deleteQuietly(Path dir) {
        try (var s = Files.walk(dir)) {
            s.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        } catch (IOException ignored) {
            // dọn dẹp best-effort
        }
    }
}
