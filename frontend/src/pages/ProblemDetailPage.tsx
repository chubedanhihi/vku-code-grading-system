import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type {
  CheckerMode,
  Difficulty,
  Lang,
  PlagiarismMatch,
  Problem,
  ProblemCommentView,
  RunCustomResponse,
  Submission,
  TestCase,
  UserProfile,
} from "../types";
import { LANG_META } from "../constants/languages";
import { FormattedMarkdown } from "../components/FormattedMarkdown";
import { VerdictBadge } from "../components/VerdictBadge";
import {
  IconArrowLeft,
  IconClock,
  IconCpu,
  IconDownload,
  IconEdit,
  IconMaximize,
  IconPlay,
  IconPlus,
  IconRefresh,
  IconShield,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from "../components/Icons";

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface ProblemDetailPageProps {
  problem: Problem;
  contestId?: number | null;
  classroomId?: number | null;
  user: UserProfile | null;
  testCases: TestCase[];
  submissions: Submission[];
  comments: ProblemCommentView[];
  editorialInfo: { unlocked: boolean; editorial: string } | null;
  subFilter: "all" | "my";
  lang: Lang;
  code: string;
  submitting: boolean;
  judgingSub: Submission | null;
  liveProgress: string | null;
  onBack: () => void;
  onLangChange: (l: Lang) => void;
  onCodeChange: (v: string) => void;
  onResetCode: () => void;
  onSubmitCode: () => void;
  onRunCustom: (input: string) => Promise<RunCustomResponse | null>;
  onChangeSubFilter: (f: "all" | "my") => void;
  onRefreshSubs: () => void;
  onOpenSubDetail: (id: number) => void;
  onAskAi: (sub?: Submission) => void;
  onLoadEditorial: () => void;
  onAddComment: (content: string) => Promise<boolean>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onLikeComment: (commentId: number) => Promise<void>;
  onUpdateProblem: (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
    checkerMode: CheckerMode;
    tags: string;
    studyPlan: string;
    editorial: string;
  }) => Promise<boolean>;
  onCreateTestCase: (
    input: string,
    output: string,
    isSample: boolean,
    points: number,
    subtask: number
  ) => Promise<boolean>;
  onUpdateTestCase: (
    id: number,
    input: string,
    output: string,
    isSample: boolean,
    points: number,
    subtask: number
  ) => Promise<boolean>;
  onDeleteTestCase: (id: number) => void;
  onImportZip: (file: File) => Promise<void>;
  onExportZip: () => Promise<void>;
  onGenerateTests: (payload: {
    count: number;
    generatorLang: string;
    generatorCode: string;
    solutionLang: string;
    solutionCode: string;
    markFirstAsSample: boolean;
  }) => Promise<boolean>;
  onCheckPlagiarism: () => Promise<PlagiarismMatch[]>;
  onGoLogin: () => void;
}

