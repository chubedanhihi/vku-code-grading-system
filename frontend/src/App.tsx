import { useEffect, useState } from "react";
import "./App.css";

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimit: number;
  memoryLimit: number;
  createdAt: string;
}

function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  // State cho form thêm bài tập mới
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">(
    "EASY",
  );

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8080/api/problems");
      if (!response.ok) {
        throw new Error("Không thể tải danh sách bài tập từ Server");
      }
      const data = await response.json();
      setProblems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối Backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      const response = await fetch("http://localhost:8080/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          timeLimit: 1000,
          memoryLimit: 256,
        }),
      });

      if (response.ok) {
        setTitle("");
        setDescription("");
        setDifficulty("EASY");
        fetchProblems();
      }
    } catch (err) {
      alert("Lỗi khi thêm bài tập mới!");
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>VKU Code Grading System</h1>
        <p>Hệ thống chấm bài lập trình tự động</p>
      </header>

      <div className="main-layout">
        {/* Cột trái: Danh sách bài tập */}
        <div className="card problem-list-section">
          <h2>Danh sách bài tập ({problems.length})</h2>

          {loading && <p>Đang tải dữ liệu...</p>}
          {error && (
            <p className="error-msg">
              {error} (Hãy đảm bảo Spring Boot đang chạy ở cổng 8080)
            </p>
          )}

          {!loading && !error && (
            <table className="problem-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên bài tập</th>
                  <th>Độ khó</th>
                  <th>Giới hạn</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((prob) => (
                  <tr key={prob.id}>
                    <td>#{prob.id}</td>
                    <td className="problem-title">{prob.title}</td>
                    <td>
                      <span
                        className={`badge badge-${prob.difficulty.toLowerCase()}`}
                      >
                        {prob.difficulty}
                      </span>
                    </td>
                    <td>
                      {prob.timeLimit}ms / {prob.memoryLimit}MB
                    </td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => setSelectedProblem(prob)}
                      >
                        Xem đề
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cột phải: Chi tiết bài tập & Form thêm bài tập */}
        <div className="side-panel">
          {selectedProblem && (
            <div className="card detail-card">
              <h3>
                #{selectedProblem.id}. {selectedProblem.title}
              </h3>
              <p className="detail-meta">
                Độ khó: <strong>{selectedProblem.difficulty}</strong> | Thời
                gian: {selectedProblem.timeLimit}ms | Bộ nhớ:{" "}
                {selectedProblem.memoryLimit}MB
              </p>
              <div className="detail-desc">{selectedProblem.description}</div>
              <button
                className="btn-close"
                onClick={() => setSelectedProblem(null)}
              >
                Đóng chi tiết
              </button>
            </div>
          )}

          <div className="card form-card">
            <h3>Thêm bài tập mới</h3>
            <form onSubmit={handleCreateProblem}>
              <div className="form-group">
                <label>Tiêu đề bài tập:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Tìm ước chung lớn nhất"
                  required
                />
              </div>

              <div className="form-group">
                <label>Độ khó:</label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")
                  }
                >
                  <option value="EASY">EASY (Dễ)</option>
                  <option value="MEDIUM">MEDIUM (Trung bình)</option>
                  <option value="HARD">HARD (Khó)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Mô tả đề bài:</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập nội dung chi tiết đề bài..."
                  required
                />
              </div>

              <button type="submit" className="btn-submit">
                + Lưu bài tập vào MySQL
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
