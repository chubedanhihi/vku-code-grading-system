import { useState } from "react";
import type { Difficulty, Problem, UserProfile } from "../types";
import { IconArrowRight, IconCheck, IconClock, IconCpu, IconSearch, IconTrash } from "../components/Icons";

interface ProblemsPageProps {
  problems: Problem[];
  loading: boolean;
  connError: string | null;
  selectedProblemId?: number;
  user: UserProfile | null;
  onSelect: (p: Problem) => void;
  onDelete: (id: number) => void;
}

export function ProblemsPage({
  problems,
  loading,
  connError,
  selectedProblemId,
  user,
  onSelect,
  onDelete,
}: ProblemsPageProps) {
  const [query, setQuery] = useState("");
  const [diffFilter, setDiffFilter] = useState<"ALL" | Difficulty>("ALL");
  const [tagFilter, setTagFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const solvedCount = problems.filter((p) => p.myStatus === "SOLVED").length;
  const pct = problems.length > 0 ? Math.round((solvedCount * 100) / problems.length) : 0;

  const allTags = Array.from(
    new Set(
      problems
        .flatMap((p) => (p.tags ? p.tags.split(",") : []))
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
  const allPlans = Array.from(
    new Set(problems.map((p) => (p.studyPlan || "").trim()).filter(Boolean))
  );

  const filtered = problems.filter((p) => {
    const matchDiff = diffFilter === "ALL" || p.difficulty === diffFilter;
    const tags = (p.tags || "").split(",").map((t) => t.trim());
    const matchTag = tagFilter === "ALL" || tags.includes(tagFilter);
    const matchPlan = planFilter === "ALL" || (p.studyPlan || "").trim() === planFilter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || p.title.toLowerCase().includes(q) || String(p.id) === q;
    return matchDiff && matchTag && matchPlan && matchQuery;
  });

  return (
    <div className="page-container fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Danh sách bài tập</h1>
          <p className="page-subtitle">
            Lọc theo độ khó, chủ đề (Tags) hoặc lộ trình học tập (Study Plans).
          </p>
        </div>
        <div className="page-controls">
          <div className="search-field">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Tìm theo tên hoặc #ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {allPlans.length > 0 && (
            <select
              className="form-select"
              style={{ width: 180, padding: "7px 10px" }}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="ALL">Tất cả lộ trình</option>
              {allPlans.map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
            </select>
          )}
          <div className="filter-pills">
            {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`filter-pill ${diffFilter === d ? "active" : ""}`}
                onClick={() => setDiffFilter(d)}
              >
                {d === "ALL" ? "Tất cả" : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter-bar">
          <button
            type="button"
            className={`tag-filter-chip ${tagFilter === "ALL" ? "active" : ""}`}
            onClick={() => setTagFilter("ALL")}
          >
            Tất cả chủ đề
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag-filter-chip ${tagFilter === t ? "active" : ""}`}
              onClick={() => setTagFilter(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {user && problems.length > 0 && (
        <div className="surface-card progress-banner">
          <div className="progress-banner-head">
            <span>Tiến độ hoàn thành</span>
            <span className="mono">
              Đã giải {solvedCount} / {problems.length} bài ({pct}%)
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="surface-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải danh sách bài tập...</p>
          </div>
        ) : connError ? (
          <div className="error-box">{connError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{problems.length === 0 ? "Chưa có bài tập nào." : "Không tìm thấy bài tập phù hợp."}</p>
          </div>
        ) : (
          <div className="problem-list">
            {filtered.map((prob) => {
              const pTags = (prob.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
              return (
                <div
                  key={prob.id}
                  id={`problem-row-${prob.id}`}
                  className={`problem-item ${selectedProblemId === prob.id ? "is-selected" : ""}`}
                  onClick={() => onSelect(prob)}
                >
                  <div className="problem-item-main">
                    <span
                      className={`status-dot ${
                        prob.myStatus === "SOLVED"
                          ? "is-solved"
                          : prob.myStatus === "ATTEMPTED"
                            ? "is-attempted"
                            : ""
                      }`}
                    >
                      {prob.myStatus === "SOLVED" ? <IconCheck size={12} /> : prob.myStatus === "ATTEMPTED" ? "○" : ""}
                    </span>
                    <span className="problem-id mono">#{prob.id}</span>
                    <span className="problem-title">{prob.title}</span>
                    <span className={`diff-badge diff-${prob.difficulty.toLowerCase()}`}>
                      {prob.difficulty}
                    </span>
                    {pTags.map((t) => (
                      <span key={t} className="tag-pill">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="problem-item-meta">
                    {typeof prob.acRate === "number" && (prob.totalSubmissions ?? 0) > 0 && (
                      <span className="tag-pill">AC {prob.acRate}%</span>
                    )}
                    <span className="limit-chip">
                      <IconClock size={13} />
                      {prob.timeLimit} ms
                    </span>
                    <span className="limit-chip">
                      <IconCpu size={13} />
                      {prob.memoryLimit} MB
                    </span>
                    <button
                      id={`btn-view-${prob.id}`}
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(prob);
                      }}
                    >
                      <span>Làm bài</span>
                      <IconArrowRight size={13} />
                    </button>
                    {isTeacher && (
                      <button
                        id={`btn-delete-${prob.id}`}
                        type="button"
                        className="icon-btn danger"
                        title="Xóa bài tập"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(prob.id);
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
