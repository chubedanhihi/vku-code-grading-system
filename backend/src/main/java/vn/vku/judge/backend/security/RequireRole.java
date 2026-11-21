package vn.vku.judge.backend.security;

import java.lang.annotation.*;

/** Yêu cầu người dùng có một trong các vai trò liệt kê (ngoài việc phải đăng nhập). */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    String[] value();
}
