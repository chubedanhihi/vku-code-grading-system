package vn.vku.judge.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import vn.vku.judge.backend.dto.AiAnalyzeRequest;
import vn.vku.judge.backend.dto.AiAnalyzeResponse;

import java.util.*;

@Service
public class AiAssistantService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiAnalyzeResponse analyzeCode(AiAnalyzeRequest request) {
        // Nếu có Gemini API Key, thử gọi Google Gemini API trước
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            try {
                return callGeminiApi(request);
            } catch (Exception e) {
                System.err.println("Gemini API call failed, falling back to Smart Rule Analyzer: " + e.getMessage());
            }
        }

        // Chế độ dự phòng thông minh (Rule-Based Smart Heuristic Analyzer)
        return generateHeuristicAnalysis(request);
    }

    /**
     * Gọi Google Gemini API để phân tích code sư phạm
     */
    private AiAnalyzeResponse callGeminiApi(AiAnalyzeRequest req) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        String prompt = buildPedagogicalPrompt(req);

        Map<String, Object> part = Collections.singletonMap("text", prompt);
        Map<String, Object> content = Collections.singletonMap("parts", Collections.singletonList(part));
        Map<String, Object> requestBody = Collections.singletonMap("contents", Collections.singletonList(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
            if (!textNode.isMissingNode()) {
                String aiText = textNode.asText();
                return parseAiMarkdownToResponse(aiText, req);
            }
        }

        throw new RuntimeException("Phản hồi từ Gemini API không hợp lệ.");
    }

    private String buildPedagogicalPrompt(AiAnalyzeRequest req) {
        return "Bạn là Trợ lý Giảng dạy Lập trình AI thông minh và thân thiện của Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU).\n\n"
                + "Thông tin bài nộp của sinh viên:\n"
                + "- Đề bài: " + req.getProblemTitle() + "\n"
                + "- Yêu cầu: " + req.getProblemDescription() + "\n"
                + "- Ngôn ngữ lập trình: " + req.getLanguage() + "\n"
                + "- Giới hạn: Time Limit = " + req.getTimeLimit() + "ms, Memory Limit = " + req.getMemoryLimit() + "MB\n"
                + "- Phán quyết từ máy chấm: " + req.getVerdict() + "\n"
                + (req.getErrorMessage() != null && !req.getErrorMessage().isEmpty() ? "- Thông báo lỗi: " + req.getErrorMessage() + "\n" : "")
                + (req.getUserQuestion() != null && !req.getUserQuestion().isEmpty() ? "- Câu hỏi của sinh viên: " + req.getUserQuestion() + "\n" : "")
                + "\nMã nguồn của sinh viên:\n```\n" + req.getSourceCode() + "\n```\n\n"
                + "Hãy phân tích theo phương pháp gợi mở sư phạm (Socratic teaching):\n"
                + "1. Chẩn đoán nguyên nhân lỗi (giải thích ngắn gọn, dễ hiểu).\n"
                + "2. Đưa ra 2-3 gợi ý (hints) và test case góc (edge cases) để sinh viên tự tìm ra cách sửa, KHÔNG đưa toàn bộ code giải hoàn chỉnh để sinh viên tự tư duy.\n"
                + "3. Đánh giá độ phức tạp thuật toán (Time Complexity O(...) và Space Complexity O(...)).\n"
                + "4. Lời khuyên tối ưu mã nguồn theo phong cách code chuẩn.\n"
                + "Hãy trả lời bằng tiếng Việt, định dạng Markdown rõ ràng, dùng emoji sinh động.";
    }

    private AiAnalyzeResponse parseAiMarkdownToResponse(String aiText, AiAnalyzeRequest req) {
        List<String> hints = new ArrayList<>();
        hints.add("Đọc kỹ gợi ý và kiểm tra các trường hợp biên (edge cases).");
        hints.add("Thử chạy tay (dry run) với bộ test case nhỏ để quan sát giá trị biến.");

        return AiAnalyzeResponse.builder()
                .success(true)
                .modelName("Google Gemini 1.5 Flash")
                .diagnosis("Phân tích tự động từ AI Assistant cho phán quyết " + req.getVerdict())
                .hints(hints)
                .timeComplexity("Xem chi tiết trong phần phân tích")
                .spaceComplexity("Xem chi tiết trong phần phân tích")
                .optimizationTips("Tối ưu theo đề xuất của AI Assistant")
                .detailedAnalysis(aiText)
                .build();
    }

    /**
     * Bộ phân tích thông minh dựa trên luật và mẫu code (Rule-Based Smart Heuristic AI)
     * Hoạt động bền bỉ 100% offline không cần API key.
     */
    private AiAnalyzeResponse generateHeuristicAnalysis(AiAnalyzeRequest req) {
        String verdict = req.getVerdict() != null ? req.getVerdict() : "PENDING";
        String code = req.getSourceCode() != null ? req.getSourceCode() : "";
        String lang = req.getLanguage() != null ? req.getLanguage().toUpperCase() : "CPP";

        String diagnosis;
        List<String> hints = new ArrayList<>();
        String timeComplexity = "O(N)";
        String spaceComplexity = "O(1)";
        String tips;
        StringBuilder detailed = new StringBuilder();

        detailed.append("### 🤖 Trợ lý AI VKU: Phân tích kết quả chấm bài\n\n");

        switch (verdict) {
            case "ACCEPTED":
                diagnosis = "Tuyệt vời! Thuật toán của bạn đã vượt qua 100% bộ dữ liệu test case.";
                hints.add("Mã nguồn hoạt động chính xác và đạt yêu cầu giới hạn thời gian/bộ nhớ.");
                hints.add("Bạn có thể thử sức với các phương pháp tối ưu hơn hoặc giải bài tập ở mức độ khó cao hơn.");
                timeComplexity = detectComplexity(code);
                tips = lang.equals("CPP")
                        ? "Dùng `std::ios_base::sync_with_stdio(false); std::cin.tie(NULL);` để tăng tốc độ I/O."
                        : "Cấu trúc mã nguồn đã rất tối ưu và dễ đọc.";
                detailed.append("🎉 **Chúc mừng bạn!** Thuật toán giải quyết đề bài chuẩn xác.\n\n")
                        .append("- **Độ phức tạp thời gian ước lượng:** ").append(timeComplexity).append("\n")
                        .append("- **Độ phức tạp không gian:** ").append(spaceComplexity).append("\n\n")
                        .append("💡 **Gợi ý mở rộng:** ").append(tips);
                break;

            case "WRONG_ANSWER":
                if (req.getProblemTitle() != null && req.getProblemTitle().toLowerCase().contains("a + b") || req.getProblemTitle().toLowerCase().contains("tổng")) {
                    if (code.contains("int a") && !code.contains("long long") && lang.equals("CPP")) {
                        diagnosis = "Nghi vấn tràn số nguyên (Integer Overflow)! Với giới hạn -10^9 ≤ A, B ≤ 10^9, tổng A + B có thể lên tới 2.10^9 vượt ngưỡng an toàn của kiểu int.";
                        hints.add("Đổi kiểu dữ liệu của biến A, B và kết quả sang `long long` trong C++ hoặc `long` trong Java.");
                        hints.add("Kiểm tra trường hợp số âm: ví dụ A = -1, B = 1 thì tổng phải ra 0.");
                    } else {
                        diagnosis = "Kết quả xuất ra màn hình không khớp với đáp án chuẩn của bài toán.";
                        hints.add("Kiểm tra định dạng in ra: có thừa khoảng trắng hay thiếu dấu xuống dòng '\\n' không?");
                        hints.add("Thử nghiệm với các test case đặc biệt: số 0, số âm, số lớn nhất cho phép.");
                    }
                } else if (req.getProblemTitle() != null && req.getProblemTitle().toLowerCase().contains("hello world")) {
                    diagnosis = "Chuỗi xuất ra màn hình chưa chính xác hoàn toàn với yêu cầu.";
                    hints.add("Đề bài yêu cầu in chính xác `Hello, World!` (chú ý chữ hoa 'H', 'W', dấu phẩy và dấu chấm than '!').");
                    hints.add("Không in thêm các từ như 'Nhap vao' hay 'Ket qua la'.");
                } else {
                    diagnosis = "Mã nguồn tính toán sai ở một số test case ẩn hoặc chưa xử lý hết trường hợp biên.";
                    hints.add("Rà soát lại công thức toán học và điều kiện dừng của vòng lặp.");
                    hints.add("Kiểm tra các trường hợp cận dưới (N = 1, N = 0) và cận trên của đề bài.");
                }
                timeComplexity = detectComplexity(code);
                tips = "Nên viết hàm kiểm tra riêng cho từng test case nhỏ trước khi nộp bài.";
                detailed.append("❌ **Chẩn đoán:** ").append(diagnosis).append("\n\n")
                        .append("💡 **Gợi ý sửa lỗi (Hints):**\n");
                for (String h : hints) {
                    detailed.append("- ").append(h).append("\n");
                }
                detailed.append("\n⏱️ **Ước tính độ phức tạp:** ").append(timeComplexity);
                break;

            case "TIME_LIMIT_EXCEEDED":
                if (code.contains("fib(") || code.contains("f(n-1)")) {
                    diagnosis = "Thuật toán đệ quy thuần túy có độ phức tạp hàm mũ O(2^N) quá lớn dẫn đến vượt quá giới hạn thời gian (Time Limit Exceeded)!";
                    hints.add("Chuyển từ đệ quy sang Quy hoạch động (Dynamic Programming) hoặc dùng mảng lưu kết quả f[N] để giảm thời gian xuống O(N).");
                    hints.add("Với N ≤ 40, chỉ cần vòng lặp for đơn giản duyệt từ 3 đến N để tính F[i] = F[i-1] + F[i-2].");
                    timeComplexity = "O(2^N) ❌ Quá chậm";
                } else {
                    diagnosis = "Vòng lặp chưa có điều kiện dừng hợp lý hoặc độ phức tạp thuật toán quá lớn so với giới hạn " + req.getTimeLimit() + "ms.";
                    hints.add("Kiểm tra xem có vòng lặp vô hạn (infinite loop) nào đang xảy ra không.");
                    hints.add("Giảm bớt các vòng for lồng nhau: thay O(N^2) bằng O(N log N) hoặc O(N).");
                    timeComplexity = "O(N^2) hoặc Vòng lặp vô tận";
                }
                tips = "Luôn ước lượng số phép tính: 1 giây trong máy tính chạy được khoảng 10^8 phép tính cơ bản.";
                detailed.append("⏱️ **Chẩn đoán:** ").append(diagnosis).append("\n\n")
                        .append("💡 **Gợi ý tối ưu thuật toán:**\n");
                for (String h : hints) {
                    detailed.append("- ").append(h).append("\n");
                }
                break;

            case "COMPILE_ERROR":
                diagnosis = "Mã nguồn không thể biên dịch thành công. Trình biên dịch báo lỗi cú pháp.";
                hints.add("Đọc kỹ thông báo lỗi của trình biên dịch: " + (req.getErrorMessage() != null ? req.getErrorMessage() : "Kiểm tra dấu chấm phẩy ';' hoặc tên thư viện"));
                hints.add("Kiểm tra tên lớp trong Java phải là `public class Main`.");
                hints.add("Kiểm tra thư viện đã import đủ chưa: `#include <iostream>` (C++), `import java.util.Scanner;` (Java).");
                tips = "Hãy biên dịch thử trên máy tính cá nhân trước khi nộp code lên hệ thống.";
                detailed.append("🔧 **Chẩn đoán lỗi biên dịch:** ").append(diagnosis).append("\n\n")
                        .append("📜 **Chi tiết từ Compiler:**\n```\n")
                        .append(req.getErrorMessage() != null ? req.getErrorMessage() : "Lỗi cú pháp chưa xác định.")
                        .append("\n```\n\n")
                        .append("💡 **Hướng dẫn khắc phục:**\n");
                for (String h : hints) {
                    detailed.append("- ").append(h).append("\n");
                }
                break;

            default: // RUNTIME_ERROR
                diagnosis = "Chương trình dừng đột ngột trong quá trình chạy (Crash / Runtime Exception).";
                hints.add("Lỗi chia cho số 0 (Division by Zero).");
                hints.add("Truy cập phần tử mảng ngoài phạm vi khai báo (Array Index Out Of Bounds).");
                hints.add("Tràn ngăn xếp do đệ quy quá sâu không có điểm dừng (Stack Overflow).");
                tips = "Kiểm tra kỹ kích thước mảng đã khai báo đủ lớn chứa N chưa (ví dụ: f[100] thay vì f[40]).";
                detailed.append("💥 **Chẩn đoán:** ").append(diagnosis).append("\n\n")
                        .append("💡 **Các lỗi runtime phổ biến cần kiểm tra:**\n");
                for (String h : hints) {
                    detailed.append("- ").append(h).append("\n");
                }
                break;
        }

        return AiAnalyzeResponse.builder()
                .success(true)
                .modelName("VKU Smart Code Analyzer (AI Assistant)")
                .diagnosis(diagnosis)
                .hints(hints)
                .timeComplexity(timeComplexity)
                .spaceComplexity(spaceComplexity)
                .optimizationTips(tips)
                .detailedAnalysis(detailed.toString())
                .build();
    }

    private String detectComplexity(String code) {
        if (code.contains("fib(") && code.contains("+") && code.contains("fib(")) {
            return "O(2^N) - Hàm mũ";
        }
        int forCount = countMatches(code, "for (") + countMatches(code, "for(");
        int whileCount = countMatches(code, "while (") + countMatches(code, "while(");
        int loops = forCount + whileCount;
        if (loops >= 2) return "O(N^2) - Bậc hai";
        if (loops == 1) return "O(N) - Tuyến tính";
        return "O(1) - Hằng số";
    }

    private int countMatches(String text, String sub) {
        if (text == null || sub == null || sub.isEmpty()) return 0;
        int count = 0, idx = 0;
        while ((idx = text.indexOf(sub, idx)) != -1) {
            count++;
            idx += sub.length();
        }
        return count;
    }
}
