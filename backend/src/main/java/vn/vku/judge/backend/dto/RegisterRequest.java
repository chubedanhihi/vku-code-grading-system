package vn.vku.judge.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    private String role; // STUDENT or TEACHER
    /** Bắt buộc khi đăng ký TEACHER (app.teacher-invite-code). */
    private String inviteCode;
}
