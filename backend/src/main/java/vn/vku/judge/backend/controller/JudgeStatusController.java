package vn.vku.judge.backend.controller;

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

/** Trạng thái hệ thống chấm (sandbox, hàng đợi) cho UI hiển thị. */
@Public
@RestController
@RequestMapping("/api/judge")
public class JudgeStatusController {
    private final SandboxSelector selector;
    private final JudgeProperties props;
    private final SubmissionQueueWorker worker;
    private final SubmissionRepository repo;

    public JudgeStatusController(SandboxSelector selector, JudgeProperties props,
                                 SubmissionQueueWorker worker, SubmissionRepository repo) {
        this.selector = selector;
        this.props = props;
        this.worker = worker;
        this.repo = repo;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sandbox", selector.current().name());
        m.put("ready", selector.current().isReady());
        m.put("workers", props.getWorkers());
        m.put("running", worker.activeCount());
        m.put("pending", repo.countByStatus(Verdict.PENDING));
        return m;
    }
}
