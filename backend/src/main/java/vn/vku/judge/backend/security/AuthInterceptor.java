package vn.vku.judge.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

/** Mặc định từ chối (deny-by-default): endpoint không gắn @Public thì bắt buộc JWT hợp lệ. */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String ATTR = "authUser";
    private final JwtService jwt;
    private final ObjectMapper mapper = new ObjectMapper();

    public AuthInterceptor(JwtService jwt) {
        this.jwt = jwt;
    }

    public static Optional<AuthUser> current(HttpServletRequest req) {
        return Optional.ofNullable((AuthUser) req.getAttribute(ATTR));
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(req.getMethod()) || !(handler instanceof HandlerMethod hm)) return true;

        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwt.verify(header.substring(7).trim()).ifPresent(u -> req.setAttribute(ATTR, u));
        }
        AuthUser user = (AuthUser) req.getAttribute(ATTR);

        boolean isPublic = hm.hasMethodAnnotation(Public.class)
                || hm.getBeanType().isAnnotationPresent(Public.class);
        RequireRole role = hm.getMethodAnnotation(RequireRole.class);
        if (role == null) role = hm.getBeanType().getAnnotation(RequireRole.class);

        if (user == null && (!isPublic || role != null)) {
            return deny(res, 401, "Bạn cần đăng nhập để thực hiện thao tác này.");
        }
        if (role != null && Arrays.stream(role.value()).noneMatch(r -> r.equals(user.role()))) {
            return deny(res, 403, "Bạn không có quyền thực hiện thao tác này.");
        }
        return true;
    }

    private boolean deny(HttpServletResponse res, int status, String msg) throws Exception {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.getWriter().write(mapper.writeValueAsString(Map.of("success", false, "status", status, "message", msg)));
        return false;
    }
}
