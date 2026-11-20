package vn.vku.judge.backend.dto;

import lombok.Data;

@Data
public class SubmitRequest {
    private Long problemId;
    private String language;
    private String sourceCode;
}
