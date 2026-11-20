package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Chọn runner theo cấu hình judge.sandbox (docker | local). */
@Slf4j
@Component
public class SandboxSelector {
    private final JudgeProperties props;
    private final DockerSandboxRunner docker;
    private final LocalSandboxRunner local;

    public SandboxSelector(JudgeProperties props, DockerSandboxRunner docker, LocalSandboxRunner local) {
        this.props = props;
        this.docker = docker;
        this.local = local;
        if ("local".equalsIgnoreCase(props.getSandbox())) {
            log.warn("=== judge.sandbox=local: code sinh viên chạy TRỰC TIẾP trên host, KHÔNG an toàn. Chỉ dùng cho dev! ===");
        }
    }

    public SandboxRunner current() {
        return "local".equalsIgnoreCase(props.getSandbox()) ? local : docker;
    }

    public DockerSandboxRunner docker() {
        return docker;
    }
}
