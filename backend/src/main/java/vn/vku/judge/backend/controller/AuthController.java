package vn.vku.judge.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.AuthResponse;
import vn.vku.judge.backend.dto.LoginRequest;
import vn.vku.judge.backend.dto.RegisterRequest;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        AuthResponse resp = authService.register(req);
        if (resp.isSuccess()) {
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.badRequest().body(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        AuthResponse resp = authService.login(req);
        if (resp.isSuccess()) {
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.status(401).body(resp);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return authService.getUserById(id)
                .map(u -> {
                    u.setPasswordHash(null); // Không trả về mật khẩu
                    return ResponseEntity.ok(u);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
