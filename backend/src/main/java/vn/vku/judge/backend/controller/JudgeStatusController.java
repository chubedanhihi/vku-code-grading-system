package vn.vku.judge.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.vku.judge.backend.judge.JudgeProperties;
import vn.vku.judge.backend.judge.SandboxSelector;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.queue.SubmissionQueueWorker;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.security.Public;

import java.util.LinkedHashMap;
import java.util.Map;

/** Trạng thái hệ thống chấm (sandbox, broker, hàng đợi) cho UI hiển thị. */
@Public
@RestController
@RequestMapping("/api/judge")
public class JudgeStatusController {
    private final SandboxSelector selector;
    private final JudgeProperties props;
    private final SubmissionQueueWorker worker;
    private final SubmissionRepository repo;
    private final String broker;

    public JudgeStatusController(SandboxSelector selector, JudgeProperties props,
                                 @Autowired(required = false) SubmissionQueueWorker worker,
                                 SubmissionRepository repo,
                                 @Value("${judge.broker:db}") String broker) {
        this.selector = selector;
        this.props = props;
        this.worker = worker;
        this.repo = repo;
        this.broker = broker;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sandbox", selector.current().name());
        m.put("broker", broker);
        m.put("ready", selector.current().isReady());
        m.put("workers", props.getWorkers());
        m.put("running", worker != null ? worker.activeCount() : repo.countByStatus(Verdict.RUNNING));
        m.put("pending", repo.countByStatus(Verdict.PENDING));
        return m;
    }
}
