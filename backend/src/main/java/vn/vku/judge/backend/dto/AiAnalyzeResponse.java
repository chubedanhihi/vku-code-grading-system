package vn.vku.judge.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalyzeResponse {
    private boolean success;
    private String modelName;          // Ví dụ: "Gemini 1.5 Flash" hoặc "VKU Smart Code Analyzer"
    private String diagnosis;          // Chẩn đoán lỗi chính
    private List<String> hints;        // Các gợi ý sửa lỗi (mang tính sư phạm)
    private String timeComplexity;     // Đánh giá O(N), O(log N)...
    private String spaceComplexity;    // Đánh giá bộ nhớ
    private String optimizationTips;   // Lời khuyên tối ưu code
    private String detailedAnalysis;   // Nội dung markdown chi tiết
}
