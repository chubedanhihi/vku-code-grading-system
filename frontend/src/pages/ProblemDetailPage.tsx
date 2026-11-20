import { useState } from "react";
import Editor from "@monaco-editor/react";
import type { Lang, Problem, Submission, TestCase, UserProfile } from "../types";
import { LANG_META } from "../constants/languages";
import { FormattedMarkdown } from "../components/FormattedMarkdown";
import { VerdictBadge } from "../components/VerdictBadge";
import {
  IconArrowLeft,
  IconClock,
  IconCpu,
  IconPlay,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
} from "../components/Icons";

interface ProblemDetailPageProps {
  problem: Problem;
  user: UserProfile | null;
  testCases: TestCase[];
  submissions: Submission[];
  subFilter: "all" | "my";
  lang: Lang;
  code: string;
  submitting: boolean;
  judgingSub: Submission | null;
  onBack: () => void;
  onLangChange: (l: Lang) => void;
  onCodeChange: (v: string) => void;
  onSubmitCode: (e: React.FormEvent) => void;
  onChangeSubFilter: (f: "all" | "my") => void;
  onRefreshSubs: () => void;
  onOpenSubDetail: (id: number) => void;
  onAskAi: (sub?: Submission) => void;
  onCreateTestCase: (input: string, output: string, isSample: boolean) => Promise<boolean>;
  onDeleteTestCase: (id: number) => void;
  onGoLogin: () => void;
}

