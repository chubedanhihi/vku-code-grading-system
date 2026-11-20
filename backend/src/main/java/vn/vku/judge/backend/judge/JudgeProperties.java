package vn.vku.judge.backend.judge;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "judge")
public class JudgeProperties {
    /** docker (mặc định, an toàn) hoặc local (CHỈ để dev/test: không cách ly). */
    private String sandbox = "docker";
    private String dockerBinary = "docker";
    private String image = "vku-sandbox:latest";
    /** Thư mục chứa Dockerfile để tự build image khi chưa có. */
    private String buildDir = "../sandbox";
    private boolean autoBuildImage = true;
    /** Thư mục làm việc (phải nằm trong vùng Docker được phép mount, vd: dưới $HOME). */
    private String workDir = System.getProperty("user.home") + "/.vku-judge/work";
    private int workers = 2;
    private int maxOutputBytes = 4 * 1024 * 1024;
    private int compileTimeoutMs = 30_000;
    private int javaExtraMs = 500;
    private int pythonExtraMs = 150;
    /** Sau số lượng test lỗi nặng này, các test còn lại được đánh dấu SKIPPED. */
    private int stopAfterFatal = 3;
    private boolean recoverOnStartup = true;
    private int staleRunningSeconds = 300;
    private int maxPendingPerUser = 3;
    private int maxBacklog = 500;
    private int maxSourceBytes = 64 * 1024;
}
