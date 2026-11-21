package vn.vku.judge.backend.dto;

import lombok.Data;

@Data
public class RunCustomRequest {
    private Long problemId;
    private String language;
    private String sourceCode;
    private String input;
}
