package vn.vku.judge.backend.service;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PlagiarismServiceTest {
    @Test
    void detectsIdenticalStructureEvenWithCommentsAndSpacing() {
        String a = """
                #include <iostream>
                // comment A
                int main() {
                    int x, y;
                    std::cin >> x >> y;
                    std::cout << x + y << std::endl;
                    return 0;
                }
                """;
        String b = """
                #include <iostream>
                /* another comment */
                int main(){int x,y;std::cin>>x>>y;std::cout<<x+y<<std::endl;return 0;}
                """;
        Set<Integer> fa = PlagiarismService.fingerprint(a);
        Set<Integer> fb = PlagiarismService.fingerprint(b);
        assertEquals(fa, fb);
    }

    @Test
    void differentProgramsHaveLowOverlap() {
        String a = "for i in range(100): print(i * i)";
        String b = "def gcd(a, b): return a if b == 0 else gcd(b, a % b)\nprint(gcd(12, 18))";
        Set<Integer> fa = PlagiarismService.fingerprint(a);
        Set<Integer> fb = PlagiarismService.fingerprint(b);
        long inter = fa.stream().filter(fb::contains).count();
        assertTrue(inter == 0);
    }
}
