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

interface TestCase {
  id: number;
  problemId: number;
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  // State quản lý TestCases của bài tập đang chọn
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [tcInput, setTcInput] = useState("");
  const [tcOutput, setTcOutput] = useState("");
  const [tcSample, setTcSample] = useState(true);

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
      if (!response.ok) throw new Error("Không thể tải danh sách bài tập");
      const data = await response.json();
      setProblems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối Backend");
    } finally {
      setLoading(false);
    }
  };

  const fetchTestCases = async (problemId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/testcases/problem/${problemId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (err) {
      console.error("Lỗi tải test cases:", err);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleSelectProblem = (prob: Problem) => {
    setSelectedProblem(prob);
    fetchTestCases(prob.id);
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

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
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !tcInput.trim() || !tcOutput.trim()) return;

    const response = await fetch("http://localhost:8080/api/testcases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: selectedProblem.id,
        input: tcInput,
        expectedOutput: tcOutput,
        isSample: tcSample,
      }),
    });

    if (response.ok) {
      setTcInput("");
      setTcOutput("");
      fetchTestCases(selectedProblem.id);
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
                        onClick={() => handleSelectProblem(prob)}
                      >
                        Xem đề & TestCase
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cột phải: Chi tiết bài tập + Quản lý TestCase & Form thêm bài tập */}
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

              <hr style={{ borderColor: "#334155", margin: "16px 0" }} />
              <h4>Bộ Test Cases ({testCases.length})</h4>
              {testCases.map((tc, index) => (
                <div
                  key={tc.id}
                  className="detail-desc"
                  style={{ fontSize: "0.85rem" }}
                >
                  <strong>
                    Test #{index + 1} {tc.isSample ? "(Mẫu)" : "(Ẩn)"}:
                  </strong>
                  <div>
                    Input: <code>{tc.input}</code>
                  </div>
                  <div>
                    Output: <code>{tc.expectedOutput}</code>
                  </div>
                </div>
              ))}

              <form
                onSubmit={handleCreateTestCase}
                style={{ marginTop: "12px" }}
              >
                <div className="form-group">
                  <label>Thêm Input mới:</label>
                  <input
                    type="text"
                    value={tcInput}
                    onChange={(e) => setTcInput(e.target.value)}
                    placeholder="VD: 3 5"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Expected Output (Kết quả đúng):</label>
                  <input
                    type="text"
                    value={tcOutput}
                    onChange={(e) => setTcOutput(e.target.value)}
                    placeholder="VD: 8"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-submit"
                  style={{ marginBottom: "10px" }}
                >
                  + Thêm Test Case
                </button>
              </form>

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
                  rows={3}
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
