package vn.vku.judge.backend.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.dto.AuthResponse;
import vn.vku.judge.backend.dto.LoginRequest;
import vn.vku.judge.backend.dto.RegisterRequest;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.repository.UserRepository;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AuthResponse register(RegisterRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            return AuthResponse.builder().success(false).message("Tên đăng nhập không được để trống!").build();
        }
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            return AuthResponse.builder().success(false).message("Email không được để trống!").build();
        }
        if (req.getPassword() == null || req.getPassword().length() < 6) {
            return AuthResponse.builder().success(false).message("Mật khẩu phải có ít nhất 6 ký tự!").build();
        }

        String username = req.getUsername().trim();
        String email = req.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            return AuthResponse.builder().success(false).message("Tên đăng nhập đã tồn tại!").build();
        }
        if (userRepository.existsByEmail(email)) {
            return AuthResponse.builder().success(false).message("Email đã được sử dụng!").build();
        }

        String role = "STUDENT";
        if (req.getRole() != null && req.getRole().equalsIgnoreCase("TEACHER")) {
            role = "TEACHER";
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole(role);

        User saved = userRepository.save(user);

        return AuthResponse.builder()
                .success(true)
                .message("Đăng ký tài khoản thành công!")
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .role(saved.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty() ||
            req.getPassword() == null || req.getPassword().isEmpty()) {
            return AuthResponse.builder().success(false).message("Vui lòng nhập tên đăng nhập và mật khẩu!").build();
        }

        String usernameOrEmail = req.getUsername().trim();

        // Allow login by either username or email
        Optional<User> userOpt = userRepository.findByUsername(usernameOrEmail);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(usernameOrEmail.toLowerCase());
        }

        if (userOpt.isEmpty()) {
            return AuthResponse.builder().success(false).message("Tài khoản không tồn tại!").build();
        }

        User user = userOpt.get();

        // Check password (BCrypt or legacy fallback with auto-upgrade)
        boolean matches;
        String storedHash = user.getPasswordHash();
        if (storedHash != null && (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$"))) {
            matches = passwordEncoder.matches(req.getPassword(), storedHash);
        } else {
            matches = req.getPassword().equals(storedHash);
            if (matches) {
                // Auto upgrade to BCrypt
                user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
                userRepository.save(user);
            }
        }

        if (!matches) {
            return AuthResponse.builder().success(false).message("Mật khẩu không chính xác!").build();
        }

        return AuthResponse.builder()
                .success(true)
                .message("Đăng nhập thành công!")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }
}
