package vn.vku.judge.backend.judge;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Chạy tiến trình con an toàn: đọc stdout/stderr song song (tránh deadlock khi pipe đầy),
 * giới hạn dung lượng output, và kill khi quá thời gian.
 */
final class ProcessSupport {
    private ProcessSupport() {}

    record ExecResult(int exitCode, boolean timedOut, boolean outputExceeded,
                      String stdout, String stderr, long wallMs) {}

    /** Đọc stream, chỉ giữ tối đa {@code max} byte; vượt quá thì đặt cờ và tiếp tục xả bỏ dữ liệu. */
    private static final class Capture implements Runnable {
        private final InputStream in;
        private final int max;
        private final ByteArrayOutputStream buf = new ByteArrayOutputStream();
        volatile boolean exceeded;

        Capture(InputStream in, int max) {
            this.in = in;
            this.max = max;
        }

        @Override
        public void run() {
            byte[] chunk = new byte[8192];
            try {
                int n;
                while ((n = in.read(chunk)) != -1) {
                    if (buf.size() + n > max) {
                        buf.write(chunk, 0, Math.max(0, max - buf.size()));
                        exceeded = true;
                    } else if (!exceeded) {
                        buf.write(chunk, 0, n);
                    }
                }
            } catch (IOException ignored) {
                // process bị kill
            }
        }

        String text() {
            return buf.toString(StandardCharsets.UTF_8);
        }
    }

    static ExecResult exec(List<String> cmd, File dir, String stdin, long wallMs, int maxOut, Runnable killHook)
            throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        if (dir != null) pb.directory(dir);
        long t0 = System.nanoTime();
        Process p = pb.start();

        Capture out = new Capture(p.getInputStream(), maxOut);
        Capture err = new Capture(p.getErrorStream(), 64 * 1024);
        Thread tOut = daemon(out, "judge-stdout");
        Thread tErr = daemon(err, "judge-stderr");
        Thread tIn = daemon(() -> {
            try (OutputStream os = p.getOutputStream()) {
                if (stdin != null) os.write(stdin.getBytes(StandardCharsets.UTF_8));
            } catch (IOException ignored) {
                // chương trình đóng stdin sớm
            }
        }, "judge-stdin");
        tOut.start();
        tErr.start();
        tIn.start();

        long deadline = t0 + TimeUnit.MILLISECONDS.toNanos(wallMs);
        boolean timedOut = false;
        boolean killed = false;
        while (!p.waitFor(15, TimeUnit.MILLISECONDS)) {
            if (out.exceeded) {
                killed = true;
                break;
            }
            if (System.nanoTime() > deadline) {
                timedOut = true;
                killed = true;
                break;
            }
        }
        if (killed) {
            if (killHook != null) killHook.run();
            p.descendants().forEach(ProcessHandle::destroyForcibly);
            p.destroyForcibly();
            p.waitFor(3, TimeUnit.SECONDS);
        }
        tOut.join(2000);
        tErr.join(2000);
        long wall = (System.nanoTime() - t0) / 1_000_000;
        int exit = p.isAlive() ? -1 : p.exitValue();
        return new ExecResult(exit, timedOut, out.exceeded, out.text(), err.text(), wall);
    }

    private static Thread daemon(Runnable r, String name) {
        Thread t = new Thread(r, name);
        t.setDaemon(true);
        return t;
    }
}
