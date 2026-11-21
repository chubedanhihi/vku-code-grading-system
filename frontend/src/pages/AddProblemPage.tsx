import { useState } from "react";
import type { CheckerMode, Difficulty } from "../types";

interface AddProblemPageProps {
  onCreate: (payload: {
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
  onCancel: () => void;
}

export function AddProblemPage({ onCreate, onCancel }: AddProblemPageProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [checkerMode, setCheckerMode] = useState<CheckerMode>("EXACT");
  const [tags, setTags] = useState("");
  const [studyPlan, setStudyPlan] = useState("");
  const [editorial, setEditorial] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    const ok = await onCreate({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      timeLimit,
      memoryLimit,
      checkerMode,
      tags: tags.trim(),
      studyPlan: studyPlan.trim(),
      editorial: editorial.trim(),
    });
    setSaving(false);
    if (ok) {
      setTitle("");
      setDescription("");
      setTags("");
      setStudyPlan("");
      setEditorial("");
    }
  };

  return (
    <div className="page-container narrow fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tạo bài tập mới</h1>
          <p className="page-subtitle">Dành cho Giảng viên — sau khi tạo, hãy thêm bộ test case.</p>
        </div>
      </div>

      <div className="surface-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-title">
              Tiêu đề bài tập *
            </label>
            <input
              id="inp-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Tìm ước chung lớn nhất"
              maxLength={255}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-desc">
              Mô tả đề bài (hỗ trợ Markdown) *
            </label>
            <textarea
              id="inp-desc"
              className="form-textarea"
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả bài toán, Input/Output format, ràng buộc và ví dụ..."
              required
            />
          </div>

          <div className="form-grid-4">
            <div className="form-group">
              <label className="form-label" htmlFor="inp-diff">
                Độ khó
              </label>
              <select
                id="inp-diff"
                className="form-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inp-tl">
                Time Limit (ms)
              </label>
              <input
                id="inp-tl"
                type="number"
                className="form-input"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={100}
                max={10000}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inp-ml">
                Memory (MB)
              </label>
              <input
                id="inp-ml"
                type="number"
                className="form-input"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                min={16}
                max={1024}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inp-checker">
                Chế độ so khớp
              </label>
              <select
                id="inp-checker"
                className="form-select"
                value={checkerMode}
                onChange={(e) => setCheckerMode(e.target.value as CheckerMode)}
              >
                <option value="EXACT">Chính xác (EXACT)</option>
                <option value="FLOAT_1E6">Số thực (1e-6)</option>
                <option value="FLOAT_1E4">Số thực (1e-4)</option>
                <option value="TOKENS_IGNORE_CASE">Token (không phân biệt hoa/thường)</option>
              </select>
            </div>
          </div>

          <div className="tc-io-grid">
            <div className="form-group">
              <label className="form-label">Chủ đề (cách nhau bởi dấu phẩy)</label>
              <input
                type="text"
                className="form-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="VD: Array, Math, DP"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lộ trình học (Study Plan)</label>
              <input
                type="text"
                className="form-input"
                value={studyPlan}
                onChange={(e) => setStudyPlan(e.target.value)}
                placeholder="VD: Cơ bản năm nhất"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Lời giải mẫu / Editorial (chỉ mở sau khi sinh viên AC)</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              placeholder="Hướng dẫn thuật toán, độ phức tạp và code tham khảo (Markdown)..."
            />
          </div>

          <div className="form-actions-end">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Hủy
            </button>
            <button id="btn-save-problem" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu bài tập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
