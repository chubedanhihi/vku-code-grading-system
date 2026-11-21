package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.judge.ProcessSupport.ExecResult;
import vn.vku.judge.backend.judge.RunTypes.CompileResult;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.judge.RunTypes.RunSpec;
import vn.vku.judge.backend.judge.RunTypes.TestData;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.BiConsumer;

/**
 * Sandbox bằng Docker: mỗi lần biên dịch/chạy là container tạm với
 * --network none, giới hạn RAM/CPU/pids, filesystem read-only, bỏ toàn bộ capabilities, chạy bằng user thường.
 * Hỗ trợ chạy hàng loạt test trong 1 container duy nhất (runBatch) để giảm ~300ms khởi động mỗi test.
 */
@Slf4j
@Component
public class DockerSandboxRunner implements SandboxRunner {
    private static final String WORK = "/work";
    private static final String OUT = "/out";
    private static final String TESTS = "/tests";

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
        return new ArrayList<>(List.of(
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

    /** Chạy tất cả test trong 1 container duy nhất để tối ưu tốc độ khởi động. */
    @Override
    public void runBatch(Path workDir, Language language, int timeLimitMs, int memoryLimitMb,
                         List<TestData> tests, BiConsumer<Integer, RunResult> onEach) throws Exception {
        if (tests.size() <= 1) {
            SandboxRunner.super.runBatch(workDir, language, timeLimitMs, memoryLimitMb, tests, onEach);
            return;
        }

        String name = "vku-b-" + UUID.randomUUID().toString().substring(0, 12);
        Path testsDir = Files.createTempDirectory(Path.of(props.getWorkDir()), "tests-");
        Path outDir = Files.createTempDirectory(Path.of(props.getWorkDir()), "bout-");

        boolean java = language == Language.JAVA;
        int containerMem = memoryLimitMb + (java ? 192 : 0);
        long effectiveMs = timeLimitMs + extraMs(language);
        long cpuSeconds = (effectiveMs + 999) / 1000 + 1;
        double wallSecPerTest = Math.max(1.5, (effectiveMs * 2.0 + 500) / 1000.0);
        long totalWallMs = (long) (tests.size() * (effectiveMs * 2 + 1000)) + 8000;
        int maxOut = props.getMaxOutputBytes();

        for (int i = 0; i < tests.size(); i++) {
            String in = tests.get(i).input() == null ? "" : tests.get(i).input();
            Files.writeString(testsDir.resolve(i + ".in"), in, StandardCharsets.UTF_8);
        }

        StringBuilder runCmd = new StringBuilder();
        for (String arg : language.runCommand(WORK, memoryLimitMb)) {
            runCmd.append(' ').append(shellQuote(arg));
        }

        String script = "#!/bin/sh\n"
                + "i=0\n"
                + "while [ $i -lt " + tests.size() + " ]; do\n"
                + "  ( ulimit -c 0; ulimit -f 65536; ulimit -t " + cpuSeconds + "; "
                + (java ? "" : "ulimit -v " + ((memoryLimitMb + 128L) * 1024) + "; ")
                + "exec timeout -k 1 " + wallSecPerTest + " /usr/bin/time -f '" + GnuTimeStats.FORMAT
                + "' -o " + OUT + "/$i.stats" + runCmd + " < " + TESTS + "/$i.in"
                + " 2> " + OUT + "/$i.err | head -c " + (maxOut + 1) + " > " + OUT + "/$i.out;"
                + " )\n"
                + "  echo $? > " + OUT + "/$i.rc\n"
                + "  i=$((i+1))\n"
                + "done\n";
        Files.writeString(testsDir.resolve("_batch.sh"), script, StandardCharsets.UTF_8);

        List<String> cmd = baseArgs(name, containerMem, 64);
        cmd.addAll(List.of(
                "-v", workDir.toAbsolutePath() + ":" + WORK + ":ro",
                "-v", testsDir.toAbsolutePath() + ":" + TESTS + ":ro",
                "-v", outDir.toAbsolutePath() + ":" + OUT + ":rw",
                props.getImage(), "sh", TESTS + "/_batch.sh"));

        try {
            ExecResult batchRes = ProcessSupport.exec(cmd, null, null, totalWallMs, 64 * 1024, () -> kill(name));
            boolean oom = inspectOom(name);
            for (int i = 0; i < tests.size(); i++) {
                Path rcPath = outDir.resolve(i + ".rc");
                if (!Files.exists(rcPath)) {
                    onEach.accept(i, new RunResult(-1, batchRes.timedOut() && !oom, oom, false,
                            -1, timeLimitMs, -1, "", oom ? "Memory Limit Exceeded" : "Execution aborted"));
                    continue;
                }
                int rc = parseIntQuiet(Files.readString(rcPath).trim(), -1);
                boolean timedOut = rc == 124 || rc == 137;
                byte[] outBytes = Files.exists(outDir.resolve(i + ".out"))
                        ? Files.readAllBytes(outDir.resolve(i + ".out")) : new byte[0];
                boolean outputExceeded = outBytes.length > maxOut;
                String stdout = new String(outBytes, 0, Math.min(outBytes.length, maxOut), StandardCharsets.UTF_8);
                String stderr = Files.exists(outDir.resolve(i + ".err"))
                        ? Files.readString(outDir.resolve(i + ".err")) : "";
                GnuTimeStats st = GnuTimeStats.read(outDir.resolve(i + ".stats"));
                onEach.accept(i, new RunResult(rc, timedOut && !oom, oom, outputExceeded,
                        st.cpuMs, st.cpuMs >= 0 ? st.cpuMs : 0, st.peakKb, stdout, stderr));
            }
        } finally {
            remove(name);
            deleteQuietly(testsDir);
            deleteQuietly(outDir);
        }
    }

    private static String shellQuote(String s) {
        return "'" + s.replace("'", "'\"'\"'") + "'";
    }

    private static int parseIntQuiet(String s, int def) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return def;
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
