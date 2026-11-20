package vn.vku.judge.backend.queue;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.judge.JudgeProperties;
import vn.vku.judge.backend.judge.SandboxSelector;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.service.JudgeService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Hàng đợi bền vững dựa trên bảng submissions (PENDING -> RUNNING -> verdict).
 * - Restart không mất job: job RUNNING bị treo được đưa về PENDING.
 * - Nhận job bằng UPDATE có điều kiện nên chạy nhiều worker/instance vẫn không chấm trùng.
 * - Số job chạy đồng thời bị chặn bởi judge.workers; sandbox chưa sẵn sàng thì job vẫn nằm trong hàng đợi.
 */
@Slf4j
@Component
public class SubmissionQueueWorker {
    private final SubmissionRepository repo;
    private final JudgeService judgeService;
    private final JudgeProperties props;
    private final SandboxSelector selector;
    private final AtomicInteger active = new AtomicInteger();
    private ExecutorService executor;

    public SubmissionQueueWorker(SubmissionRepository repo, JudgeService judgeService,
                                 JudgeProperties props, SandboxSelector selector) {
        this.repo = repo;
        this.judgeService = judgeService;
        this.props = props;
        this.selector = selector;
    }

    @PostConstruct
    void start() {
        executor = Executors.newFixedThreadPool(Math.max(1, props.getWorkers()), r -> {
            Thread t = new Thread(r, "JudgeWorker");
            t.setDaemon(true);
            return t;
        });
        if (props.isRecoverOnStartup()) {
            int n = repo.requeueStale(LocalDateTime.now().plusYears(1)); // tất cả RUNNING còn sót -> PENDING
            if (n > 0) log.info("Đã đưa {} bài đang chấm dở về hàng đợi sau khi khởi động.", n);
        }
    }

    @PreDestroy
    void stop() {
        if (executor != null) executor.shutdownNow();
    }

    public int activeCount() {
        return active.get();
    }

    @Scheduled(fixedDelay = 1000, initialDelay = 2000)
    public synchronized void poll() {
        int free = props.getWorkers() - active.get();
        if (free <= 0 || !selector.current().isReady()) return;
        List<Long> ids = repo.findPendingIds(PageRequest.of(0, free));
        for (Long id : ids) {
            if (repo.claim(id, LocalDateTime.now()) == 1) {
                active.incrementAndGet();
                executor.submit(() -> {
                    try {
                        judgeService.process(id);
                    } finally {
                        active.decrementAndGet();
                    }
                });
            }
        }
    }

    /** Job RUNNING quá hạn (worker chết giữa chừng) quay lại hàng đợi. */
    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void requeueStale() {
        int n = repo.requeueStale(LocalDateTime.now().minusSeconds(props.getStaleRunningSeconds()));
        if (n > 0) log.warn("Đã đưa {} bài RUNNING quá hạn về hàng đợi.", n);
    }
}
