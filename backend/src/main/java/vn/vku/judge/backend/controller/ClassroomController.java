package vn.vku.judge.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.exception.ApiException;
import vn.vku.judge.backend.security.AuthInterceptor;
import vn.vku.judge.backend.security.AuthUser;
import vn.vku.judge.backend.security.RequireRole;
import vn.vku.judge.backend.service.ClassroomService;
import vn.vku.judge.backend.service.ClassroomService.AssignmentView;
import vn.vku.judge.backend.service.ClassroomService.ClassroomView;
import vn.vku.judge.backend.service.ClassroomService.GradebookRow;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {
    private final ClassroomService service;

    public ClassroomController(ClassroomService service) {
        this.service = service;
    }

    private static AuthUser me(HttpServletRequest req) {
        return AuthInterceptor.current(req).orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập."));
    }

    @Data
    public static class CreateClassRequest {
        private String name;
        private String description;
    }

    @Data
    public static class JoinClassRequest {
        private String joinCode;
    }

    @Data
    public static class AddAssignmentRequest {
        private Long problemId;
        private String weekLabel;
        private LocalDateTime dueAt;
        private Boolean allowLate;
    }

    @GetMapping
    public List<ClassroomView> list(HttpServletRequest req) {
        return service.listForUser(me(req));
    }

    @GetMapping("/{id}")
    public ClassroomView detail(@PathVariable Long id, HttpServletRequest req) {
        return service.detail(id, me(req));
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping
    public ClassroomView create(@RequestBody CreateClassRequest body, HttpServletRequest req) {
        return service.create(body.getName(), body.getDescription(), me(req));
    }

    @PostMapping("/join")
    public ClassroomView join(@RequestBody JoinClassRequest body, HttpServletRequest req) {
        return service.joinByCode(body.getJoinCode(), me(req));
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @PostMapping("/{id}/assignments")
    public AssignmentView addAssignment(@PathVariable Long id, @RequestBody AddAssignmentRequest body) {
        return service.addAssignment(id, body.getProblemId(), body.getWeekLabel(), body.getDueAt(), body.getAllowLate());
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> removeAssignment(@PathVariable Long assignmentId) {
        service.removeAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteClassroom(id);
        return ResponseEntity.noContent().build();
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @GetMapping("/{id}/gradebook")
    public List<GradebookRow> gradebook(@PathVariable Long id) {
        return service.gradebook(id);
    }

    @RequireRole({"TEACHER", "ADMIN"})
    @GetMapping("/{id}/export-csv")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long id) {
        String csv = service.exportCsv(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"classroom-" + id + "-grades.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
