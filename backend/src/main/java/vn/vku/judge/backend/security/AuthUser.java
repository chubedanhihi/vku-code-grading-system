package vn.vku.judge.backend.security;

public record AuthUser(Long id, String username, String role) {
    public boolean isTeacher() {
        return "TEACHER".equals(role) || "ADMIN".equals(role);
    }
}
