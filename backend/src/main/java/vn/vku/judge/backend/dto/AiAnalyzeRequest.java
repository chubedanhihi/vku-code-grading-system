package vn.vku.judge.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalyzeRequest {
    private String problemTitle;
    private String problemDescription;
    private String language;
    private String sourceCode;
    private String verdict;        // ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, COMPILE_ERROR, RUNTIME_ERROR
    private String errorMessage;
    private Integer timeLimit;
    private Integer memoryLimit;
    private String userQuestion;   // Câu hỏi thắc mắc riêng của sinh viên (nếu có)
}
