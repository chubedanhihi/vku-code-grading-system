package vn.vku.judge.backend.judge;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Đọc file thống kê do {@code /usr/bin/time -f "%U %S %M" -o file} ghi ra. */
final class GnuTimeStats {
    static final String FORMAT = "%U %S %M";
    private static final Pattern LINE = Pattern.compile("^(\\d+(?:\\.\\d+)?) (\\d+(?:\\.\\d+)?) (\\d+)$");

    final long cpuMs;
    final long peakKb;

    private GnuTimeStats(long cpuMs, long peakKb) {
        this.cpuMs = cpuMs;
        this.peakKb = peakKb;
    }

    static GnuTimeStats unknown() {
        return new GnuTimeStats(-1, -1);
    }

    static GnuTimeStats read(Path file) {
        try {
            if (!Files.exists(file)) return unknown();
            for (String line : Files.readAllLines(file)) {
                Matcher m = LINE.matcher(line.trim());
                if (m.matches()) {
                    double cpuSec = Double.parseDouble(m.group(1)) + Double.parseDouble(m.group(2));
                    return new GnuTimeStats(Math.round(cpuSec * 1000), Long.parseLong(m.group(3)));
                }
            }
        } catch (IOException | RuntimeException ignored) {
            // file hỏng -> coi như không đo được
        }
        return unknown();
    }
}
