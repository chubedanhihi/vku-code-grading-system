package vn.vku.judge.backend.judge;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/** Ngôn ngữ được hỗ trợ + lệnh biên dịch/chạy. {@code dir} là thư mục chứa mã nguồn (trong sandbox là /work). */
public enum Language {
    C("solution.c"),
    CPP("solution.cpp"),
    JAVA("Main.java"),
    PYTHON("solution.py");

    private final String fileName;

    Language(String fileName) {
        this.fileName = fileName;
    }

    public String fileName() {
        return fileName;
    }

    public static Optional<Language> parse(String s) {
        if (s == null) return Optional.empty();
        try {
            return Optional.of(valueOf(s.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public List<String> compileCommand(String dir) {
        return switch (this) {
            case C -> List.of("gcc", "-O2", "-std=c11", "-o", dir + "/solution", dir + "/solution.c", "-lm");
            case CPP -> List.of("g++", "-O2", "-std=c++17", "-o", dir + "/solution", dir + "/solution.cpp");
            case JAVA -> List.of("javac", "-encoding", "UTF-8", "-d", dir, dir + "/Main.java");
            // py_compile giúp phát hiện lỗi cú pháp Python như một Compile Error
            case PYTHON -> List.of("python3", "-m", "py_compile", dir + "/solution.py");
        };
    }

    public List<String> runCommand(String dir, int memoryLimitMb) {
        return switch (this) {
            case C, CPP -> List.of(dir + "/solution");
            case JAVA -> List.of("java", "-Xmx" + memoryLimitMb + "m", "-Xss64m", "-XX:+UseSerialGC",
                    "-XX:TieredStopAtLevel=1", "-Xshare:auto", "-cp", dir, "Main");
            case PYTHON -> List.of("python3", "-B", dir + "/solution.py");
        };
    }
}
