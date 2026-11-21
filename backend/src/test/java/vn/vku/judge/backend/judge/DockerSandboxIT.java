package vn.vku.judge.backend.judge;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import vn.vku.judge.backend.judge.RunTypes.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Kiểm thử sandbox Docker thật với code độc hại. Tự bỏ qua nếu Docker/image 'vku-sandbox' chưa sẵn sàng.
 * Thư mục làm việc đặt dưới $HOME để Docker Desktop được phép mount.
 */
class DockerSandboxIT {
    static JudgeEngine engine;
    static DockerSandboxRunner runner;
    static boolean ready;

    @TempDir
    static Path unused;

    @BeforeAll
    static void setup() throws Exception {
        JudgeProperties p = new JudgeProperties();
        Path work = Path.of(System.getProperty("user.home"), ".vku-judge", "test-work");
        Files.createDirectories(work);
        p.setWorkDir(work.toString());
        p.setMaxOutputBytes(256 * 1024);
        runner = new DockerSandboxRunner(p);
        ready = runner.dockerAvailable() && runner.imageExists();
        engine = new JudgeEngine(p, null);
    }

    private static JudgeOutcome judge(Language l, String code, int tl, int mem, TestData... tests) {
        assumeTrue(ready, "Docker hoặc image vku-sandbox chưa sẵn sàng");
        return engine.judge(new JudgeJob(1, l, code, tl, mem, List.of(tests)), runner);
    }

    private static TestData t(String in, String out) {
        return new TestData(1L, in, out, true);
    }

    @Test
    void acceptsCorrectCppAndJavaAndPython() {
        String cpp = "#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<std::endl;}";
        String java = "import java.util.*;public class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()+s.nextLong());}}";
        String py = "a,b=map(int,input().split());print(a+b)";
        for (var e : List.of(Language.CPP, Language.JAVA, Language.PYTHON)) {
            String code = e == Language.CPP ? cpp : e == Language.JAVA ? java : py;
            JudgeOutcome o = judge(e, code, 1000, 256, t("3 4", "7"));
            assertEquals(Verdict.ACCEPTED, o.verdict(), e + ": " + o);
            assertTrue(o.maxMemoryKb() > 0, "phải đo được bộ nhớ");
        }
    }

    @Test
    void infiniteLoopIsTle() {
        JudgeOutcome o = judge(Language.CPP, "int main(){while(1);}", 500, 128, t("", ""));
        assertEquals(Verdict.TIME_LIMIT_EXCEEDED, o.verdict());
    }

    @Test
    void memoryBombIsMle() {
        String code = "#include <stdlib.h>\n#include <string.h>\nint main(){for(;;){char*p=(char*)malloc(1<<24);if(!p)return 0;memset(p,1,1<<24);}}";
        JudgeOutcome o = judge(Language.CPP, code, 3000, 64, t("", ""));
        assertEquals(Verdict.MEMORY_LIMIT_EXCEEDED, o.verdict());
    }

    @Test
    void networkIsBlocked() {
        String py = "import socket,sys\ntry:\n s=socket.create_connection(('1.1.1.1',53),timeout=2)\n print('CONNECTED')\nexcept Exception:\n print('BLOCKED')";
        JudgeOutcome o = judge(Language.PYTHON, py, 5000, 128, t("", "BLOCKED"));
        assertEquals(Verdict.ACCEPTED, o.verdict(), "mạng phải bị chặn: " + o);
    }

    @Test
    void cannotWriteToSystemOrWorkDir() {
        String py = "import os\nr=[]\nfor p in ['/etc/vku_pwn','/usr/vku_pwn','/work/vku_pwn']:\n try:\n  open(p,'w').write('x'); r.append('W')\n except Exception: r.append('-')\nprint(''.join(r))";
        JudgeOutcome o = judge(Language.PYTHON, py, 3000, 128, t("", "---"));
        assertEquals(Verdict.ACCEPTED, o.verdict(), "không được ghi vào FS: " + o);
    }

    @Test
    void forkBombIsContained() {
        String code = "#include <unistd.h>\nint main(){for(;;)fork();}";
        long t0 = System.currentTimeMillis();
        JudgeOutcome o = judge(Language.CPP, code, 1000, 128, t("", ""));
        assertNotEquals(Verdict.ACCEPTED, o.verdict());
        assertTrue(System.currentTimeMillis() - t0 < 30_000);
    }

    @Test
    void cannotReadHostFiles() {
        String py = "import os\nprint(os.path.exists('/home') and len(os.listdir('/home')))";
        JudgeOutcome o = judge(Language.PYTHON, py, 3000, 128, t("", "0"));
        assertEquals(Verdict.ACCEPTED, o.verdict(), "container không được thấy /home của host: " + o);
    }
}
