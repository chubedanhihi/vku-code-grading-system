import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

// ===========================
// Types
// ===========================
interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimit: number;
  memoryLimit: number;
  createdBy?: number;
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
  memoryUsed: number;
  errorMessage?: string;
  submittedAt: string;
}

// ===========================
// Constants
// ===========================
const API = "http://localhost:8080/api";

type Lang = "CPP" | "JAVA" | "PYTHON";

const LANG_META: Record<Lang, { label: string; monacoLang: string; default: string }> = {
  CPP: {
    label: "C++ (g++)",
    monacoLang: "cpp",
    default: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    cout << "Hello, World!" << endl;
    return 0;
}`,
  },
  JAVA: {
    label: "Java (JDK 17)",
    monacoLang: "java",
    default: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        // Write your solution here
        System.out.println("Hello, World!");
    }
}`,
  },
  PYTHON: {
    label: "Python 3",
    monacoLang: "python",
    default: `# Write your solution here
print("Hello, World!")`,
  },
};

const VERDICT_ICONS: Record<string, string> = {
  ACCEPTED: "✅",
  WRONG_ANSWER: "❌",
  COMPILE_ERROR: "🔧",
  RUNTIME_ERROR: "💥",
  TIME_LIMIT_EXCEEDED: "⏱️",
  PENDING: "⏳",
};

// ===========================
// App Views
// ===========================
type View = "problems" | "submit" | "add-problem" | "login" | "register";

