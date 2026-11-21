package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.AuthResponse;
import vn.vku.judge.backend.dto.LoginRequest;
import vn.vku.judge.backend.dto.RegisterRequest;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Public
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        AuthResponse resp = authService.register(req);
        if (resp.isSuccess()) {
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.badRequest().body(resp);
    }

    @Public
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        AuthResponse resp = authService.login(req);
        if (resp.isSuccess()) {
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.status(401).body(resp);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id, HttpServletRequest req) {
        var viewer = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        if (!viewer.isTeacher() && !viewer.id().equals(id)) {
            throw ApiException.forbidden("Bạn chỉ được xem thông tin của chính mình.");
        }
        return authService.getUserById(id)
                .map(u -> {
                    u.setPasswordHash(null); // Không trả về mật khẩu
                    return ResponseEntity.ok(u);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
