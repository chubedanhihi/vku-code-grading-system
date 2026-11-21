package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.List;

/** Khi khởi động: nếu dùng Docker sandbox mà chưa có image thì tự build ở nền (không chặn ứng dụng). */
@Slf4j
@Component
public class SandboxBootstrap {
    private final JudgeProperties props;
    private final DockerSandboxRunner docker;

    public SandboxBootstrap(JudgeProperties props, DockerSandboxRunner docker) {
        this.props = props;
        this.docker = docker;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if ("local".equalsIgnoreCase(props.getSandbox())) return;
        Thread t = new Thread(this::ensureImage, "sandbox-bootstrap");
        t.setDaemon(true);
        t.start();
    }

    private void ensureImage() {
        if (!docker.dockerAvailable()) {
            log.error("Không kết nối được Docker daemon: hệ thống chấm sẽ KHÔNG nhận job cho tới khi Docker chạy. "
                    + "(Dev: đặt judge.sandbox=local để chạy không cách ly.)");
            return;
        }
        if (docker.imageExists()) {
            log.info("Sandbox image '{}' đã sẵn sàng.", props.getImage());
            return;
        }
        File dir = new File(props.getBuildDir());
        if (!props.isAutoBuildImage() || !new File(dir, "Dockerfile").exists()) {
            log.error("Chưa có sandbox image '{}'. Hãy chạy: docker build -t {} sandbox/", props.getImage(), props.getImage());
            return;
        }
        log.info("Đang build sandbox image '{}' từ {} (lần đầu có thể mất vài phút)...", props.getImage(), dir.getAbsolutePath());
        try {
            Process p = new ProcessBuilder(List.of(props.getDockerBinary(), "build", "-t", props.getImage(),
                    dir.getAbsolutePath())).redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            int code = p.waitFor();
            docker.invalidateCache();
            if (code == 0) log.info("Build sandbox image thành công.");
            else log.error("Build sandbox image thất bại (exit {}). Hãy build thủ công: docker build -t {} sandbox/", code, props.getImage());
        } catch (Exception e) {
            log.error("Không build được sandbox image", e);
        }
    }
}
