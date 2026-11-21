package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.security.Public;
import vn.vku.judge.backend.security.RequireRole;
import vn.vku.judge.backend.service.ContestService;
import vn.vku.judge.backend.service.ContestService.ContestView;
import vn.vku.judge.backend.service.ContestService.StandingRow;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contests")
public class ContestController {
    private final ContestService contestService;

    public ContestController(ContestService contestService) {
        this.contestService = contestService;
    }

    @Data
    public static class CreateContestRequest {
        private String title;
        private String description;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private List<Long> problemIds;
    }

    @Public
    @GetMapping
    public List<ContestView> list(HttpServletRequest req) {
        return contestService.list(AuthInterceptor.current(req).orElse(null));
    }

    @Public
    @GetMapping("/{id}")
    public ContestView detail(@PathVariable Long id, HttpServletRequest req) {
        return contestService.detail(id, AuthInterceptor.current(req).orElse(null));
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public ContestView create(@RequestBody CreateContestRequest body, HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        return contestService.create(body.getTitle(), body.getDescription(), body.getStartTime(),
                body.getEndTime(), body.getProblemIds(), u);
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contestService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/register")
    public Map<String, Object> register(@PathVariable Long id, HttpServletRequest req) {
        AuthUser u = AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
        contestService.register(id, u);
        return Map.of("success", true, "message", "Đăng ký tham gia kỳ thi thành công.");
    }

    @Public
    @GetMapping("/{id}/standings")
    public List<StandingRow> standings(@PathVariable Long id) {
        return contestService.standings(id);
    }
}