export function ProblemDetailPage({
  problem,
  contestId,
  classroomId,
  user,
  testCases,
  submissions,
  comments,
  editorialInfo,
  subFilter,
  lang,
  code,
  submitting,
  judgingSub,
  liveProgress,
  onBack,
  onLangChange,
  onCodeChange,
  onResetCode,
  onSubmitCode,
  onRunCustom,
  onChangeSubFilter,
  onRefreshSubs,
  onOpenSubDetail,
  onAskAi,
  onLoadEditorial,
  onAddComment,
  onDeleteComment,
  onLikeComment,
  onUpdateProblem,
  onCreateTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onImportZip,
  onExportZip,
  onGenerateTests,
  onCheckPlagiarism,
  onGoLogin,
}: ProblemDetailPageProps) {
  const [leftTab, setLeftTab] = useState<"desc" | "editorial" | "discuss">("desc");
  const [commentInput, setCommentInput] = useState("");
  // Split pane + Fullscreen + Font size
  const [leftPct, setLeftPct] = useState(46);
  const [fullscreen, setFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // Custom Run Console
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [runningCustom, setRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState<RunCustomResponse | null>(null);

  // Add / Edit TestCase
  const [tcInput, setTcInput] = useState("");
  const [tcOutput, setTcOutput] = useState("");
  const [tcSample, setTcSample] = useState(true);
  const [tcPoints, setTcPoints] = useState(10);
  const [tcSubtask, setTcSubtask] = useState(1);
  const [addingTc, setAddingTc] = useState(false);
  const [editingTcId, setEditingTcId] = useState<number | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Problem Modal
  const [editOpen, setEditOpen] = useState(false);
  const [edTitle, setEdTitle] = useState(problem.title);
  const [edDesc, setEdDesc] = useState(problem.description);
  const [edDiff, setEdDiff] = useState<Difficulty>(problem.difficulty);
  const [edTl, setEdTl] = useState(problem.timeLimit);
  const [edMl, setEdMl] = useState(problem.memoryLimit);
  const [edChecker, setEdChecker] = useState<CheckerMode>(problem.checkerMode || "EXACT");
  const [edTags, setEdTags] = useState(problem.tags || "");
  const [edPlan, setEdPlan] = useState(problem.studyPlan || "");
  const [edEditorial, setEdEditorial] = useState("");

  // Auto Test Case Generator Modal
  const [genOpen, setGenOpen] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genCode, setGenCode] = useState(
    `import random, sys\nseed = int(sys.stdin.read().strip() or 1)\nrandom.seed(seed)\nprint(random.randint(1, 1000), random.randint(1, 1000))`
  );
  const [solCode, setSolCode] = useState(`a, b = map(int, input().split())\nprint(a + b)`);
  const [genLoading, setGenLoading] = useState(false);

  // Plagiarism Modal
  const [plagOpen, setPlagOpen] = useState(false);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagMatches, setPlagMatches] = useState<PlagiarismMatch[]>([]);

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  useEffect(() => {
    setEdTitle(problem.title);
    setEdDesc(problem.description);
    setEdDiff(problem.difficulty);
    setEdTl(problem.timeLimit);
    setEdMl(problem.memoryLimit);
    setEdChecker(problem.checkerMode || "EXACT");
    setEdTags(problem.tags || "");
    setEdPlan(problem.studyPlan || "");
    setLeftTab("desc");
  }, [problem]);

  // Resizable divider drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(68, Math.max(28, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Phím tắt Ctrl+Enter (Submit) & Ctrl+' (Run Custom)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (user && !submitting && !judgingSub && code.trim()) onSubmitCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        if (user && !runningCustom && code.trim()) handleRunCustomClick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleRunCustomClick = async () => {
    setConsoleOpen(true);
    setRunningCustom(true);
    const res = await onRunCustom(customInput);
    setRunningCustom(false);
    if (res) setCustomResult(res);
  };

  const handleSaveTc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcOutput.trim()) return;
    setAddingTc(true);
    const ok = editingTcId
      ? await onUpdateTestCase(editingTcId, tcInput, tcOutput, tcSample, tcPoints, tcSubtask)
      : await onCreateTestCase(tcInput, tcOutput, tcSample, tcPoints, tcSubtask);
    setAddingTc(false);
    if (ok) {
      setEditingTcId(null);
      setTcInput("");
      setTcOutput("");
      setTcPoints(10);
      setTcSubtask(1);
    }
  };

  const startEditTc = (tc: TestCase) => {
    setEditingTcId(tc.id);
    setTcInput(tc.input);
    setTcOutput(tc.expectedOutput);
    setTcSample(tc.isSample);
    setTcPoints(tc.points ?? 10);
    setTcSubtask(tc.subtask ?? 1);
  };

  const handleSaveProblemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onUpdateProblem({
      title: edTitle.trim(),
      description: edDesc.trim(),
      difficulty: edDiff,
      timeLimit: edTl,
      memoryLimit: edMl,
      checkerMode: edChecker,
      tags: edTags.trim(),
      studyPlan: edPlan.trim(),
      editorial: edEditorial,
    });
    if (ok) setEditOpen(false);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    const ok = await onGenerateTests({
      count: genCount,
      generatorLang: "PYTHON",
      generatorCode: genCode,
      solutionLang: "PYTHON",
      solutionCode: solCode,
      markFirstAsSample: testCases.length === 0,
    });
    setGenLoading(false);
    if (ok) setGenOpen(false);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const ok = await onAddComment(commentInput.trim());
    if (ok) setCommentInput("");
  };

  const handleOpenPlagiarism = async () => {
    setPlagOpen(true);
    setPlagLoading(true);
    try {
      setPlagMatches(await onCheckPlagiarism());
    } finally {
      setPlagLoading(false);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="workspace-topbar" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <IconArrowLeft size={14} />
          <span>{contestId ? "Quay lại kỳ thi" : classroomId ? "Quay lại lớp học" : "Danh sách bài tập"}</span>
        </button>

        {isTeacher && (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditOpen(true)}>
              <IconEdit size={13} />
              <span>Sửa đề bài</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleOpenPlagiarism}>
              <IconShield size={13} />
              <span>Kiểm tra đạo văn</span>
            </button>
          </div>
        )}
      </div>

      <div
        ref={gridRef}
        className={`split-workspace ${fullscreen ? "is-fullscreen" : ""}`}
        style={
          fullscreen
            ? undefined
            : { gridTemplateColumns: `minmax(280px, ${leftPct}%) 10px minmax(320px, 1fr)` }
        }
      >
        {/* LEFT COLUMN */}
        {!fullscreen && (
          <div className="workspace-col">
            <div className="seg-tabs" style={{ alignSelf: "flex-start" }}>
              <button
                type="button"
                className={`seg-tab ${leftTab === "desc" ? "active" : ""}`}
                onClick={() => setLeftTab("desc")}
              >
                Đề bài & Test
              </button>
              <button
                type="button"
                className={`seg-tab ${leftTab === "editorial" ? "active" : ""}`}
                onClick={() => {
                  setLeftTab("editorial");
                  if (user) onLoadEditorial();
                }}
              >
                Lời giải mẫu
              </button>
              <button
                type="button"
                className={`seg-tab ${leftTab === "discuss" ? "active" : ""}`}
                onClick={() => setLeftTab("discuss")}
              >
                Thảo luận ({comments.length})
              </button>
            </div>

            {leftTab === "editorial" && (
              <section className="surface-card">
                <div className="section-header">
                  <h2 className="section-title">Lời giải mẫu (Editorial)</h2>
                </div>
                {!user ? (
                  <div className="empty-state compact">
                    <p>Đăng nhập và giải đúng (AC) bài tập này để mở khóa lời giải mẫu.</p>
                  </div>
                ) : !editorialInfo ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <p>Đang kiểm tra...</p>
                  </div>
                ) : !editorialInfo.unlocked ? (
                  <div className="empty-state compact">
                    <p>🔒 Hãy giải đúng (ACCEPTED) bài này trước để mở khóa lời giải mẫu.</p>
                  </div>
                ) : !editorialInfo.editorial ? (
                  <div className="empty-state compact">
                    <p>Giảng viên chưa cập nhật lời giải mẫu cho bài này.</p>
                  </div>
                ) : (
                  <FormattedMarkdown content={editorialInfo.editorial} />
                )}
              </section>
            )}

            {leftTab === "discuss" && (
              <section className="surface-card">
                <div className="section-header">
                  <h2 className="section-title">Thảo luận ({comments.length})</h2>
                </div>
                {user ? (
                  <form onSubmit={handleCommentSubmit} style={{ marginBottom: 14 }}>
                    <div className="ai-ask-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Đặt câu hỏi hoặc chia sẻ kinh nghiệm giải bài..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={!commentInput.trim()}>
                        Gửi
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="muted-note" style={{ marginBottom: 12 }}>
                    Đăng nhập để tham gia thảo luận.
                  </div>
                )}

                {comments.length === 0 ? (
                  <div className="empty-state compact">
                    <p>Chưa có bình luận nào.</p>
                  </div>
                ) : (
                  <div className="tc-list">
                    {comments.map((cm) => (
                      <div key={cm.id} className="comment-card">
                        <div className="tc-card-head">
                          <span className="tc-label">
                            <span style={{ fontWeight: 600 }}>{cm.username}</span>
                            {cm.role !== "STUDENT" && <span className="tag-pill sample">GV</span>}
                            {cm.createdAt && (
                              <span className="comment-time" title={new Date(cm.createdAt).toLocaleString("vi-VN")}>
                                • {formatTimeAgo(cm.createdAt)}
                              </span>
                            )}
                          </span>
                          {(isTeacher || user?.id === cm.userId) && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => onDeleteComment(cm.id)}
                              title="Xóa bình luận"
                            >
                              <IconTrash size={12} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: "6px 0 10px" }}>
                          {cm.content}
                        </p>
                        <div className="comment-footer">
                          <button
                            type="button"
                            className={`btn-like ${cm.liked ? "liked" : ""}`}
                            onClick={() => onLikeComment(cm.id)}
                            title={cm.liked ? "Bỏ thích" : "Thả tim"}
                          >
                            <span>{cm.liked ? "❤️" : "🤍"}</span>
                            <span>{cm.likes || 0}</span>
                          </button>
                          <button
                            type="button"
                            className="btn-reply"
                            onClick={() => {
                              setCommentInput(`@${cm.username} `);
                            }}
                            title="Trả lời thảo luận"
                          >
                            💬 Trả lời
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {leftTab === "desc" && (
              <>
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
                  {problem.checkerMode && problem.checkerMode !== "EXACT" && (
                    <span className="tag-pill">{problem.checkerMode}</span>
                  )}
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
                {isTeacher && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImportZip(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setGenOpen(true)}
                      title="Sinh hàng loạt test bằng script + code mẫu"
                    >
                      <IconSparkles size={13} />
                      <span>Sinh tự động</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => zipInputRef.current?.click()}
                      title="Import hàng loạt *.in / *.out từ file .zip"
                    >
                      <IconUpload size={13} />
                      <span>Import .zip</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={onExportZip}
                      title="Tải bộ test case dạng .zip"
                    >
                      <IconDownload size={13} />
                      <span>Export</span>
                    </button>
                  </div>
                )}
              </div>

              {testCases.length === 0 ? (
                <div className="empty-state compact">
                  {isTeacher ? (
                    <p style={{ color: "var(--accent-warning)" }}>
                      ⚠️ Bài tập chưa có test case nào. Hãy thêm test bên dưới (hoặc Import .zip / Sinh tự động) để sinh viên có thể nộp bài.
                    </p>
                  ) : (
                    <p>Chưa có test case mẫu nào.</p>
                  )}
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
                          {isTeacher && (
                            <span className="tag-pill">
                              Sub {tc.subtask ?? 1} · {tc.points ?? 10}đ
                            </span>
                          )}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {tc.isSample && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setCustomInput(tc.input);
                                setConsoleOpen(true);
                              }}
                            >
                              Thử input
                            </button>
                          )}
                          {isTeacher && (
                            <>
                              <button
                                type="button"
                                className="icon-btn"
                                title="Sửa test case"
                                onClick={() => startEditTc(tc)}
                              >
                                <IconEdit size={13} />
                              </button>
                              <button
                                id={`btn-del-tc-${tc.id}`}
                                type="button"
                                className="icon-btn danger"
                                title="Xóa test case"
                                onClick={() => onDeleteTestCase(tc.id)}
                              >
                                <IconTrash size={13} />
                              </button>
                            </>
                          )}
                        </div>
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
                <form onSubmit={handleSaveTc} className="tc-add-form">
                  <div className="divider" />
                  <div className="detail-section-title" style={{ marginBottom: 10 }}>
                    {editingTcId ? `Sửa Test Case #${editingTcId}` : "Thêm Test Case"}
                  </div>
                  <div className="tc-io-grid">
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" htmlFor="tc-input">
                        Input
                      </label>
                      <textarea
                        id="tc-input"
                        className="form-textarea mono"
                        rows={2}
                        value={tcInput}
                        onChange={(e) => setTcInput(e.target.value)}
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
                        required
                      />
                    </div>
                  </div>
                  <div className="tc-io-grid" style={{ marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Điểm</label>
                      <input
                        type="number"
                        className="form-input"
                        min={0}
                        value={tcPoints}
                        onChange={(e) => setTcPoints(Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Subtask</label>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        value={tcSubtask}
                        onChange={(e) => setTcSubtask(Number(e.target.value))}
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
                      <span>Sample (hiển thị cho sinh viên)</span>
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {editingTcId && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingTcId(null);
                            setTcInput("");
                            setTcOutput("");
                          }}
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        id="btn-add-tc"
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={addingTc || !tcOutput.trim()}
                      >
                        <IconPlus size={14} />
                        <span>{addingTc ? "Đang lưu..." : editingTcId ? "Cập nhật" : "Thêm test"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </section>
              </>
            )}
          </div>
        )}

        {/* RESIZE HANDLE */}
        {!fullscreen && (
          <div
            className="split-resizer"
            onMouseDown={() => {
              draggingRef.current = true;
            }}
            title="Kéo để thay đổi kích thước"
          />
        )}

        {/* RIGHT COLUMN */}
        <div className="workspace-col">
          <section className="surface-card editor-card">
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

              <div className="editor-tools">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setFontSize((s) => Math.max(11, s - 1))}
                  title="Giảm cỡ chữ"
                >
                  A-
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                  title="Tăng cỡ chữ"
                >
                  A+
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onResetCode}
                  title="Khôi phục code mẫu"
                >
                  <IconRefresh size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setFullscreen((f) => !f)}
                  title={fullscreen ? "Thu gọn" : "Toàn màn hình"}
                >
                  <IconMaximize size={14} />
                </button>
              </div>
            </div>

            <div className="monaco-box">
              <Editor
                height={fullscreen ? "62vh" : "380px"}
                language={LANG_META[lang].monacoLang}
                value={code}
                onChange={(v) => onCodeChange(v ?? "")}
                theme="vs-dark"
                options={{
                  fontSize,
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

            {/* Custom Input / Output Console */}
            {consoleOpen && (
              <div className="custom-console">
                <div className="custom-console-head">
                  <span>Chạy thử (Custom Input)</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {testCases[0]?.isSample && (
                      <button
                        type="button"
                        className="link-btn"
                        style={{ fontSize: "0.76rem" }}
                        onClick={() => setCustomInput(testCases[0].input)}
                      >
                        Dùng Sample #1
                      </button>
                    )}
                    <button type="button" className="icon-btn" onClick={() => setConsoleOpen(false)}>
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
                <div className="tc-io-grid">
                  <div>
                    <label className="tc-io-label">Stdin</label>
                    <textarea
                      className="form-textarea mono"
                      rows={3}
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Nhập dữ liệu đầu vào..."
                    />
                  </div>
                  <div>
                    <label className="tc-io-label">
                      Output{" "}
                      {customResult && (
                        <span className="mono" style={{ color: "var(--accent-primary)" }}>
                          ({customResult.verdict} · {customResult.timeMs}ms)
                        </span>
                      )}
                    </label>
                    <pre className="console-out mono">
                      {runningCustom
                        ? "Đang biên dịch và chạy thử..."
                        : customResult
                          ? customResult.compileError ||
                            customResult.stderr ||
                            customResult.stdout ||
                            "(trống)"
                          : "Nhấn 'Chạy thử' để xem kết quả."}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="editor-footer">
              {judgingSub ? (
                <div className="judging-banner">
                  <span className="pulse-dot" />
                  <span>
                    {liveProgress
                      ? liveProgress
                      : judgingSub.status === "RUNNING"
                        ? `Đang chạy trong sandbox (#${judgingSub.id})...`
                        : `Đang chờ trong hàng đợi (#${judgingSub.id})...`}
                  </span>
                </div>
              ) : user ? (
                <div className="editor-actions-wrap">
                  <div className="editor-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={runningCustom || !code.trim()}
                      onClick={handleRunCustomClick}
                      title="Ctrl + '"
                    >
                      <IconPlay size={13} />
                      <span>{runningCustom ? "Đang chạy..." : "Chạy thử"}</span>
                    </button>
                    <button
                      id="btn-submit-code"
                      type="button"
                      className="btn btn-primary"
                      disabled={submitting || !code.trim()}
                      onClick={onSubmitCode}
                      title="Ctrl + Enter"
                    >
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
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: "0.78rem" }}
                    onClick={() => setConsoleOpen((o) => !o)}
                  >
                    {consoleOpen ? "Ẩn Console" : "Mở Console"}
                  </button>
                </div>
              ) : (
                <div className="login-prompt-bar">
                  <span>Đăng nhập để chạy thử, nộp bài và xem lịch sử chấm.</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={onGoLogin}>
                    Đăng nhập
                  </button>
                </div>
              )}
            </div>
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
                        title="Nhấn để xem chi tiết & Diff Viewer"
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

      {/* Edit Problem Modal */}
      {editOpen && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chỉnh sửa bài tập #{problem.id}</h3>
              <button type="button" className="icon-btn" onClick={() => setEditOpen(false)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveProblemEdit}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={edTitle}
                    onChange={(e) => setEdTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả *</label>
                  <textarea
                    className="form-textarea"
                    rows={6}
                    value={edDesc}
                    onChange={(e) => setEdDesc(e.target.value)}
                    required
                  />
                </div>
                <div className="form-grid-4">
                  <div className="form-group">
                    <label className="form-label">Độ khó</label>
                    <select
                      className="form-select"
                      value={edDiff}
                      onChange={(e) => setEdDiff(e.target.value as Difficulty)}
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time (ms)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={edTl}
                      onChange={(e) => setEdTl(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">RAM (MB)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={edMl}
                      onChange={(e) => setEdMl(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Checker</label>
                    <select
                      className="form-select"
                      value={edChecker}
                      onChange={(e) => setEdChecker(e.target.value as CheckerMode)}
                    >
                      <option value="EXACT">EXACT</option>
                      <option value="FLOAT_1E6">FLOAT_1E6</option>
                      <option value="FLOAT_1E4">FLOAT_1E4</option>
                      <option value="TOKENS_IGNORE_CASE">TOKENS_IGNORE_CASE</option>
                    </select>
                  </div>
                </div>
                <div className="tc-io-grid">
                  <div className="form-group">
                    <label className="form-label">Chủ đề (Tags)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edTags}
                      onChange={(e) => setEdTags(e.target.value)}
                      placeholder="Array, Math, DP"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lộ trình (Study Plan)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edPlan}
                      onChange={(e) => setEdPlan(e.target.value)}
                      placeholder="Cơ bản năm nhất"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lời giải mẫu (Editorial - tùy chọn)</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={edEditorial}
                    onChange={(e) => setEdEditorial(e.target.value)}
                    placeholder="Để trống nếu giữ nguyên lời giải mẫu hiện tại..."
                  />
                </div>
                <div className="form-actions-end">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Auto Test Case Generator Modal */}
      {genOpen && (
        <div className="modal-overlay" onClick={() => setGenOpen(false)}>
          <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Sinh Test Case tự động (Stress / Random Generator)</h3>
              <button type="button" className="icon-btn" onClick={() => setGenOpen(false)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleGenerateSubmit}>
                <div className="form-group">
                  <label className="form-label">Số lượng test cần sinh (1–20)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 140 }}
                    min={1}
                    max={20}
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                  />
                </div>
                <div className="tc-io-grid">
                  <div className="form-group">
                    <label className="form-label">Script sinh Input (Python 3 — đọc seed từ stdin)</label>
                    <textarea
                      className="form-textarea mono"
                      rows={6}
                      value={genCode}
                      onChange={(e) => setGenCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code lời giải chuẩn (Python 3)</label>
                    <textarea
                      className="form-textarea mono"
                      rows={6}
                      value={solCode}
                      onChange={(e) => setSolCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions-end">
                  <button type="button" className="btn btn-ghost" onClick={() => setGenOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={genLoading}>
                    {genLoading ? "Đang sinh test..." : `Sinh ${genCount} test case`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Plagiarism Check Modal */}
      {plagOpen && (
        <div className="modal-overlay" onClick={() => setPlagOpen(false)}>
          <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Kiểm tra tương đồng mã nguồn — #{problem.id}</h3>
              <button type="button" className="icon-btn" onClick={() => setPlagOpen(false)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="modal-body">
              {plagLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Đang phân tích token các bài AC...</p>
                </div>
              ) : plagMatches.length === 0 ? (
                <div className="empty-state compact">
                  <p>Không phát hiện cặp bài AC nào có độ tương đồng ≥ 25%.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sinh viên A</th>
                        <th>Sinh viên B</th>
                        <th>Ngôn ngữ</th>
                        <th>Độ tương đồng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plagMatches.map((m, idx) => (
                        <tr key={idx}>
                          <td>
                            {m.userAName} <span className="mono muted">(#{m.submissionAId})</span>
                          </td>
                          <td>
                            {m.userBName} <span className="mono muted">(#{m.submissionBId})</span>
                          </td>
                          <td>
                            <span className="tag-pill">{m.language}</span>
                          </td>
                          <td>
                            <span
                              className={`verdict-badge ${
                                m.similarityPercent >= 75
                                  ? "tone-danger"
                                  : m.similarityPercent >= 50
                                    ? "tone-warning"
                                    : "tone-info"
                              }`}
                            >
                              {m.similarityPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
