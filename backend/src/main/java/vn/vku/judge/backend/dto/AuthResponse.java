package vn.vku.judge.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private boolean success;
    private String message;
    private Long id;
    private String username;
    private String email;
    private String role;
    /** JWT, gửi kèm header Authorization: Bearer <token> ở các request sau. */
    private String token;
}
