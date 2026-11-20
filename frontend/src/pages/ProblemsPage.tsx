import { useState } from "react";
import type { Difficulty, Problem } from "../types";
import { IconArrowRight, IconClock, IconCpu, IconSearch, IconTrash } from "../components/Icons";

interface ProblemsPageProps {
  problems: Problem[];
  loading: boolean;
  connError: string | null;
  selectedProblemId?: number;
  isTeacher: boolean;
  onSelect: (p: Problem) => void;
  onDelete: (id: number) => void;
}

export function ProblemsPage({
  problems,
  loading,
  connError,
  selectedProblemId,
  isTeacher,
  onSelect,
  onDelete,
}: ProblemsPageProps) {
  const [query, setQuery] = useState("");
  const [diffFilter, setDiffFilter] = useState<"ALL" | Difficulty>("ALL");

  const filtered = problems.filter((p) => {
    const matchDiff = diffFilter === "ALL" || p.difficulty === diffFilter;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || p.title.toLowerCase().includes(q) || String(p.id) === q;
    return matchDiff && matchQuery;
  });

  return (
    <div className="page-container fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Danh sách bài tập</h1>
          <p className="page-subtitle">
            Chọn một bài tập để xem đề bài, viết code và chấm tự động trong sandbox.
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
            {filtered.map((prob) => (
              <div
                key={prob.id}
                id={`problem-row-${prob.id}`}
                className={`problem-item ${selectedProblemId === prob.id ? "is-selected" : ""}`}
                onClick={() => onSelect(prob)}
              >
                <div className="problem-item-main">
                  <span className="problem-id mono">#{prob.id}</span>
                  <span className="problem-title">{prob.title}</span>
                  <span className={`diff-badge diff-${prob.difficulty.toLowerCase()}`}>
                    {prob.difficulty}
                  </span>
                </div>

                <div className="problem-item-meta">
                  <span className="limit-chip" title="Giới hạn thời gian">
                    <IconClock size={13} />
                    {prob.timeLimit} ms
                  </span>
                  <span className="limit-chip" title="Giới hạn bộ nhớ">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
