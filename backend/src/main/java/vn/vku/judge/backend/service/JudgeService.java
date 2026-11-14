package vn.vku.judge.backend.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.TestCase;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.TestCaseRepository;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class JudgeService {

    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;

    public JudgeService(SubmissionRepository submissionRepository,
                        ProblemRepository problemRepository,
                        TestCaseRepository testCaseRepository) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
    }

    /**
     * Lưu submission với trạng thái PENDING, sau đó chấm bài bất đồng bộ.
     * Controller sẽ trả về PENDING ngay lập tức, frontend polling để lấy kết quả.
     */
    public Submission submitAndJudgeAsync(Submission submission) {
        if (submission.getUserId() == null) {
            submission.setUserId(1L);
        }
        submission.setStatus("PENDING");
        Submission saved = submissionRepository.save(submission);
        // Chạy chấm bài trong thread riêng
        judgeAsync(saved);
        return saved;
    }

    @Async("judgeExecutor")
    public void judgeAsync(Submission submission) {
        judge(submission);
    }

    /**
     * Logic chấm bài chính: compile → run từng test case → so sánh output.
     */
    public Submission judge(Submission submission) {
        Problem problem = problemRepository.findById(submission.getProblemId()).orElse(null);
        if (problem == null) {
            submission.setStatus("RUNTIME_ERROR");
            submission.setErrorMessage("Không tìm thấy bài tập với ID: " + submission.getProblemId());
            return submissionRepository.save(submission);
        }

        List<TestCase> testCases = testCaseRepository.findByProblemId(problem.getId());
        if (testCases.isEmpty()) {
            // Nếu bài tập chưa có test case nào thì mặc định ACCEPTED
            submission.setStatus("ACCEPTED");
            submission.setExecutionTime(0);
            return submissionRepository.save(submission);
        }

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("vku_judge_");
            String lang = submission.getLanguage().toUpperCase();
            String[] runCommand;
            String compileError = null;

            // =====================================================
            // 1. Ghi file mã nguồn và biên dịch (C++ / Java)
            // =====================================================
            if ("CPP".equals(lang)) {
                Path sourceFile = tempDir.resolve("solution.cpp");
                Path exeFile   = tempDir.resolve("solution.exe");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);

                ProcessBuilder pb = new ProcessBuilder("g++", "-O2", "-o", exeFile.toString(), sourceFile.toString())
                        .directory(tempDir.toFile())
                        .redirectErrorStream(true);
                Process compile = pb.start();

                compileError = readStream(compile.getInputStream());
                boolean done = compile.waitFor(15, TimeUnit.SECONDS);

                if (!done || compile.exitValue() != 0) {
                    submission.setStatus("COMPILE_ERROR");
                    submission.setErrorMessage(compileError);
                    return submissionRepository.save(submission);
                }
                runCommand = new String[]{exeFile.toString()};

            } else if ("JAVA".equals(lang)) {
                Path sourceFile = tempDir.resolve("Main.java");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);

                ProcessBuilder pb = new ProcessBuilder("javac", "-encoding", "UTF-8", sourceFile.toString())
                        .directory(tempDir.toFile())
                        .redirectErrorStream(true);
                Process compile = pb.start();

                compileError = readStream(compile.getInputStream());
                boolean done = compile.waitFor(15, TimeUnit.SECONDS);

                if (!done || compile.exitValue() != 0) {
                    submission.setStatus("COMPILE_ERROR");
                    submission.setErrorMessage(compileError);
                    return submissionRepository.save(submission);
                }
                runCommand = new String[]{"java", "-cp", tempDir.toString(), "Main"};

            } else if ("PYTHON".equals(lang)) {
                Path sourceFile = tempDir.resolve("solution.py");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);
                // Thử python3 trước (Linux/macOS), fallback sang python (Windows)
                String pythonCmd = findPythonCommand();
                runCommand = new String[]{pythonCmd, sourceFile.toString()};

            } else {
                submission.setStatus("COMPILE_ERROR");
                submission.setErrorMessage("Ngôn ngữ không được hỗ trợ: " + lang);
                return submissionRepository.save(submission);
            }

            // =====================================================
            // 2. Chạy từng Test Case và đối chiếu kết quả
            // =====================================================
            int maxTimeMs = 0;
            int timeLimitMs = (problem.getTimeLimit() != null) ? problem.getTimeLimit() : 2000;

            for (TestCase tc : testCases) {
                long startTime = System.nanoTime();

                ProcessBuilder runPb = new ProcessBuilder(runCommand)
                        .directory(tempDir.toFile());
                Process process = runPb.start();

                // Truyền input vào stdin
                try (BufferedWriter writer = new BufferedWriter(
                        new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
                    writer.write(tc.getInput());
                    writer.flush();
                }

                boolean finished = process.waitFor(timeLimitMs, TimeUnit.MILLISECONDS);
                long durationMs = (System.nanoTime() - startTime) / 1_000_000;
                maxTimeMs = Math.max(maxTimeMs, (int) durationMs);

                if (!finished) {
                    process.destroyForcibly();
                    submission.setStatus("TIME_LIMIT_EXCEEDED");
                    submission.setExecutionTime(timeLimitMs);
                    return submissionRepository.save(submission);
                }

                if (process.exitValue() != 0) {
                    // Đọc stderr để lấy thông tin lỗi runtime
                    String runtimeErr = readStream(process.getErrorStream());
                    submission.setStatus("RUNTIME_ERROR");
                    submission.setExecutionTime(maxTimeMs);
                    submission.setErrorMessage(runtimeErr);
                    return submissionRepository.save(submission);
                }

                // Đọc stdout
                String actualOutput;
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    actualOutput = reader.lines().collect(Collectors.joining("\n")).trim();
                }

                String expectedOutput = tc.getExpectedOutput()
                        .replace("\r\n", "\n")
                        .replace("\r", "\n")
                        .trim();

                if (!actualOutput.equals(expectedOutput)) {
                    submission.setStatus("WRONG_ANSWER");
                    submission.setExecutionTime(maxTimeMs);
                    return submissionRepository.save(submission);
                }
            }

            // Tất cả test cases đều pass
            submission.setStatus("ACCEPTED");
            submission.setExecutionTime(maxTimeMs);
            return submissionRepository.save(submission);

        } catch (Exception e) {
            submission.setStatus("RUNTIME_ERROR");
            submission.setErrorMessage(e.getMessage());
            return submissionRepository.save(submission);
        } finally {
            // Dọn dẹp thư mục tạm
            if (tempDir != null) {
                try {
                    Files.walk(tempDir)
                            .sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(File::delete);
                } catch (IOException ignored) {}
            }
        }
    }

    // ===========================
    // Helper methods
    // ===========================

    private String readStream(InputStream is) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (IOException e) {
            return "";
        }
    }

    /**
     * Tìm lệnh python phù hợp với hệ điều hành.
     * Windows thường dùng "python", Linux/Mac thường dùng "python3".
     */
    private String findPythonCommand() {
        // Thử python3 trước
        try {
            Process p = new ProcessBuilder("python3", "--version").start();
            if (p.waitFor(3, TimeUnit.SECONDS) && p.exitValue() == 0) {
                return "python3";
            }
        } catch (Exception ignored) {}
        // Fallback sang python
        return "python";
    }
}