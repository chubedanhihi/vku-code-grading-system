import { useEffect, useState } from "react";
import type { Problem, UserProfile, View } from "../types";
import { IconArrowRight, IconSearch, IconX } from "./Icons";

interface CommandPaletteProps {
  open: boolean;
  problems: Problem[];
  user: UserProfile | null;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onSelectProblem: (p: Problem) => void;
}

export function CommandPalette({
  open,
  problems,
  user,
  onClose,
  onNavigate,
  onSelectProblem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const basePages: Array<{ label: string; view: View }> = [
    { label: "Trang chủ", view: "home" },
    { label: "Danh sách bài tập", view: "problems" },
    { label: "Kỳ thi & Assignment", view: "contests" },
    { label: "Bảng xếp hạng", view: "leaderboard" },
  ];
  if (user) basePages.push({ label: "Hồ sơ cá nhân", view: "profile" });
  if (user?.role === "TEACHER" || user?.role === "ADMIN") {
    basePages.push({ label: "Tạo bài tập mới", view: "add-problem" });
  }
  const pages = basePages.filter((p) => !q || p.label.toLowerCase().includes(q));

  const matchedProblems = problems
    .filter((p) => !q || p.title.toLowerCase().includes(q) || String(p.id) === q)
    .slice(0, 6);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel cmd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-search-bar">
          <IconSearch size={16} className="muted" />
          <input
            autoFocus
            type="text"
            className="cmd-input"
            placeholder="Tìm bài tập hoặc chuyển trang... (Esc để đóng)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="icon-btn" onClick={onClose}>
            <IconX size={15} />
          </button>
        </div>

        <div className="cmd-list">
          {pages.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-title">Điều hướng</div>
              {pages.map((p) => (
                <button
                  key={p.view}
                  type="button"
                  className="cmd-item"
                  onClick={() => {
                    onNavigate(p.view);
                    onClose();
                  }}
                >
                  <span>{p.label}</span>
                  <IconArrowRight size={13} className="muted" />
                </button>
              ))}
            </div>
          )}

          {matchedProblems.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-title">Bài tập</div>
              {matchedProblems.map((prob) => (
                <button
                  key={prob.id}
                  type="button"
                  className="cmd-item"
                  onClick={() => {
                    onSelectProblem(prob);
                    onClose();
                  }}
                >
                  <span>
                    <span className="mono muted" style={{ marginRight: 8 }}>
                      #{prob.id}
                    </span>
                    {prob.title}
                  </span>
                  <span className={`diff-badge diff-${prob.difficulty.toLowerCase()}`}>
                    {prob.difficulty}
                  </span>
                </button>
              ))}
            </div>
          )}

          {pages.length === 0 && matchedProblems.length === 0 && (
            <div className="empty-state compact">
              <p>Không tìm thấy kết quả phù hợp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
