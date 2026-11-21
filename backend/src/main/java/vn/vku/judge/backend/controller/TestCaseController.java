package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.vku.judge.backend.entity.TestCase;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.judge.JudgeEngine;
import vn.vku.judge.backend.judge.Language;
import vn.vku.judge.backend.judge.RunTypes.RunResult;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.TestCaseRepository;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/testcases")
public class TestCaseController {
    private static final int MAX_FIELD_CHARS = 1_000_000;

    private final TestCaseRepository testCaseRepository;
    private final ProblemRepository problemRepository;
    private final JudgeEngine judgeEngine;

    public TestCaseController(TestCaseRepository testCaseRepository, ProblemRepository problemRepository,
                              JudgeEngine judgeEngine) {
        this.testCaseRepository = testCaseRepository;
        this.problemRepository = problemRepository;
        this.judgeEngine = judgeEngine;
    }

    @Data
    public static class GenerateTestsRequest {
        private int count = 5;
        private String generatorLang = "PYTHON";
        private String generatorCode;
        private String solutionLang = "PYTHON";
        private String solutionCode;
        private boolean markFirstAsSample = false;
    }

    @Public
    @GetMapping("/problem/{problemId}")
    public List<TestCase> getTestCasesByProblem(@PathVariable Long problemId, HttpServletRequest req) {
        boolean teacher = AuthInterceptor.current(req).map(u -> u.isTeacher()).orElse(false);
        List<TestCase> all = testCaseRepository.findByProblemId(problemId);
        return teacher ? all : all.stream().filter(t -> Boolean.TRUE.equals(t.getIsSample())).toList();
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public TestCase createTestCase(@RequestBody TestCase testCase) {
        if (testCase.getProblemId() == null || !problemRepository.existsById(testCase.getProblemId())) {
            throw ApiException.badRequest("problemId không hợp lệ.");
        }
        validateFields(testCase);
        testCase.setId(null);
        return testCaseRepository.save(testCase);
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PutMapping("/{id}")
    public ResponseEntity<TestCase> updateTestCase(@PathVariable Long id, @RequestBody TestCase updated) {
        validateFields(updated);
        return testCaseRepository.findById(id).map(tc -> {
            tc.setInput(updated.getInput());
            tc.setExpectedOutput(updated.getExpectedOutput());
            tc.setIsSample(Boolean.TRUE.equals(updated.getIsSample()));
            tc.setPoints(updated.getPoints() != null ? updated.getPoints() : 10);
            tc.setSubtask(updated.getSubtask() != null ? updated.getSubtask() : 1);
            return ResponseEntity.ok(testCaseRepository.save(tc));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Import hàng loạt test case từ file .zip chứa các cặp *.in / *.out (VD: 1.in, 1.out). */
    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping("/problem/{problemId}/import-zip")
    public Map<String, Object> importZip(@PathVariable Long problemId,
                                         @RequestParam("file") MultipartFile file,
                                         @RequestParam(defaultValue = "false") boolean markFirstAsSample)
            throws IOException {
        if (!problemRepository.existsById(problemId)) {
            throw ApiException.notFound("Không tìm thấy bài tập.");
        }
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Vui lòng chọn file .zip hợp lệ.");
        }

        Map<String, String> inputs = new TreeMap<>();
        Map<String, String> outputs = new TreeMap<>();

        try (ZipInputStream zis = new ZipInputStream(file.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                String name = entry.getName().replace('\\', '/');
                String base = name.contains("/") ? name.substring(name.lastIndexOf('/') + 1) : name;
                if (base.startsWith(".") || base.startsWith("__")) continue;
                String lower = base.toLowerCase(Locale.ROOT);
                String content = new String(zis.readNBytes(MAX_FIELD_CHARS + 1), StandardCharsets.UTF_8);
                if (content.length() > MAX_FIELD_CHARS) {
                    throw ApiException.badRequest("File trong zip vượt quá 1.000.000 ký tự: " + base);
                }
                if (lower.endsWith(".in")) {
                    inputs.put(base.substring(0, base.length() - 3), content);
                } else if (lower.endsWith(".out") || lower.endsWith(".ans")) {
                    int dot = base.lastIndexOf('.');
                    outputs.put(base.substring(0, dot), content);
                }
            }
        }

        int imported = 0;
        for (var e : outputs.entrySet()) {
            String key = e.getKey();
            String in = inputs.getOrDefault(key, "");
            TestCase tc = new TestCase();
            tc.setProblemId(problemId);
            tc.setInput(in);
            tc.setExpectedOutput(e.getValue());
            tc.setIsSample(markFirstAsSample && imported == 0);
            tc.setPoints(10);
            tc.setSubtask(1);
            testCaseRepository.save(tc);
            imported++;
        }
        if (imported == 0) {
            throw ApiException.badRequest("Không tìm thấy cặp file .in / .out (hoặc .ans) nào trong file zip.");
        }
        return Map.of("success", true, "imported", imported);
    }

    /** Export toàn bộ test case của 1 bài tập ra file .zip. */
    @RequireRole({"TEACHER", "ADMIN"})
    @GetMapping("/problem/{problemId}/export-zip")
    public ResponseEntity<byte[]> exportZip(@PathVariable Long problemId) throws IOException {
        if (!problemRepository.existsById(problemId)) {
            throw ApiException.notFound("Không tìm thấy bài tập.");
        }
        List<TestCase> list = testCaseRepository.findByProblemId(problemId);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
            for (int i = 0; i < list.size(); i++) {
                TestCase tc = list.get(i);
                int num = i + 1;
                zos.putNextEntry(new ZipEntry(num + ".in"));
                zos.write((tc.getInput() == null ? "" : tc.getInput()).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();

                zos.putNextEntry(new ZipEntry(num + ".out"));
                zos.write((tc.getExpectedOutput() == null ? "" : tc.getExpectedOutput()).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"problem-" + problemId + "-tests.zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(baos.toByteArray());
    }

    /** Sinh hàng loạt test case tự động bằng script sinh input + code lời giải chuẩn trong sandbox. */
    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping("/problem/{problemId}/generate")
    public Map<String, Object> generateTests(@PathVariable Long problemId, @RequestBody GenerateTestsRequest body)
            throws Exception {
        if (!problemRepository.existsById(problemId)) throw ApiException.notFound("Không tìm thấy bài tập.");
        int count = Math.min(Math.max(1, body.getCount()), 20);
        Language genLang = Language.parse(body.getGeneratorLang())
                .orElseThrow(() -> ApiException.badRequest("Ngôn ngữ generator không hợp lệ."));
        Language solLang = Language.parse(body.getSolutionLang())
                .orElseThrow(() -> ApiException.badRequest("Ngôn ngữ lời giải chuẩn không hợp lệ."));
        if (body.getGeneratorCode() == null || body.getGeneratorCode().isBlank()
                || body.getSolutionCode() == null || body.getSolutionCode().isBlank()) {
            throw ApiException.badRequest("Cần nhập cả mã nguồn sinh input và lời giải chuẩn.");
        }

        int created = 0;
        for (int i = 1; i <= count; i++) {
            RunResult genRes = judgeEngine.runCustom(genLang, body.getGeneratorCode(), 3000, 256, String.valueOf(i));
            if (genRes.exitCode() != 0) {
                throw ApiException.badRequest("Lỗi script sinh input (seed=" + i + "): " + genRes.stderr());
            }
            String input = genRes.stdout();
            RunResult solRes = judgeEngine.runCustom(solLang, body.getSolutionCode(), 3000, 256, input);
            if (solRes.exitCode() != 0) {
                throw ApiException.badRequest("Lỗi lời giải chuẩn (seed=" + i + "): " + solRes.stderr());
            }
            TestCase tc = new TestCase();
            tc.setProblemId(problemId);
            tc.setInput(input);
            tc.setExpectedOutput(solRes.stdout());
            tc.setIsSample(body.isMarkFirstAsSample() && i == 1);
            tc.setPoints(10);
            tc.setSubtask(1);
            testCaseRepository.save(tc);
            created++;
        }
        return Map.of("success", true, "generated", created);
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestCase(@PathVariable Long id) {
        if (!testCaseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        testCaseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static void validateFields(TestCase tc) {
        if (tc.getInput() == null) tc.setInput("");
        if (tc.getExpectedOutput() == null) throw ApiException.badRequest("Thiếu expectedOutput.");
        if (tc.getInput().length() > MAX_FIELD_CHARS || tc.getExpectedOutput().length() > MAX_FIELD_CHARS) {
            throw ApiException.badRequest("Test case quá lớn (tối đa 1.000.000 ký tự mỗi trường).");
        }
        if (tc.getPoints() == null || tc.getPoints() < 0) tc.setPoints(10);
        if (tc.getSubtask() == null || tc.getSubtask() < 1) tc.setSubtask(1);
    }
}
