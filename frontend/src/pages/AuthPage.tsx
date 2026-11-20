import { useState } from "react";
import toast from "react-hot-toast";

interface AuthPageProps {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (payload: {
    username: string;
    email: string;
    password: string;
    role: "STUDENT" | "TEACHER";
    inviteCode?: string;
  }) => Promise<void>;
}

export function AuthPage({ mode, onSwitchMode, onLogin, onRegister }: AuthPageProps) {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [inviteCode, setInviteCode] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      toast.error("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      await onLogin(loginUsername.trim(), loginPassword);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (regRole === "TEACHER" && !inviteCode.trim()) {
      toast.error("Tài khoản Giảng viên cần mã mời.");
      return;
    }
    setLoading(true);
    try {
      await onRegister({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        inviteCode: regRole === "TEACHER" ? inviteCode.trim() : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "student" | "teacher") => {
    setLoginUsername(role === "student" ? "demo_student" : "demo_teacher");
    setLoginPassword("123456");
  };

  if (mode === "login") {
    return (
      <div className="auth-container fade-in">
        <div className="surface-card auth-card">
          <div className="auth-head">
            <h1 className="auth-title">Đăng nhập</h1>
            <p className="auth-desc">Truy cập hệ thống chấm bài VKU Online Judge</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="inp-login-username">
                Tên đăng nhập hoặc Email
              </label>
              <input
                id="inp-login-username"
                type="text"
                className="form-input"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="demo_student"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="inp-login-password">
                Mật khẩu
              </label>
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
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="demo-box">
            <span className="demo-label">Điền nhanh tài khoản mẫu</span>
            <div className="demo-btns">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo("student")}>
                Sinh viên (demo_student)
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo("teacher")}>
                Giảng viên (demo_teacher)
              </button>
            </div>
          </div>

          <div className="auth-foot">
            Chưa có tài khoản?{" "}
            <button type="button" className="link-btn" onClick={() => onSwitchMode("register")}>
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container fade-in">
      <div className="surface-card auth-card">
        <div className="auth-head">
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-desc">Đăng ký để nộp bài và theo dõi bảng xếp hạng</p>
        </div>

        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-reg-username">
              Tên đăng nhập *
            </label>
            <input
              id="inp-reg-username"
              type="text"
              className="form-input"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              placeholder="nguyen_van_a"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-reg-email">
              Email *
            </label>
            <input
              id="inp-reg-email"
              type="email"
              className="form-input"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="a.nv@vku.udn.vn"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Vai trò *</label>
            <div className="role-grid">
              <button
                type="button"
                className={`role-option ${regRole === "STUDENT" ? "selected" : ""}`}
                onClick={() => setRegRole("STUDENT")}
              >
                <span className="role-option-title">Sinh viên</span>
                <span className="role-option-desc">Làm bài & nộp code</span>
              </button>
              <button
                type="button"
                className={`role-option ${regRole === "TEACHER" ? "selected" : ""}`}
                onClick={() => setRegRole("TEACHER")}
              >
                <span className="role-option-title">Giảng viên</span>
                <span className="role-option-desc">Tạo bài & test cases</span>
              </button>
            </div>
          </div>

          {regRole === "TEACHER" && (
            <div className="form-group">
              <label className="form-label" htmlFor="inp-reg-invite">
                Mã mời Giảng viên *
              </label>
              <input
                id="inp-reg-invite"
                type="text"
                className="form-input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Nhập mã do quản trị viên cấp"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="inp-reg-password">
              Mật khẩu (tối thiểu 6 ký tự) *
            </label>
            <input
              id="inp-reg-password"
              type="password"
              className="form-input"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-reg-confirm">
              Xác nhận mật khẩu *
            </label>
            <input
              id="inp-reg-confirm"
              type="password"
              className="form-input"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="btn-submit-register"
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
          </button>
        </form>

        <div className="auth-foot">
          Đã có tài khoản?{" "}
          <button type="button" className="link-btn" onClick={() => onSwitchMode("login")}>
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
