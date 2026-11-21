package vn.vku.judge.backend.security;

import java.lang.annotation.*;

/** Endpoint công khai (không bắt buộc đăng nhập). Mặc định mọi endpoint /api/** đều yêu cầu JWT. */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Public {
}
