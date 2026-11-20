package vn.vku.judge.backend.judge;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import vn.vku.judge.backend.judge.RunTypes.*;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Kiểm thử bộ máy chấm bằng LocalSandboxRunner (cần python3 + g++ trên máy chạy test). */
class JudgeEngineLocalTest {
    @TempDir
    static Path tmp;
    static JudgeEngine engine;
    static SandboxRunner runner;

    @BeforeAll
    static void setup() {
        JudgeProperties p = new JudgeProperties();
        p.setWorkDir(tmp.toString());
        p.setSandbox("local");
        p.setMaxOutputBytes(256 * 1024);
        runner = new LocalSandboxRunner(p);
        engine = new JudgeEngine(p, null);
    }

    private static boolean has(String bin) {
        try {
            return new ProcessBuilder(bin, "--version").redirectErrorStream(true).start().waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static JudgeOutcome judge(Language l, String code, int tl, int mem, TestData... tests) {
        return engine.judge(new JudgeJob(1, l, code, tl, mem, List.of(tests)), runner);
    }

    private static TestData t(String in, String out) {
        return new TestData(1L, in, out, true);
    }

    @Test
    void pythonAccepted() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "a,b=map(int,input().split());print(a+b)", 1000, 128,
                t("3 5", "8"), t("-1 1", "0"));
        assertEquals(Verdict.ACCEPTED, o.verdict());
        assertEquals(2, o.passed());
        assertEquals(2, o.total());
    }

    @Test
    void runsAllTestsAndReportsPartialScore() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "print(int(input())*2)", 1000, 128,
                t("1", "2"), t("2", "999"), t("3", "6"));
        assertEquals(Verdict.WRONG_ANSWER, o.verdict());
        assertEquals(2, o.passed());
        assertEquals(3, o.tests().size());
        assertEquals(Verdict.WRONG_ANSWER, o.tests().get(1).verdict());
    }

    @Test
    void pythonSyntaxErrorIsCompileError() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "print(", 1000, 128, t("", "x"));
        assertEquals(Verdict.COMPILE_ERROR, o.verdict());
        assertNotNull(o.errorMessage());
    }

    @Test
    void infiniteLoopIsTimeLimitExceeded() {
        assumeTrue(has("python3"));
        long t0 = System.currentTimeMillis();
        JudgeOutcome o = judge(Language.PYTHON, "while True: pass", 500, 128, t("", "x"));
        assertEquals(Verdict.TIME_LIMIT_EXCEEDED, o.verdict());
        assertTrue(System.currentTimeMillis() - t0 < 10_000, "phải bị kill sớm");
    }

    @Test
    void runtimeErrorCapturesStderr() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "print(1/0)", 1000, 128, t("", "x"));
        assertEquals(Verdict.RUNTIME_ERROR, o.verdict());
        assertTrue(o.errorMessage().contains("ZeroDivisionError"));
    }

    @Test
    void hugeOutputDoesNotDeadlockOrExhaustMemory() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "import sys\nwhile True: sys.stdout.write('x'*65536)", 2000, 128,
                t("", "x"));
        assertEquals(Verdict.OUTPUT_LIMIT_EXCEEDED, o.verdict());
    }

    @Test
    void largeButLegalOutputIsAccepted() {
        assumeTrue(has("python3"));
        // > 64KB: trước đây dễ treo vì đọc stdout sau waitFor
        String expected = "ab\n".repeat(50_000);
        JudgeOutcome o = judge(Language.PYTHON, "print('ab\\n'*49999 + 'ab')", 3000, 128, t("", expected));
        assertEquals(Verdict.ACCEPTED, o.verdict());
    }

    @Test
    void memoryBombIsMemoryLimitExceeded() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "x = bytearray(2*1024*1024*1024)\nprint(len(x))", 3000, 64,
                t("", "1"));
        assertEquals(Verdict.MEMORY_LIMIT_EXCEEDED, o.verdict());
    }

    @Test
    void cppAcceptedAndCompileError() {
        assumeTrue(has("g++"));
        String ok = "#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b;}";
        assertEquals(Verdict.ACCEPTED, judge(Language.CPP, ok, 1000, 128, t("1000000000 1000000000", "2000000000")).verdict());
        JudgeOutcome ce = judge(Language.CPP, "int main(){ undefined_fn(); }", 1000, 128, t("", ""));
        assertEquals(Verdict.COMPILE_ERROR, ce.verdict());
    }

    @Test
    void stopsAfterTooManyFatalTests() {
        assumeTrue(has("python3"));
        TestData[] tests = new TestData[6];
        for (int i = 0; i < 6; i++) tests[i] = new TestData((long) i, "", "x", false);
        JudgeOutcome o = judge(Language.PYTHON, "print(1/0)", 1000, 128, tests);
        assertEquals(Verdict.RUNTIME_ERROR, o.verdict());
        assertEquals(3, o.tests().stream().filter(x -> Verdict.SKIPPED.equals(x.verdict())).count());
    }

    @Test
    void hiddenTestsDoNotLeakExpectedOutput() {
        assumeTrue(has("python3"));
        JudgeOutcome o = judge(Language.PYTHON, "print('wrong')", 1000, 128, new TestData(1L, "", "secret-answer", false));
        assertEquals(Verdict.WRONG_ANSWER, o.verdict());
        assertNull(o.tests().get(0).message());
    }
}
