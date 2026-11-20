package vn.vku.judge.backend.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.entity.User;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** JWT HS256 tự cài đặt bằng JDK (không cần thêm thư viện). */
@Slf4j
@Service
public class JwtService {
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final ObjectMapper mapper = new ObjectMapper();
    private final String configuredSecret;
    private final long expirationHours;
    private byte[] key;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiration-hours:24}") long expirationHours) {
        this.configuredSecret = secret;
        this.expirationHours = expirationHours;
    }

    @PostConstruct
    void init() {
        if (configuredSecret == null || configuredSecret.length() < 32) {
            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            key = random;
            log.warn("app.jwt.secret chưa đặt (hoặc < 32 ký tự): dùng khóa ngẫu nhiên, token sẽ mất hiệu lực khi restart. "
                    + "Production hãy đặt biến môi trường JWT_SECRET.");
        } else {
            key = configuredSecret.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String issue(User user) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            long now = Instant.now().getEpochSecond();
            payload.put("sub", String.valueOf(user.getId()));
            payload.put("username", user.getUsername());
            payload.put("role", user.getRole());
            payload.put("iat", now);
            payload.put("exp", now + expirationHours * 3600);
            String signingInput = ENC.encodeToString(mapper.writeValueAsBytes(header)) + "."
                    + ENC.encodeToString(mapper.writeValueAsBytes(payload));
            return signingInput + "." + ENC.encodeToString(hmac(signingInput));
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo JWT", e);
        }
    }

    public Optional<AuthUser> verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return Optional.empty();
            byte[] expected = hmac(parts[0] + "." + parts[1]);
            if (!MessageDigest.isEqual(expected, DEC.decode(parts[2]))) return Optional.empty();
            Map<String, Object> p = mapper.readValue(DEC.decode(parts[1]), new TypeReference<>() {});
            long exp = ((Number) p.get("exp")).longValue();
            if (Instant.now().getEpochSecond() >= exp) return Optional.empty();
            return Optional.of(new AuthUser(Long.parseLong((String) p.get("sub")),
                    (String) p.get("username"), (String) p.get("role")));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] hmac(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }
}
