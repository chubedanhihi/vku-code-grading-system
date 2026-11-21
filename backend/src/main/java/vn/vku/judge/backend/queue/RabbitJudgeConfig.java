package vn.vku.judge.backend.queue;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.service.JudgeService;

import java.time.LocalDateTime;

/**
 * Broker phân tán dùng RabbitMQ khi đặt judge.broker=rabbitmq.
 * Cho phép chạy nhiều instance Worker độc lập scale theo chiều ngang.
 */
@Configuration
@ConditionalOnProperty(name = "judge.broker", havingValue = "rabbitmq")
public class RabbitJudgeConfig {
    public static final String QUEUE_NAME = "vku.judge.queue";

    @Bean
    public Queue judgeQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Component
    @ConditionalOnProperty(name = "judge.broker", havingValue = "rabbitmq")
    public static class RabbitJudgeBroker {
        private final RabbitTemplate rabbitTemplate;
        private final SubmissionRepository repo;
        private final JudgeService judgeService;

        public RabbitJudgeBroker(RabbitTemplate rabbitTemplate, SubmissionRepository repo, JudgeService judgeService) {
            this.rabbitTemplate = rabbitTemplate;
            this.repo = repo;
            this.judgeService = judgeService;
        }

        public void enqueue(long submissionId) {
            rabbitTemplate.convertAndSend(QUEUE_NAME, String.valueOf(submissionId));
        }

        @RabbitListener(queues = QUEUE_NAME, concurrency = "${judge.workers:2}")
        public void onMessage(String payload) {
            long id = Long.parseLong(payload.trim());
            if (repo.claim(id, LocalDateTime.now()) == 1) {
                judgeService.process(id);
            }
        }
    }
}