// ===========================
// Main App
// ===========================
function App() {
  const [view, setView] = useState<View>("problems");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("vku_judge_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* empty */
      }
    }
    return null;
  });

  // Login Form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register Form
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [regLoading, setRegLoading] = useState(false);

  // Problem detail / submit view
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subFilter, setSubFilter] = useState<"all" | "my">("all");

  // Code editor
  const [lang, setLang] = useState<Lang>("CPP");
  const [code, setCode] = useState(LANG_META.CPP.default);
  const [submitting, setSubmitting] = useState(false);
  const [judgingId, setJudgingId] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add problem form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDiff, setNewDiff] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [newTimeLimit, setNewTimeLimit] = useState(1000);
  const [newMemLimit, setNewMemLimit] = useState(256);
  const [savingProblem, setSavingProblem] = useState(false);

  // Add test case form
  const [tcInput, setTcInput] = useState("");
  const [tcOutput, setTcOutput] = useState("");
  const [tcSample, setTcSample] = useState(true);

  // ===========================
  // API Calls
  // ===========================
  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/problems`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      setProblems(await res.json());
      setConnError(null);
    } catch {
      setConnError("Không kết nối được Backend (port 8080). Hãy đảm bảo Spring Boot đang chạy.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTestCases = useCallback(async (problemId: number) => {
    try {
      const res = await fetch(`${API}/testcases/problem/${problemId}`);
      if (res.ok) setTestCases(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  const fetchSubmissions = useCallback(async (problemId: number, filter: "all" | "my", currentUserId?: number) => {
    try {
      let url = `${API}/submissions/problem/${problemId}`;
      if (filter === "my" && currentUserId) {
        url = `${API}/submissions/problem/${problemId}/user/${currentUserId}`;
      }
      const res = await fetch(url);
      if (res.ok) setSubmissions(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // ===========================
  // Authentication Actions
  // ===========================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      toast.error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Đăng nhập thất bại!");
        return;
      }
      const userProfile: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
      };
      setUser(userProfile);
      localStorage.setItem("vku_judge_user", JSON.stringify(userProfile));
      toast.success(`Chào mừng ${userProfile.username}! (${userProfile.role === "TEACHER" ? "Giảng viên" : "Sinh viên"})`);
      setLoginUsername("");
      setLoginPassword("");
      setView("problems");
    } catch {
      toast.error("Lỗi kết nối tới máy chủ khi đăng nhập!");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      toast.error("Vui lòng điền đầy đủ các thông tin!");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: regRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Đăng ký thất bại!");
        return;
      }
      const userProfile: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
      };
      setUser(userProfile);
      localStorage.setItem("vku_judge_user", JSON.stringify(userProfile));
      toast.success("Tạo tài khoản thành công! Đã tự động đăng nhập.");
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      setView("problems");
    } catch {
      toast.error("Lỗi kết nối tới máy chủ khi đăng ký!");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("vku_judge_user");
    toast.success("Đã đăng xuất thành công!");
    setView("problems");
  };

  const fillQuickDemo = (role: "student" | "teacher") => {
    if (role === "student") {
      setLoginUsername("demo_student");
      setLoginPassword("123456");
    } else {
      setLoginUsername("demo_teacher");
      setLoginPassword("123456");
    }
    toast("Đã điền tài khoản mẫu!", { icon: "⚡" });
  };

  // ===========================
  // Problem Selection
  // ===========================
  const handleSelectProblem = (prob: Problem) => {
    setSelectedProblem(prob);
    setTestCases([]);
    setSubmissions([]);
    setSubFilter("all");
    setView("submit");
    fetchTestCases(prob.id);
    fetchSubmissions(prob.id, "all");
  };

  // ===========================
  // Language Change
  // ===========================
  const handleLangChange = (l: Lang) => {
    setLang(l);
    setCode(LANG_META[l].default);
  };

  // ===========================
  // Submit Code + Polling
  // ===========================
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (submissionId: number, problemId: number) => {
    setJudgingId(submissionId);
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/submissions/${submissionId}`);
        if (!res.ok) return;
        const sub: Submission = await res.json();

        if (sub.status !== "PENDING") {
          stopPolling();
          setJudgingId(null);
          fetchSubmissions(problemId, subFilter, user?.id);

          // Show result toast
          if (sub.status === "ACCEPTED") {
            toast.success(`✅ ACCEPTED — ${sub.executionTime}ms`, {
              style: { background: "#111827", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" },
              duration: 4000,
            });
          } else {
            toast.error(`${VERDICT_ICONS[sub.status] ?? "❓"} ${sub.status.replace(/_/g, " ")}`, {
              style: { background: "#111827", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" },
              duration: 4000,
            });
          }
        }
      } catch {
        /* silent */
      }
    }, 1500);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !code.trim() || submitting) return;

    if (!user) {
      toast("Vui lòng đăng nhập để lưu kết quả nộp bài vào hồ sơ cá nhân!", {
        icon: "💡",
        duration: 4000,
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? 1,
          problemId: selectedProblem.id,
          language: lang,
          sourceCode: code,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");
      const sub: Submission = await res.json();

      toast("⏳ Đang biên dịch và chấm bài...", {
        style: { background: "#111827", color: "#818cf8", border: "1px solid rgba(129,140,248,0.3)" },
        duration: 10000,
      });

      startPolling(sub.id, selectedProblem.id);
    } catch {
      toast.error("Lỗi khi nộp bài! Kiểm tra kết nối Backend.");
    } finally {
      setSubmitting(false);
    }
  };

  // ===========================
  // Add Problem (Teacher / Admin only)
  // ===========================
  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      toast.error("Chỉ Giảng viên mới có quyền tạo đề bài mới!");
      return;
    }
    if (!newTitle.trim() || !newDesc.trim()) return;
    setSavingProblem(true);

    try {
      const res = await fetch(`${API}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          difficulty: newDiff,
          timeLimit: newTimeLimit,
          memoryLimit: newMemLimit,
          createdBy: user.id,
        }),
      });

      if (!res.ok) throw new Error();
      setNewTitle("");
      setNewDesc("");
      setNewDiff("EASY");
      setNewTimeLimit(1000);
      setNewMemLimit(256);
      await fetchProblems();
      setView("problems");
      toast.success("✅ Đã thêm bài tập mới!", {
        style: { background: "#111827", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" },
      });
    } catch {
      toast.error("Lỗi khi thêm bài tập!");
    } finally {
      setSavingProblem(false);
    }
  };

  // ===========================
  // Add Test Case
  // ===========================
  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem || !tcInput.trim() || !tcOutput.trim()) return;

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      toast.error("Chỉ Giảng viên mới có quyền thêm test cases!");
      return;
    }

    try {
      const res = await fetch(`${API}/testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          input: tcInput,
          expectedOutput: tcOutput,
          isSample: tcSample,
        }),
      });

      if (!res.ok) throw new Error();
      setTcInput("");
      setTcOutput("");
      await fetchTestCases(selectedProblem.id);
      toast.success("Test case đã được thêm!", {
        style: { background: "#111827", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" },
      });
    } catch {
      toast.error("Lỗi khi thêm test case!");
    }
  };

  // ===========================
  // Delete Test Case
  // ===========================
  const handleDeleteTestCase = async (id: number) => {
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      toast.error("Chỉ Giảng viên mới có quyền xóa test case!");
      return;
    }
    try {
      await fetch(`${API}/testcases/${id}`, { method: "DELETE" });
      if (selectedProblem) fetchTestCases(selectedProblem.id);
      toast.success("Đã xóa test case");
    } catch {
      toast.error("Lỗi khi xóa!");
    }
  };

  // ===========================
  // Delete Problem
  // ===========================
  const handleDeleteProblem = async (id: number) => {
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      toast.error("Chỉ Giảng viên mới có quyền xóa bài tập!");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa bài tập này không?")) return;
    try {
      await fetch(`${API}/problems/${id}`, { method: "DELETE" });
      await fetchProblems();
      toast.success("Đã xóa bài tập!");
      if (selectedProblem?.id === id) {
        setSelectedProblem(null);
        setView("problems");
      }
    } catch {
      toast.error("Lỗi khi xóa!");
    }
  };

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), []);

  // Format date helper
  const fmtDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("vi-VN", { hour12: false });
    } catch {
      return d;
    }
  };

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  // ===========================
  // RENDER
  // ===========================
  return (
    <div className="app-wrapper">
      <Toaster position="top-right" />

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand" onClick={() => setView("problems")}>
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <span className="brand-name">VKU Judge</span>
              <span className="brand-subtitle">Code Grading System</span>
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              id="nav-problems"
              className={`nav-tab ${view === "problems" ? "active" : ""}`}
              onClick={() => setView("problems")}
            >
              📋 Bài tập
            </button>
            {selectedProblem && (
              <button
                id="nav-submit"
                className={`nav-tab ${view === "submit" ? "active" : ""}`}
                onClick={() => setView("submit")}
              >
                💻 Làm bài
              </button>
            )}
            {isTeacherOrAdmin && (
              <button
                id="nav-add"
                className={`nav-tab ${view === "add-problem" ? "active" : ""}`}
                onClick={() => setView("add-problem")}
              >
                ➕ Thêm bài
              </button>
            )}
          </nav>

          {/* User Auth Section */}
          <div className="header-auth">
            {user ? (
              <div className="user-profile-chip">
                <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.username}</span>
                <span className={`user-role-tag ${user.role === "TEACHER" ? "role-teacher" : "role-student"}`}>
                  {user.role === "TEACHER" ? "Giảng viên" : "Sinh viên"}
                </span>
                <button
                  id="btn-logout"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "2px 8px", fontSize: "0.75rem", marginLeft: 4 }}
                  onClick={handleLogout}
                  title="Đăng xuất"
                >
                  🚪 Thoát
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  id="btn-nav-login"
                  className={`btn btn-sm ${view === "login" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setView("login")}
                >
                  🔑 Đăng nhập
                </button>
                <button
                  id="btn-nav-register"
                  className={`btn btn-sm ${view === "register" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setView("register")}
                >
                  📝 Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="app-main">

        {/* ========== VIEW: LOGIN ========== */}
        {view === "login" && (
          <div className="auth-wrapper">
            <div className="card">
              <div className="auth-header">
                <div className="auth-icon">🔐</div>
                <h2 className="auth-title">Đăng nhập tài khoản</h2>
                <p className="auth-desc">Đăng nhập để làm bài, nộp code và theo dõi tiến độ học tập</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập hoặc Email</label>
                  <input
                    id="inp-login-username"
                    type="text"
                    className="form-input"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="VD: demo_student hoặc student@vku.edu.vn"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    id="inp-login-password"
                    type="password"
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className={`btn btn-primary ${loginLoading ? "btn-loading" : ""}`}
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={loginLoading}
                >
                  {!loginLoading && "🚀 Đăng nhập"}
                </button>
              </form>

              {/* Quick Demo Logins */}
              <div className="quick-demo-box">
                <div className="quick-demo-title">
                  <span>⚡ Tài khoản thử nghiệm nhanh (1-Click)</span>
                </div>
                <div className="quick-demo-btns">
                  <button
                    type="button"
                    className="quick-demo-btn"
                    onClick={() => fillQuickDemo("student")}
                  >
                    👨‍🎓 Sinh viên (demo_student)
                  </button>
                  <button
                    type="button"
                    className="quick-demo-btn"
                    onClick={() => fillQuickDemo("teacher")}
                  >
                    👨‍🏫 Giảng viên (demo_teacher)
                  </button>
                </div>
              </div>

              <div className="auth-switch">
                Chưa có tài khoản?
                <a onClick={() => setView("register")}>Đăng ký ngay</a>
              </div>
            </div>
          </div>
        )}

        {/* ========== VIEW: REGISTER ========== */}
        {view === "register" && (
          <div className="auth-wrapper">
            <div className="card">
              <div className="auth-header">
                <div className="auth-icon">📝</div>
                <h2 className="auth-title">Tạo tài khoản mới</h2>
                <p className="auth-desc">Tham gia hệ thống chấm bài trực tuyến VKU Code Grading</p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập *</label>
                  <input
                    id="inp-reg-username"
                    type="text"
                    className="form-input"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="VD: nguyen_van_a"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ Email *</label>
                  <input
                    id="inp-reg-email"
                    type="email"
                    className="form-input"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="VD: a.nv@vku.udn.vn"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bạn là ai? (Chọn vai trò) *</label>
                  <div className="role-options">
                    <div
                      className={`role-card ${regRole === "STUDENT" ? "selected" : ""}`}
                      onClick={() => setRegRole("STUDENT")}
                    >
                      <div className="role-card-icon">👨‍🎓</div>
                      <div className="role-card-title">Sinh viên</div>
                      <div className="role-card-desc">Làm bài & nộp code</div>
                    </div>
                    <div
                      className={`role-card ${regRole === "TEACHER" ? "selected" : ""}`}
                      onClick={() => setRegRole("TEACHER")}
                    >
                      <div className="role-card-icon">👨‍🏫</div>
                      <div className="role-card-title">Giảng viên</div>
                      <div className="role-card-desc">Tạo bài & test cases</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu (ít nhất 6 ký tự) *</label>
                  <input
                    id="inp-reg-password"
                    type="password"
                    className="form-input"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu *</label>
                  <input
                    id="inp-reg-confirm"
                    type="password"
                    className="form-input"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  id="btn-submit-register"
                  type="submit"
                  className={`btn btn-success ${regLoading ? "btn-loading" : ""}`}
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={regLoading}
                >
                  {!regLoading && "✨ Hoàn tất đăng ký"}
                </button>
              </form>

              <div className="auth-switch">
                Đã có tài khoản?
                <a onClick={() => setView("login")}>Đăng nhập</a>
              </div>
            </div>
          </div>
        )}

        {/* ========== VIEW: PROBLEM LIST ========== */}
        {view === "problems" && (
          <div className="fade-in">
            <div className="card">
              <div className="card-title">
                📋 Danh sách bài tập
                <span className="count-badge">{problems.length}</span>
              </div>

              {loading && (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Đang tải dữ liệu...</p>
                </div>
              )}

              {connError && (
                <div className="error-box">
                  <span>⚠️</span>
                  <span>{connError}</span>
                </div>
              )}

              {!loading && !connError && problems.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>Chưa có bài tập nào. Hãy thêm bài tập mới!</p>
                </div>
              )}

              {!loading && !connError && problems.length > 0 && (
                <div className="problems-grid">
                  {problems.map((prob) => (
                    <div
                      key={prob.id}
                      id={`problem-row-${prob.id}`}
                      className={`problem-row ${selectedProblem?.id === prob.id ? "selected" : ""}`}
                      onClick={() => handleSelectProblem(prob)}
                    >
                      <span className="problem-id">#{prob.id}</span>
                      <span className="problem-name">{prob.title}</span>
                      <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                        {prob.difficulty}
                      </span>
                      <span className="problem-limits">
                        ⏱ {prob.timeLimit}ms &nbsp; 💾 {prob.memoryLimit}MB
                      </span>
                      <button
                        id={`btn-view-${prob.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProblem(prob);
                        }}
                      >
                        Làm bài →
                      </button>
                      {isTeacherOrAdmin && (
                        <button
                          id={`btn-delete-${prob.id}`}
                          className="btn btn-danger btn-sm"
                          title="Xóa bài tập (Quyền Giảng viên)"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProblem(prob.id);
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== VIEW: SUBMIT / PROBLEM DETAIL ========== */}
        {view === "submit" && selectedProblem && (
          <div className="fade-in">
            <button className="back-btn" onClick={() => setView("problems")}>
              ← Quay lại danh sách
            </button>

            <div className="problem-view">
              {/* ---- Left: Problem description + Test Cases ---- */}
              <div>
                {/* Problem Info */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-title">
                    #{selectedProblem.id}. {selectedProblem.title}
                  </div>
                  <div className="problem-meta-row">
                    <span className={`badge badge-${selectedProblem.difficulty.toLowerCase()}`}>
                      {selectedProblem.difficulty}
                    </span>
                    <span className="meta-chip">⏱ {selectedProblem.timeLimit} ms</span>
                    <span className="meta-chip">💾 {selectedProblem.memoryLimit} MB</span>
                  </div>
                  <div className="problem-description">{selectedProblem.description}</div>
                </div>

                {/* Test Cases */}
                <div className="card">
                  <div className="section-header">
                    <div className="section-title">
                      🧪 Test Cases
                      <span className="count-badge">{testCases.length}</span>
                    </div>
                  </div>

                  {testCases.length === 0 ? (
                    <div className="empty-state" style={{ padding: "24px 0" }}>
                      <p>Chưa có test case nào.</p>
                    </div>
                  ) : (
                    testCases.map((tc, idx) => (
                      <div key={tc.id} className="testcase-item">
                        <div className="testcase-header">
                          <span className="testcase-label">
                            Test #{idx + 1} {tc.isSample ? "🔓 Sample" : "🔒 Hidden"}
                          </span>
                          {isTeacherOrAdmin && (
                            <button
                              id={`btn-del-tc-${tc.id}`}
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteTestCase(tc.id)}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                        <div className="testcase-data">
                          <div className="testcase-field">
                            <label>Input</label>
                            <code>{tc.input || "(trống)"}</code>
                          </div>
                          <div className="testcase-field">
                            <label>Expected Output</label>
                            <code>{tc.expectedOutput}</code>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add Test Case Form (Giảng viên) */}
                  {isTeacherOrAdmin && (
                    <>
                      <div className="divider" />
                      <div className="section-title" style={{ marginBottom: 12 }}>➕ Thêm Test Case (Giảng viên)</div>
                      <form onSubmit={handleCreateTestCase}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div className="form-group">
                            <label className="form-label">Input</label>
                            <textarea
                              id="tc-input"
                              className="form-textarea"
                              rows={2}
                              value={tcInput}
                              onChange={(e) => setTcInput(e.target.value)}
                              placeholder="VD: 3 5"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expected Output</label>
                            <textarea
                              id="tc-output"
                              className="form-textarea"
                              rows={2}
                              value={tcOutput}
                              onChange={(e) => setTcOutput(e.target.value)}
                              placeholder="VD: 8"
                              required
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                            <input type="checkbox" checked={tcSample} onChange={(e) => setTcSample(e.target.checked)} />
                            Test mẫu (hiển thị cho sinh viên)
                          </label>
                        </div>
                        <button id="btn-add-tc" type="submit" className="btn btn-ghost" style={{ width: "100%" }}>
                          + Thêm Test Case
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              {/* ---- Right: Code Editor + Submit + History ---- */}
              <div>
                {/* Code Editor */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-title">💻 Nộp bài</div>

                  <form onSubmit={handleSubmitCode}>
                    {/* Language selector */}
                    <div className="editor-wrapper">
                      <div className="editor-toolbar">
                        {(["CPP", "JAVA", "PYTHON"] as Lang[]).map((l) => (
                          <button
                            key={l}
                            id={`lang-btn-${l.toLowerCase()}`}
                            type="button"
                            className={`lang-btn ${lang === l ? "active" : ""}`}
                            onClick={() => handleLangChange(l)}
                          >
                            {LANG_META[l].label}
                          </button>
                        ))}
                      </div>

                      {/* Monaco Editor */}
                      <Editor
                        height="340px"
                        language={LANG_META[lang].monacoLang}
                        value={code}
                        onChange={(v) => setCode(v ?? "")}
                        theme="vs-dark"
                        options={{
                          fontSize: 14,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          lineNumbersMinChars: 3,
                          padding: { top: 12, bottom: 12 },
                          scrollbar: { verticalScrollbarSize: 6 },
                          bracketPairColorization: { enabled: true },
                          automaticLayout: true,
                        }}
                      />
                    </div>

                    {/* Submit button */}
                    <div style={{ marginTop: 14 }}>
                      {judgingId ? (
                        <div className="judging-indicator">
                          <div className="judging-dots">
                            <span /><span /><span />
                          </div>
                          Đang biên dịch và chấm bài (#{judgingId})...
                        </div>
                      ) : (
                        <button
                          id="btn-submit-code"
                          type="submit"
                          className={`btn btn-success ${submitting ? "btn-loading" : ""}`}
                          disabled={submitting || !code.trim()}
                        >
                          {!submitting && "🚀 Nộp bài (Submit Code)"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Submission History */}
                <div className="card">
                  <div className="section-header">
                    <div className="section-title">
                      📜 Lịch sử nộp bài
                      <span className="count-badge">{submissions.length}</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {user && (
                        <div className="sub-filter-tabs">
                          <button
                            type="button"
                            className={`sub-filter-tab ${subFilter === "all" ? "active" : ""}`}
                            onClick={() => {
                              setSubFilter("all");
                              if (selectedProblem) fetchSubmissions(selectedProblem.id, "all");
                            }}
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            className={`sub-filter-tab ${subFilter === "my" ? "active" : ""}`}
                            onClick={() => {
                              setSubFilter("my");
                              if (selectedProblem) fetchSubmissions(selectedProblem.id, "my", user.id);
                            }}
                          >
                            Của tôi
                          </button>
                        </div>
                      )}
                      <button
                        id="btn-refresh-subs"
                        className="btn btn-ghost btn-sm"
                        onClick={() => selectedProblem && fetchSubmissions(selectedProblem.id, subFilter, user?.id)}
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="empty-state" style={{ padding: "24px 0" }}>
                      <div className="empty-icon">📭</div>
                      <p>Chưa có bài nộp nào.</p>
                    </div>
                  ) : (
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Ngôn ngữ</th>
                          <th>Kết quả</th>
                          <th>Thời gian</th>
                          <th>Nộp lúc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((sub) => (
                          <tr key={sub.id} id={`sub-row-${sub.id}`}>
                            <td className="sub-id">#{sub.id}</td>
                            <td>
                              <span className="meta-chip" style={{ fontSize: "0.72rem" }}>
                                {sub.language}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`verdict verdict-${sub.status.toLowerCase()}`}
                                title={sub.errorMessage ?? ""}
                              >
                                {VERDICT_ICONS[sub.status] ?? "❓"} {sub.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="sub-time">
                              {sub.executionTime != null ? `${sub.executionTime} ms` : "—"}
                            </td>
                            <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {fmtDate(sub.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== VIEW: ADD PROBLEM (TEACHER ONLY) ========== */}
        {view === "add-problem" && (
          <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
            <div className="card">
              <div className="card-title">➕ Thêm bài tập mới (Giảng viên)</div>

              <form onSubmit={handleCreateProblem}>
                <div className="form-group">
                  <label className="form-label" htmlFor="inp-title">Tiêu đề bài tập *</label>
                  <input
                    id="inp-title"
                    type="text"
                    className="form-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: Tìm ước chung lớn nhất"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-desc">Mô tả đề bài *</label>
                  <textarea
                    id="inp-desc"
                    className="form-textarea"
                    rows={6}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Nhập nội dung chi tiết đề bài, bao gồm Input/Output format và ví dụ..."
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="inp-diff">Độ khó</label>
                    <select
                      id="inp-diff"
                      className="form-select"
                      value={newDiff}
                      onChange={(e) => setNewDiff(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                    >
                      <option value="EASY">🟢 EASY</option>
                      <option value="MEDIUM">🟡 MEDIUM</option>
                      <option value="HARD">🔴 HARD</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="inp-tl">Time Limit (ms)</label>
                    <input
                      id="inp-tl"
                      type="number"
                      className="form-input"
                      value={newTimeLimit}
                      onChange={(e) => setNewTimeLimit(Number(e.target.value))}
                      min={100}
                      max={10000}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="inp-ml">Memory Limit (MB)</label>
                    <input
                      id="inp-ml"
                      type="number"
                      className="form-input"
                      value={newMemLimit}
                      onChange={(e) => setNewMemLimit(Number(e.target.value))}
                      min={16}
                      max={1024}
                    />
                  </div>
                </div>

                <button
                  id="btn-save-problem"
                  type="submit"
                  className={`btn btn-success ${savingProblem ? "btn-loading" : ""}`}
                  disabled={savingProblem}
                >
                  {!savingProblem && "💾 Lưu bài tập vào MySQL"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
