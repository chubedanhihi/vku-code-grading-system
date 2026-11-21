import { useState } from "react";
import type { ClassroomView, GradebookRow, Problem, UserProfile } from "../types";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconCopy,
  IconDownload,
  IconPlus,
  IconTrash,
} from "../components/Icons";

interface ClassroomsPageProps {
  classrooms: ClassroomView[];
  selectedClassroom: ClassroomView | null;
  gradebook: GradebookRow[];
  problems: Problem[];
  user: UserProfile | null;
  loading: boolean;
  onSelectClassroom: (id: number) => void;
  onBackToList: () => void;
  onJoinByCode: (code: string) => Promise<void>;
  onCreateClassroom: (name: string, description: string) => Promise<boolean>;
  onDeleteClassroom: (id: number) => Promise<void>;
  onAddAssignment: (
    classroomId: number,
    payload: { problemId: number; weekLabel: string; dueAt?: string | null; allowLate: boolean }
  ) => Promise<boolean>;
  onRemoveAssignment: (assignmentId: number) => Promise<void>;
  onExportCsv: (classroomId: number) => Promise<void>;
  onOpenProblemInClass: (problemId: number, classroomId: number) => void;
}

export function ClassroomsPage({
  classrooms,
  selectedClassroom,
  gradebook,
  problems,
  user,
  loading,
  onSelectClassroom,
  onBackToList,
  onJoinByCode,
  onCreateClassroom,
  onDeleteClassroom,
  onAddAssignment,
  onRemoveAssignment,
  onExportCsv,
  onOpenProblemInClass,
}: ClassroomsPageProps) {
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const [tab, setTab] = useState<"assignments" | "gradebook">("assignments");
  const [assignPid, setAssignPid] = useState<number>(problems[0]?.id || 1);
  const [weekLabel, setWeekLabel] = useState("Tuần 1");
  const [dueAt, setDueAt] = useState("");
  const [allowLate, setAllowLate] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    await onJoinByCode(joinCode.trim());
    setJoinCode("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await onCreateClassroom(name.trim(), desc.trim());
    if (ok) {
      setShowCreate(false);
      setName("");
      setDesc("");
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroom || !assignPid) return;
    await onAddAssignment(selectedClassroom.id, {
      problemId: assignPid,
      weekLabel: weekLabel.trim() || "Tuần 1",
      dueAt: dueAt || null,
      allowLate,
    });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const fmt = (s?: string | null) => {
    if (!s) return "Không giới hạn";
    try {
      return new Date(s).toLocaleString("vi-VN", { hour12: false });
    } catch {
      return s;
    }
  };

  if (selectedClassroom) {
    const c = selectedClassroom;
    const assigns = c.assignments ?? [];
    return (
      <div className="page-container fade-in">
        <div className="workspace-topbar" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBackToList}>
            <IconArrowLeft size={14} />
            <span>Danh sách lớp học</span>
          </button>

          {isTeacher && (
            <div style={{ display: "flex", gap: 8 }}>
              <div className="seg-tabs">
                <button
                  type="button"
                  className={`seg-tab ${tab === "assignments" ? "active" : ""}`}
                  onClick={() => setTab("assignments")}
                >
                  Bài tập ({assigns.length})
                </button>
                <button
                  type="button"
                  className={`seg-tab ${tab === "gradebook" ? "active" : ""}`}
                  onClick={() => setTab("gradebook")}
                >
                  Bảng điểm ({gradebook.length})
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onExportCsv(c.id)}
              >
                <IconDownload size={14} />
                <span>Xuất CSV</span>
              </button>
            </div>
          )}
        </div>

        <div className="surface-card">
          <div className="page-head">
            <div>
              <h1 className="page-title">{c.name}</h1>
              <p className="page-subtitle">
                Giảng viên: {c.teacherName} · {c.memberCount} sinh viên · {c.assignmentCount} bài tập
              </p>
              {c.description && (
                <p style={{ marginTop: 8, fontSize: "0.86rem", color: "var(--text-secondary)" }}>
                  {c.description}
                </p>
              )}
            </div>

            <div className="join-code-box">
              <span className="detail-stat-label">Mã tham gia</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                  {c.joinCode}
                </span>
                <button type="button" className="icon-btn" onClick={() => copyCode(c.joinCode)}>
                  {copiedCode ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {tab === "assignments" ? (
          <>
            <div className="surface-card">
              <div className="section-header">
                <h2 className="section-title">Bài tập được giao</h2>
              </div>
              {assigns.length === 0 ? (
                <div className="empty-state compact">
                  <p>Lớp học chưa có bài tập nào.</p>
                </div>
              ) : (
                <div className="problem-list">
                  {assigns.map((a) => (
                    <div
                      key={a.id}
                      className="problem-item"
                      onClick={() => onOpenProblemInClass(a.problemId, c.id)}
                    >
                      <div className="problem-item-main">
                        <span className="tag-pill">{a.weekLabel}</span>
                        <span className="problem-title">{a.title}</span>
                        <span className={`diff-badge diff-${a.difficulty.toLowerCase()}`}>
                          {a.difficulty}
                        </span>
                        {a.myStatus === "SOLVED" && <span className="tag-pill sample">Đã AC</span>}
                        {a.myStatus === "LATE_SOLVED" && <span className="verdict-badge tone-warning">AC (Muộn)</span>}
                      </div>

                      <div className="problem-item-meta">
                        <span className="limit-chip" style={{ color: a.overdue ? "var(--accent-danger)" : undefined }}>
                          <IconClock size={13} />
                          Hạn: {fmt(a.dueAt)}
                        </span>
                        <button type="button" className="btn btn-primary btn-sm">
                          <span>Làm bài</span>
                          <IconArrowRight size={13} />
                        </button>
                        {isTeacher && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAssignment(a.id);
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

            {isTeacher && problems.length > 0 && (
              <div className="surface-card">
                <div className="section-header">
                  <h2 className="section-title">Giao bài tập cho lớp</h2>
                </div>
                <form onSubmit={handleAssign}>
                  <div className="form-grid-4">
                    <div className="form-group">
                      <label className="form-label">Chọn bài tập</label>
                      <select
                        className="form-select"
                        value={assignPid}
                        onChange={(e) => setAssignPid(Number(e.target.value))}
                      >
                        {problems.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tuần / Chương</label>
                      <input
                        type="text"
                        className="form-input"
                        value={weekLabel}
                        onChange={(e) => setWeekLabel(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hạn nộp</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={allowLate}
                          onChange={(e) => setAllowLate(e.target.checked)}
                        />
                        <span>Cho phép nộp muộn</span>
                      </label>
                    </div>
                  </div>
                  <div className="form-actions-end">
                    <button type="submit" className="btn btn-primary btn-sm">
                      <IconPlus size={14} />
                      <span>Giao bài</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="surface-card">
            <div className="section-header">
              <h2 className="section-title">Bảng điểm lớp học</h2>
            </div>
            {gradebook.length === 0 ? (
              <div className="empty-state compact">
                <p>Chưa có sinh viên nào trong lớp.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sinh viên</th>
                      <th>Email</th>
                      <th>Đã AC</th>
                      <th>Tổng điểm</th>
                      {assigns.map((a) => (
                        <th key={a.id} title={a.title}>
                          {a.weekLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.map((row) => (
                      <tr key={row.userId}>
                        <td style={{ fontWeight: 600 }}>{row.username}</td>
                        <td className="muted">{row.email}</td>
                        <td className="mono">{row.solvedCount}/{assigns.length}</td>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--accent-primary)" }}>
                          {row.totalScore}
                        </td>
                        {assigns.map((a) => {
                          const st = row.statuses[a.problemId] || "NONE";
                          return (
                            <td key={a.id}>
                              <span
                                className={`tag-pill ${
                                  st === "AC" ? "sample" : st === "LATE_AC" ? "" : "hidden"
                                }`}
                              >
                                {st}
                              </span>
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
          <h1 className="page-title">Lớp học phần (LMS)</h1>
          <p className="page-subtitle">
            Tham gia lớp bằng mã do giảng viên cung cấp để làm bài tập theo tuần và theo dõi điểm.
          </p>
        </div>

        <div className="page-controls">
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              className="form-input mono"
              style={{ width: 150 }}
              placeholder="Mã lớp (6 ký tự)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={12}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Tham gia
            </button>
          </form>

          {isTeacher && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <IconPlus size={14} />
              <span>Tạo lớp</span>
            </button>
          )}
        </div>
      </div>

      <div className="surface-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải danh sách lớp học...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="empty-state">
            <p>Bạn chưa tham gia lớp học nào. Nhập mã lớp ở góc trên để tham gia.</p>
          </div>
        ) : (
          <div className="problem-list">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="problem-item"
                onClick={() => onSelectClassroom(c.id)}
              >
                <div className="problem-item-main">
                  <span className="tag-pill mono">{c.joinCode}</span>
                  <span className="problem-title">{c.name}</span>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>GV: {c.teacherName}</span>
                </div>
                <div className="problem-item-meta">
                  <span className="tag-pill">{c.memberCount} SV</span>
                  <span className="tag-pill">{c.assignmentCount} bài tập</span>
                  {isTeacher && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClassroom(c.id);
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
          <div className="modal-panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo lớp học phần mới</h3>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Tên lớp học *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Cấu trúc dữ liệu & Giải thuật - 24SE1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <div className="form-actions-end">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Tạo lớp
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
