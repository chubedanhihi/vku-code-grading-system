import { useState } from "react";
import type { ContestStandingRow, ContestView, Problem, UserProfile } from "../types";
import { IconArrowLeft, IconArrowRight, IconClock, IconPlus, IconTrash } from "../components/Icons";

interface ContestsPageProps {
  contests: ContestView[];
  selectedContest: ContestView | null;
  standings: ContestStandingRow[];
  problems: Problem[];
  user: UserProfile | null;
  loading: boolean;
  onSelectContest: (id: number) => void;
  onBackToList: () => void;
  onRegister: (id: number) => Promise<void>;
  onCreateContest: (payload: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    problemIds: number[];
  }) => Promise<boolean>;
  onDeleteContest: (id: number) => Promise<void>;
  onOpenProblemInContest: (problemId: number, contestId: number) => void;
}

export function ContestsPage({
  contests,
  selectedContest,
  standings,
  problems,
  user,
  loading,
  onSelectContest,
  onBackToList,
  onRegister,
  onCreateContest,
  onDeleteContest,
  onOpenProblemInContest,
}: ContestsPageProps) {
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [tab, setTab] = useState<"problems" | "standings">("problems");

  const toggleProblem = (id: number) => {
    setPickedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;
    const ok = await onCreateContest({
      title: title.trim(),
      description: desc.trim(),
      startTime,
      endTime,
      problemIds: pickedIds,
    });
    if (ok) {
      setShowCreate(false);
      setTitle("");
      setDesc("");
      setPickedIds([]);
    }
  };

  const fmt = (s: string) => {
    try {
      return new Date(s).toLocaleString("vi-VN", { hour12: false });
    } catch {
      return s;
    }
  };

  if (selectedContest) {
    const c = selectedContest;
    const probs = c.problems ?? [];
    return (
      <div className="page-container fade-in">
        <div className="workspace-topbar" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBackToList}>
            <IconArrowLeft size={14} />
            <span>Tất cả kỳ thi</span>
          </button>

          <div className="seg-tabs">
            <button
              type="button"
              className={`seg-tab ${tab === "problems" ? "active" : ""}`}
              onClick={() => setTab("problems")}
            >
              Đề thi ({probs.length})
            </button>
            <button
              type="button"
              className={`seg-tab ${tab === "standings" ? "active" : ""}`}
              onClick={() => setTab("standings")}
            >
              Bảng xếp hạng ICPC
            </button>
          </div>
        </div>

        <div className="surface-card">
          <div className="page-head">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 className="page-title">{c.title}</h1>
                <span className={`contest-status st-${c.status.toLowerCase()}`}>{c.status}</span>
              </div>
              <p className="page-subtitle">
                {fmt(c.startTime)} → {fmt(c.endTime)} · {c.participantCount} thí sinh
              </p>
              {c.description && <p style={{ marginTop: 8, fontSize: "0.88rem", color: "var(--text-secondary)" }}>{c.description}</p>}
            </div>

            {user && !c.registered && c.status !== "ENDED" && (
              <button type="button" className="btn btn-primary" onClick={() => onRegister(c.id)}>
                Đăng ký tham gia
              </button>
            )}
            {c.registered && <span className="tag-pill sample">Đã đăng ký</span>}
          </div>
        </div>

        {tab === "problems" ? (
          <div className="surface-card">
            {probs.length === 0 ? (
              <div className="empty-state compact">
                <p>Kỳ thi chưa có bài tập nào.</p>
              </div>
            ) : (
              <div className="problem-list">
                {probs.map((cp, idx) => (
                  <div
                    key={cp.problemId}
                    className="problem-item"
                    onClick={() => onOpenProblemInContest(cp.problemId, c.id)}
                  >
                    <div className="problem-item-main">
                      <span className="problem-id mono">{String.fromCharCode(65 + idx)}</span>
                      <span className="problem-title">{cp.title}</span>
                      <span className={`diff-badge diff-${cp.difficulty.toLowerCase()}`}>
                        {cp.difficulty}
                      </span>
                    </div>
                    <div className="problem-item-meta">
                      <span className="limit-chip">{cp.points} pts</span>
                      <button type="button" className="btn btn-primary btn-sm">
                        <span>Làm bài</span>
                        <IconArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="surface-card">
            {standings.length === 0 ? (
              <div className="empty-state compact">
                <p>Chưa có thí sinh nào nộp bài trong kỳ thi này.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Thí sinh</th>
                      <th>Giải</th>
                      <th>Phạt (phút)</th>
                      {probs.map((cp, idx) => (
                        <th key={cp.problemId} style={{ textAlign: "center" }}>
                          {String.fromCharCode(65 + idx)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.userId}>
                        <td className="mono">{row.rank}</td>
                        <td style={{ fontWeight: 600 }}>{row.username}</td>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--accent-success)" }}>
                          {row.solved}
                        </td>
                        <td className="mono muted">{row.penaltyMinutes}</td>
                        {probs.map((cp) => {
                          const cell = row.cells[cp.problemId];
                          return (
                            <td key={cp.problemId} style={{ textAlign: "center" }} className="mono">
                              {!cell ? (
                                "—"
                              ) : cell.solved ? (
                                <span style={{ color: "var(--accent-success)" }}>
                                  +{cell.wrongAttempts > 0 ? cell.wrongAttempts : ""} ({cell.solvedMinutes}m)
                                </span>
                              ) : (
                                <span style={{ color: "var(--accent-danger)" }}>-{cell.wrongAttempts}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Kỳ thi & Bài kiểm tra</h1>
          <p className="page-subtitle">
            Tham gia các kỳ thi theo thời gian thực với bảng xếp hạng chuẩn ICPC.
          </p>
        </div>
        {isTeacher && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <IconPlus size={15} />
            <span>Tạo kỳ thi</span>
          </button>
        )}
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải danh sách kỳ thi...</p>
          </div>
        ) : contests.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có kỳ thi nào được tạo.</p>
          </div>
        ) : (
          <div className="problem-list">
            {contests.map((c) => (
              <div
                key={c.id}
                className="problem-item"
                onClick={() => onSelectContest(c.id)}
              >
                <div className="problem-item-main">
                  <span className={`contest-status st-${c.status.toLowerCase()}`}>{c.status}</span>
                  <span className="problem-title">{c.title}</span>
                </div>
                <div className="problem-item-meta">
                  <span className="limit-chip">
                    <IconClock size={13} />
                    {fmt(c.startTime)}
                  </span>
                  <span className="tag-pill">{c.problemCount} bài</span>
                  <span className="tag-pill">{c.participantCount} thí sinh</span>
                  {isTeacher && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteContest(c.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo kỳ thi mới</h3>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Tên kỳ thi *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra giữa kỳ Cấu trúc dữ liệu"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <div className="tc-io-grid">
                  <div className="form-group">
                    <label className="form-label">Bắt đầu *</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kết thúc *</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Chọn bài tập ({pickedIds.length})</label>
                  <div className="contest-pick-list">
                    {problems.map((p) => (
                      <label key={p.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={pickedIds.includes(p.id)}
                          onChange={() => toggleProblem(p.id)}
                        />
                        <span>
                          #{p.id} {p.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-actions-end">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Tạo kỳ thi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
