package vn.vku.judge.backend.service;

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

    public Submission judge(Submission submission) {
        Problem problem = problemRepository.findById(submission.getProblemId()).orElse(null);
        if (problem == null) {
            submission.setStatus("RUNTIME_ERROR");
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

            // 1. Ghi file mã nguồn và biên dịch (nếu là C++ hoặc Java)
            if ("CPP".equals(lang)) {
                Path sourceFile = tempDir.resolve("solution.cpp");
                Path exeFile = tempDir.resolve("solution.exe");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);

                Process compile = new ProcessBuilder("g++", sourceFile.toString(), "-o", exeFile.toString())
                        .directory(tempDir.toFile())
                        .start();
                if (!compile.waitFor(10, TimeUnit.SECONDS) || compile.exitValue() != 0) {
                    submission.setStatus("COMPILE_ERROR");
                    return submissionRepository.save(submission);
                }
                runCommand = new String[]{exeFile.toString()};

            } else if ("JAVA".equals(lang)) {
                Path sourceFile = tempDir.resolve("Main.java");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);

                Process compile = new ProcessBuilder("javac", "-encoding", "UTF-8", sourceFile.toString())
                        .directory(tempDir.toFile())
                        .start();
                if (!compile.waitFor(10, TimeUnit.SECONDS) || compile.exitValue() != 0) {
                    submission.setStatus("COMPILE_ERROR");
                    return submissionRepository.save(submission);
                }
                runCommand = new String[]{"java", "-cp", tempDir.toString(), "Main"};

            } else if ("PYTHON".equals(lang)) {
                Path sourceFile = tempDir.resolve("solution.py");
                Files.writeString(sourceFile, submission.getSourceCode(), StandardCharsets.UTF_8);
                runCommand = new String[]{"python", sourceFile.toString()};

            } else {
                submission.setStatus("COMPILE_ERROR");
                return submissionRepository.save(submission);
            }

            // 2. Chạy từng Test Case và đối chiếu kết quả
            int maxTimeMs = 0;
            int timeLimitMs = problem.getTimeLimit() != null ? problem.getTimeLimit() : 2000;

            for (TestCase tc : testCases) {
                long startTime = System.nanoTime();
                Process process = new ProcessBuilder(runCommand)
                        .directory(tempDir.toFile())
                        .start();

                // Truyền dữ liệu Input của TestCase vào stdin
                try (BufferedWriter writer = new BufferedWriter(
                        new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
                    writer.write(tc.getInput());
                    writer.newLine();
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
                    submission.setStatus("RUNTIME_ERROR");
                    submission.setExecutionTime(maxTimeMs);
                    return submissionRepository.save(submission);
                }

                String actualOutput;
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                    actualOutput = reader.lines().collect(Collectors.joining("\n")).trim();
                }

                String expectedOutput = tc.getExpectedOutput().replace("\r\n", "\n").trim();
                if (!actualOutput.equals(expectedOutput)) {
                    submission.setStatus("WRONG_ANSWER");
                    submission.setExecutionTime(maxTimeMs);
                    return submissionRepository.save(submission);
                }
            }

            submission.setStatus("ACCEPTED");
            submission.setExecutionTime(maxTimeMs);
            return submissionRepository.save(submission);

        } catch (Exception e) {
            submission.setStatus("RUNTIME_ERROR");
            return submissionRepository.save(submission);
        } finally {
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
}