import { useState } from "react";
import type { Difficulty } from "../types";

interface AddProblemPageProps {
  onCreate: (payload: {
    title: string;
    description: string;
    difficulty: Difficulty;
    timeLimit: number;
    memoryLimit: number;
  }) => Promise<boolean>;
  onCancel: () => void;
}

export function AddProblemPage({ onCreate, onCancel }: AddProblemPageProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
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
    });
    setSaving(false);
    if (ok) {
      setTitle("");
      setDescription("");
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

          <div className="form-grid-3">
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
                Memory Limit (MB)
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
