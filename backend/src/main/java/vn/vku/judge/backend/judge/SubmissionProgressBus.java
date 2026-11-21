package vn.vku.judge.backend.judge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/** Kênh phát tiến trình chấm bài theo thời gian thực qua SSE (Server-Sent Events). */
@Slf4j
@Component
public class SubmissionProgressBus {
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(long submissionId) {
        SseEmitter emitter = new SseEmitter(120_000L);
        emitters.computeIfAbsent(submissionId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable cleanup = () -> remove(submissionId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());
        return emitter;
    }

    public void emit(long submissionId, String event, Object data) {
        List<SseEmitter> list = emitters.get(submissionId);
        if (list == null || list.isEmpty()) return;
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(event).data(data));
            } catch (IOException e) {
                remove(submissionId, emitter);
            }
        }
    }

    public void complete(long submissionId, Object finalView) {
        emit(submissionId, "complete", finalView);
        List<SseEmitter> list = emitters.remove(submissionId);
        if (list == null) return;
        for (SseEmitter emitter : list) {
            try {
                emitter.complete();
            } catch (Exception ignored) {
                // client đã ngắt kết nối
            }
        }
    }

    private void remove(long submissionId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(submissionId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) emitters.remove(submissionId);
        }
    }
}
