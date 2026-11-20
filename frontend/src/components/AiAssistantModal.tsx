import { useState } from "react";
import type { AiAnalyzeResponse, Problem, Submission } from "../types";
import { FormattedMarkdown } from "./FormattedMarkdown";
import { IconSparkles, IconX } from "./Icons";

interface AiAssistantModalProps {
  open: boolean;
  loading: boolean;
  data: AiAnalyzeResponse | null;
  problem: Problem | null;
  targetSub: Submission | null;
  lang: string;
  onClose: () => void;
  onAskQuestion: (question: string) => void;
}

export function AiAssistantModal({
  open,
  loading,
  data,
  problem,
  targetSub,
  lang,
  onClose,
  onAskQuestion,
}: AiAssistantModalProps) {
  const [question, setQuestion] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    onAskQuestion(question.trim());
    setQuestion("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconSparkles size={17} style={{ color: "var(--accent-purple)" }} />
              <span>Trợ lý AI — VKU Assistant</span>
            </h3>
            <div className="modal-subtitle">
              {problem?.title} · {targetSub?.language || lang}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {data?.modelName && <span className="tag-pill">{data.modelName}</span>}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
              <IconX size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Đang phân tích mã nguồn và độ phức tạp...</p>
            </div>
          ) : data ? (
            <div className="detail-stack">
              <div
                className={`ai-diagnosis ${
                  targetSub?.status === "ACCEPTED" ? "is-accepted" : ""
                }`}
              >
                <div className="detail-section-title">Chẩn đoán</div>
                <p>{data.diagnosis}</p>
              </div>

              <div className="ai-metrics">
                <div className="ai-metric">
                  <span className="detail-stat-label">Time Complexity</span>
                  <span className="mono">{data.timeComplexity}</span>
                </div>
                <div className="ai-metric">
                  <span className="detail-stat-label">Space Complexity</span>
                  <span className="mono">{data.spaceComplexity}</span>
                </div>
                <div className="ai-metric">
                  <span className="detail-stat-label">Tối ưu</span>
                  <span>{data.optimizationTips}</span>
                </div>
              </div>

              {data.hints && data.hints.length > 0 && (
                <div className="ai-hints">
                  <div className="detail-section-title">Gợi ý</div>
                  {data.hints.map((h, i) => (
                    <div key={i} className="ai-hint-row">
                      <span className="mono">#{i + 1}</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="ai-analysis-body">
                <FormattedMarkdown content={data.detailedAnalysis} />
              </div>

              <form onSubmit={handleSubmit} className="ai-ask-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Đặt câu hỏi thêm về thuật toán hoặc test case..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button type="submit" className="btn btn-ai" disabled={!question.trim()}>
                  Gửi
                </button>
              </form>
            </div>
          ) : (
            <div className="empty-state">
              <p>Chưa có dữ liệu phân tích từ AI.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