export function ProblemDetailPage({
  problem,
  user,
  testCases,
  submissions,
  subFilter,
  lang,
  code,
  submitting,
  judgingSub,
  onBack,
  onLangChange,
  onCodeChange,
  onSubmitCode,
  onChangeSubFilter,
  onRefreshSubs,
  onOpenSubDetail,
  onAskAi,
  onCreateTestCase,
  onDeleteTestCase,
  onGoLogin,
}: ProblemDetailPageProps) {
  const [tcInput, setTcInput] = useState("");
  const [tcOutput, setTcOutput] = useState("");
  const [tcSample, setTcSample] = useState(true);
  const [addingTc, setAddingTc] = useState(false);

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const handleAddTc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcOutput.trim()) return;
    setAddingTc(true);
    const ok = await onCreateTestCase(tcInput, tcOutput, tcSample);
    setAddingTc(false);
    if (ok) {
      setTcInput("");
      setTcOutput("");
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="workspace-topbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <IconArrowLeft size={14} />
          <span>Danh sách bài tập</span>
        </button>
      </div>

      <div className="workspace-grid">
        {/* LEFT COLUMN: Description & Test Cases */}
        <div className="workspace-col">
          <section className="surface-card">
            <div className="problem-doc-header">
              <h1 className="problem-doc-title">
                <span className="mono" style={{ color: "var(--text-muted)", marginRight: 8 }}>
                  #{problem.id}
                </span>
                {problem.title}
              </h1>
              <div className="problem-doc-meta">
                <span className={`diff-badge diff-${problem.difficulty.toLowerCase()}`}>
                  {problem.difficulty}
                </span>
                <span className="limit-chip">
                  <IconClock size={13} /> {problem.timeLimit} ms
                </span>
                <span className="limit-chip">
                  <IconCpu size={13} /> {problem.memoryLimit} MB
                </span>
              </div>
            </div>

            <div className="problem-description">
              <FormattedMarkdown content={problem.description} />
            </div>
          </section>

          <section className="surface-card">
            <div className="section-header">
              <h2 className="section-title">
                {isTeacher ? "Bộ Test Cases" : "Ví dụ mẫu"}
                <span className="count-pill">{testCases.length}</span>
              </h2>
            </div>

            {testCases.length === 0 ? (
              <div className="empty-state compact">
                <p>Chưa có test case mẫu nào.</p>
              </div>
            ) : (
              <div className="tc-list">
                {testCases.map((tc, idx) => (
                  <div key={tc.id} className="tc-card">
                    <div className="tc-card-head">
                      <span className="tc-label">
                        Test #{idx + 1}
                        <span className={`tag-pill ${tc.isSample ? "sample" : "hidden"}`}>
                          {tc.isSample ? "Sample" : "Hidden"}
                        </span>
                      </span>
                      {isTeacher && (
                        <button
                          id={`btn-del-tc-${tc.id}`}
                          type="button"
                          className="icon-btn danger"
                          title="Xóa test case"
                          onClick={() => onDeleteTestCase(tc.id)}
                        >
                          <IconTrash size={13} />
                        </button>
                      )}
                    </div>
                    <div className="tc-io-grid">
                      <div className="tc-io-box">
                        <span className="tc-io-label">Input</span>
                        <pre>{tc.input || "(trống)"}</pre>
                      </div>
                      <div className="tc-io-box">
                        <span className="tc-io-label">Expected Output</span>
                        <pre>{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isTeacher && (
              <form onSubmit={handleAddTc} className="tc-add-form">
                <div className="divider" />
                <div className="detail-section-title" style={{ marginBottom: 10 }}>
                  Thêm Test Case
                </div>
                <div className="tc-io-grid">
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label" htmlFor="tc-input">
                      Input (có thể để trống)
                    </label>
                    <textarea
                      id="tc-input"
                      className="form-textarea mono"
                      rows={2}
                      value={tcInput}
                      onChange={(e) => setTcInput(e.target.value)}
                      placeholder="VD: 3 5"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label" htmlFor="tc-output">
                      Expected Output *
                    </label>
                    <textarea
                      id="tc-output"
                      className="form-textarea mono"
                      rows={2}
                      value={tcOutput}
                      onChange={(e) => setTcOutput(e.target.value)}
                      placeholder="VD: 8"
                      required
                    />
                  </div>
                </div>
                <div className="tc-form-actions">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={tcSample}
                      onChange={(e) => setTcSample(e.target.checked)}
                    />
                    <span>Hiển thị cho sinh viên (Sample)</span>
                  </label>
                  <button
                    id="btn-add-tc"
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={addingTc || !tcOutput.trim()}
                  >
                    <IconPlus size={14} />
                    <span>{addingTc ? "Đang thêm..." : "Thêm test"}</span>
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Editor + Submissions */}
        <div className="workspace-col">
          <section className="surface-card editor-card">
            <form onSubmit={onSubmitCode}>
              <div className="editor-header">
                <div className="lang-tabs">
                  {(["CPP", "C", "JAVA", "PYTHON"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      id={`lang-btn-${l.toLowerCase()}`}
                      type="button"
                      className={`lang-tab ${lang === l ? "active" : ""}`}
                      onClick={() => onLangChange(l)}
                    >
                      {LANG_META[l].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="monaco-box">
                <Editor
                  height="380px"
                  language={LANG_META[lang].monacoLang}
                  value={code}
                  onChange={(v) => onCodeChange(v ?? "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 13.5,
                    fontFamily: "'JetBrains Mono', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbersMinChars: 3,
                    padding: { top: 14, bottom: 14 },
                    scrollbar: { verticalScrollbarSize: 6 },
                    bracketPairColorization: { enabled: true },
                    automaticLayout: true,
                  }}
                />
              </div>

              <div className="editor-footer">
                {judgingSub ? (
                  <div className="judging-banner">
                    <span className="pulse-dot" />
                    <span>
                      {judgingSub.status === "RUNNING"
                        ? `Đang chạy trong sandbox (#${judgingSub.id})...`
                        : `Đang chờ trong hàng đợi (#${judgingSub.id})...`}
                    </span>
                  </div>
                ) : user ? (
                  <div className="editor-actions">
                    <button
                      id="btn-submit-code"
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || !code.trim()}
                    >
                      <IconPlay size={14} />
                      <span>{submitting ? "Đang gửi..." : "Nộp bài"}</span>
                    </button>
                    <button
                      id="btn-trigger-ai"
                      type="button"
                      className="btn btn-ai"
                      onClick={() => onAskAi()}
                    >
                      <IconSparkles size={14} />
                      <span>Phân tích AI</span>
                    </button>
                  </div>
                ) : (
                  <div className="login-prompt-bar">
                    <span>Đăng nhập để nộp bài và xem lịch sử chấm.</span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={onGoLogin}>
                      Đăng nhập
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>

          <section className="surface-card">
            <div className="section-header">
              <h2 className="section-title">
                Lịch sử nộp bài
                {user && <span className="count-pill">{submissions.length}</span>}
              </h2>

              {user && (
                <div className="section-actions">
                  <div className="seg-tabs">
                    <button
                      type="button"
                      className={`seg-tab ${subFilter === "all" ? "active" : ""}`}
                      onClick={() => onChangeSubFilter("all")}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`seg-tab ${subFilter === "my" ? "active" : ""}`}
                      onClick={() => onChangeSubFilter("my")}
                    >
                      Của tôi
                    </button>
                  </div>
                  <button
                    id="btn-refresh-subs"
                    type="button"
                    className="icon-btn"
                    onClick={onRefreshSubs}
                    title="Làm mới"
                  >
                    <IconRefresh size={14} />
                  </button>
                </div>
              )}
            </div>

            {!user ? (
              <div className="empty-state compact">
                <p>Lịch sử nộp bài chỉ hiển thị khi bạn đã đăng nhập.</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="empty-state compact">
                <p>Chưa có bài nộp nào cho bài tập này.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Thí sinh</th>
                      <th>Ngôn ngữ</th>
                      <th>Kết quả</th>
                      <th>Tài nguyên</th>
                      <th style={{ textAlign: "right" }}>AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        id={`sub-row-${sub.id}`}
                        className="clickable-row"
                        onClick={() => onOpenSubDetail(sub.id)}
                        title="Nhấn để xem chi tiết từng test case"
                      >
                        <td className="mono muted">#{sub.id}</td>
                        <td>{sub.username || `#${sub.userId}`}</td>
                        <td>
                          <span className="tag-pill">{sub.language}</span>
                        </td>
                        <td>
                          <VerdictBadge
                            status={sub.status}
                            passedTests={sub.passedTests}
                            totalTests={sub.totalTests}
                            title={sub.errorMessage ?? ""}
                          />
                        </td>
                        <td className="mono muted">
                          {sub.executionTime != null ? `${sub.executionTime} ms` : "—"}
                          {sub.memoryUsed ? ` · ${sub.memoryUsed} KB` : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="icon-btn ai"
                            title="Hỏi AI về bài nộp này"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAskAi(sub);
                            }}
                          >
                            <IconSparkles size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
