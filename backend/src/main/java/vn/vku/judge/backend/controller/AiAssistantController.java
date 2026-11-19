package vn.vku.judge.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vku.judge.backend.dto.AiAnalyzeRequest;
import vn.vku.judge.backend.dto.AiAnalyzeResponse;
import vn.vku.judge.backend.service.AiAssistantService;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    public AiAssistantController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<AiAnalyzeResponse> analyzeCode(@RequestBody AiAnalyzeRequest request) {
        AiAnalyzeResponse response = aiAssistantService.analyzeCode(request);
        return ResponseEntity.ok(response);
    }
}
