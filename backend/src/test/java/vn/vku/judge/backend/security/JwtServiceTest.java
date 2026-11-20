package vn.vku.judge.backend.security;

import org.junit.jupiter.api.Test;
import vn.vku.judge.backend.entity.User;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private static JwtService service(String secret, long hours) {
        JwtService s = new JwtService(secret, hours);
        s.init();
        return s;
    }

    private static User user() {
        User u = new User();
        u.setId(7L);
        u.setUsername("an");
        u.setRole("TEACHER");
        return u;
    }

    @Test
    void roundTrip() {
        JwtService s = service("0123456789012345678901234567890123456789", 1);
        AuthUser a = s.verify(s.issue(user())).orElseThrow();
        assertEquals(7L, a.id());
        assertEquals("an", a.username());
        assertTrue(a.isTeacher());
    }

    @Test
    void rejectsTamperedToken() {
        JwtService s = service("0123456789012345678901234567890123456789", 1);
        String t = s.issue(user());
        String[] p = t.split("\\.");
        String forged = p[0] + "." + p[1].substring(0, p[1].length() - 2) + "AA." + p[2];
        assertTrue(s.verify(forged).isEmpty());
        assertTrue(s.verify(t + "x").isEmpty());
        assertTrue(s.verify("garbage").isEmpty());
    }

    @Test
    void rejectsTokenSignedWithOtherKeyAndExpired() {
        String t = service("0123456789012345678901234567890123456789", 1).issue(user());
        assertTrue(service("another-secret-another-secret-another-secret", 1).verify(t).isEmpty());
        JwtService expired = service("0123456789012345678901234567890123456789", -1);
        assertTrue(expired.verify(expired.issue(user())).isEmpty());
    }
}
