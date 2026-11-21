import { useState } from "react";
import type { Submission, SubmissionResult } from "../types";
import { getVerdictMeta } from "../constants/languages";
import { IconCheck, IconCopy, IconSparkles, IconX } from "./Icons";
import { VerdictBadge } from "./VerdictBadge";

interface SubmissionDetailModalProps {
  submission: Submission | null;
  loading: boolean;
  onClose: () => void;
  onAskAi: (sub: Submission) => void;
}

function OutputDiffViewer({ result }: { result: SubmissionResult }) {
  const expLines = (result.expectedOutput ?? "").split("\n");
  const actLines = (result.actualOutput ?? "").split("\n");
  const count = Math.max(expLines.length, actLines.length);

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span>Test #{result.testIndex} — So sánh Expected vs Actual</span>
      </div>
      <div className="diff-columns">
        <div className="diff-col">
          <div className="diff-col-title">Expected Output</div>
          <div className="diff-lines mono">
            {Array.from({ length: count }).map((_, idx) => {
              const e = expLines[idx] ?? "";
              const a = actLines[idx] ?? "";
              const diff = e !== a;
              return (
                <div key={idx} className={`diff-line ${diff ? "is-expected" : ""}`}>
                  <span className="diff-ln">{idx + 1}</span>
                  <span>{e || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="diff-col">
          <div className="diff-col-title">Actual Output</div>
          <div className="diff-lines mono">
            {Array.from({ length: count }).map((_, idx) => {
              const e = expLines[idx] ?? "";
              const a = actLines[idx] ?? "";
              const diff = e !== a;
              return (
                <div key={idx} className={`diff-line ${diff ? "is-actual" : ""}`}>
                  <span className="diff-ln">{idx + 1}</span>
                  <span>{a || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubmissionDetailModal({
  submission,
  loading,
  onClose,
  onAskAi,
}: SubmissionDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!submission && !loading) return null;

  const handleCopy = async () => {
    if (!submission?.sourceCode) return;
    try {
      await navigator.clipboard.writeText(submission.sourceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const diffCandidates =
    submission?.results?.filter(
      (r) => r.verdict === "WRONG_ANSWER" && r.expectedOutput != null && r.actualOutput != null
    ) ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">
              Chi tiết bài nộp {submission ? `#${submission.id}` : ""}
            </h3>
            {submission && (
              <div className="modal-subtitle">
                <span>{submission.username || `User #${submission.userId}`}</span>
                <span>·</span>
                <span>{submission.language}</span>
                {submission.submittedAt && (
                  <>
                    <span>·</span>
                    <span>
                      {new Date(submission.submittedAt).toLocaleString("vi-VN", {
                        hour12: false,
                      })}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {submission && (
              <button
                type="button"
                className="btn btn-ai btn-sm"
                onClick={() => {
                  onClose();
                  onAskAi(submission);
                }}
              >
                <IconSparkles size={14} />
                <span>Hỏi AI</span>
              </button>
            )}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
              <IconX size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {loading || !submission ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Đang tải chi tiết bài nộp...</p>
            </div>
          ) : (
            <div className="detail-stack">
              <div className="detail-summary">
                <div className="detail-stat">
                  <span className="detail-stat-label">Kết quả</span>
                  <VerdictBadge
                    status={submission.status}
                    passedTests={submission.passedTests}
                    totalTests={submission.totalTests}
                  />
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">Điểm số</span>
                  <span className="detail-stat-value">
                    {submission.maxScore
                      ? `${submission.score ?? 0} / ${submission.maxScore}`
                      : submission.totalTests
                        ? `${submission.passedTests ?? 0} / ${submission.totalTests}`
                        : "—"}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">CPU Time</span>
                  <span className="detail-stat-value">
                    {submission.executionTime != null ? `${submission.executionTime} ms` : "—"}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">Bộ nhớ đỉnh</span>
                  <span className="detail-stat-value">
                    {submission.memoryUsed ? `${submission.memoryUsed} KB` : "—"}
                  </span>
                </div>
              </div>

              {submission.errorMessage && (
                <div className="detail-section">
                  <div className="detail-section-title">Thông báo lỗi</div>
                  <pre className="error-log-box">{submission.errorMessage}</pre>
                </div>
              )}

              {diffCandidates.length > 0 && (
                <div className="detail-section">
                  {diffCandidates.map((r) => (
                    <OutputDiffViewer key={r.testIndex} result={r} />
                  ))}
                </div>
              )}

              {submission.results && submission.results.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title">Kết quả từng test case</div>
                  <div className="table-wrap">
                    <table className="data-table compact">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Loại</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                          <th>Bộ nhớ</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submission.results.map((r) => {
                          const meta = getVerdictMeta(r.verdict);
                          return (
                            <tr key={r.testIndex}>
                              <td className="mono">#{r.testIndex}</td>
                              <td>
                                <span className={`tag-pill ${r.sample ? "sample" : "hidden"}`}>
                                  {r.sample ? "Sample" : "Hidden"}
                                </span>
                              </td>
                              <td>
                                <span className={`verdict-badge tone-${meta.tone}`}>
                                  {meta.short}
                                </span>
                              </td>
                              <td className="mono">{r.timeMs} ms</td>
                              <td className="mono">{r.memoryKb > 0 ? `${r.memoryKb} KB` : "—"}</td>
                              <td className="test-msg-cell">
                                {r.message ? <pre className="inline-pre">{r.message}</pre> : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="detail-section">
                <div className="detail-section-header">
                  <span className="detail-section-title">Mã nguồn</span>
                  {submission.sourceCode && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopy}>
                      {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                      <span>{copied ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  )}
                </div>
                {submission.sourceCode ? (
                  <pre className="code-viewer">
                    <code>{submission.sourceCode}</code>
                  </pre>
                ) : (
                  <div className="muted-note">
                    Mã nguồn được ẩn để bảo mật bài làm của thí sinh khác.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
