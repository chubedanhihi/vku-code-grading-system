package vn.vku.judge.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RunCustomResponse {
    private String verdict;
    private int timeMs;
    private int memoryKb;
    private String stdout;
    private String stderr;
    private String compileError;
}
