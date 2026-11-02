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

interface Submission {
  id: number;
  userId: number;
  problemId: number;
  language: string;
  sourceCode: string;
  status: string;
  executionTime: number;
  submittedAt: string;
}

const DEFAULT_CODE: Record<string, string> = {
  CPP: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << a + b;\n    }\n    return 0;\n}`,
  JAVA: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(a + b);\n        }\n    }\n}`,
  PYTHON: `import sys\n\ndata = sys.stdin.read().split()\nif len(data) >= 2:\n    print(int(data[0]) + int(data[1]))`,
};

function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  // State quản lý TestCases
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [tcInput, setTcInput] = useState("");
  const [tcOutput, setTcOutput] = useState("");

  // State quản lý Nộp code & Lịch sử chấm
  const [language, setLanguage] = useState<"CPP" | "JAVA" | "PYTHON">("CPP");
  const [sourceCode, setSourceCode] = useState<string>(DEFAULT_CODE.CPP);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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
        setTestCases(await response.json());
      }
    } catch (err) {
      console.error("Lỗi tải test cases:", err);
    }
  };

  const fetchSubmissions = async (problemId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/submissions/problem/${problemId}`,
      );
      if (response.ok) {
        setSubmissions(await response.json());
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử nộp bài:", err);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleSelectProblem = (prob: Problem) => {
    setSelectedProblem(prob);
    fetchTestCases(prob.id);
    fetchSubmissions(prob.id);
  };

  const handleLanguageChange = (lang: "CPP" | "JAVA" | "PYTHON") => {
    setLanguage(lang);
    setSourceCode(DEFAULT_CODE[lang]);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !sourceCode.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch("http://localhost:8080/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language,
          sourceCode,
        }),
      });

      if (response.ok) {
        fetchSubmissions(selectedProblem.id);
      }
    } catch (err) {
      alert("Lỗi khi nộp bài!");
    } finally {
      setSubmitting(false);
    }
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
        isSample: true,
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
        {/* Cột trái: Danh sách bài tập + Khung nộp code & Lịch sử chấm */}
        <div className="left-column">
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
                          Làm bài & TestCase
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedProblem && (
            <div className="card editor-card">
              <h3>
                Nộp bài: #{selectedProblem.id}. {selectedProblem.title}
              </h3>
              <form onSubmit={handleSubmitCode}>
                <div className="form-group">
                  <label>Chọn ngôn ngữ lập trình:</label>
                  <select
                    value={language}
                    onChange={(e) =>
                      handleLanguageChange(
                        e.target.value as "CPP" | "JAVA" | "PYTHON",
                      )
                    }
                  >
                    <option value="CPP">C++ (g++)</option>
                    <option value="JAVA">Java (JDK 17)</option>
                    <option value="PYTHON">Python 3</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mã nguồn (Source Code):</label>
                  <textarea
                    className="code-editor"
                    rows={10}
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Đang biên dịch & chấm bài..."
                    : "🚀 Nộp bài (Submit Code)"}
                </button>
              </form>

              <hr style={{ borderColor: "#334155", margin: "20px 0" }} />
              <h4>Lịch sử nộp bài ({submissions.length})</h4>
              {submissions.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                  Chưa có bài nộp nào cho câu hỏi này.
                </p>
              ) : (
                <table className="problem-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ngôn ngữ</th>
                      <th>Trạng thái (Verdict)</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>#{sub.id}</td>
                        <td>{sub.language}</td>
                        <td>
                          <span
                            className={`verdict verdict-${sub.status.toLowerCase()}`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td>{sub.executionTime} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Cột phải: Chi tiết đề + Quản lý TestCase & Thêm bài tập */}
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
                  <strong>Test #{index + 1}:</strong>
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
                  <label>Expected Output (Đáp án đúng):</label>
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
