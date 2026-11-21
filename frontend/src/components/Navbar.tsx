import type { JudgeStatus, UserProfile, View } from "../types";
import {
  IconCode,
  IconFlag,
  IconHome,
  IconList,
  IconLogout,
  IconPlus,
  IconSearch,
  IconTerminal,
  IconTrophy,
} from "./Icons";

interface NavbarProps {
  view: View;
  setView: (v: View) => void;
  user: UserProfile | null;
  hasSelectedProblem: boolean;
  judgeStatus: JudgeStatus | null;
  onOpenLeaderboard: () => void;
  onOpenContests: () => void;
  onOpenProfile: () => void;
  onOpenPalette: () => void;
  onLogout: () => void;
}

export function Navbar({
  view,
  setView,
  user,
  hasSelectedProblem,
  judgeStatus,
  onOpenLeaderboard,
  onOpenContests,
  onOpenProfile,
  onOpenPalette,
  onLogout,
}: NavbarProps) {
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <button type="button" className="brand" onClick={() => setView("home")}>
            <span className="brand-icon">
              <IconTerminal size={16} />
            </span>
            <span className="brand-text">
              <span className="brand-name">VKU Judge</span>
            </span>
          </button>

          <nav className="nav-tabs" aria-label="Điều hướng chính">
            <button
              id="nav-home"
              type="button"
              className={`nav-tab ${view === "home" ? "active" : ""}`}
              onClick={() => setView("home")}
            >
              <IconHome size={15} />
              <span>Trang chủ</span>
            </button>

            <button
              id="nav-problems"
              type="button"
              className={`nav-tab ${view === "problems" ? "active" : ""}`}
              onClick={() => setView("problems")}
            >
              <IconList size={15} />
              <span>Bài tập</span>
            </button>

            <button
              id="nav-contests"
              type="button"
              className={`nav-tab ${view === "contests" ? "active" : ""}`}
              onClick={onOpenContests}
            >
              <IconFlag size={15} />
              <span>Kỳ thi</span>
            </button>

            <button
              id="nav-leaderboard"
              type="button"
              className={`nav-tab ${view === "leaderboard" ? "active" : ""}`}
              onClick={onOpenLeaderboard}
            >
              <IconTrophy size={15} />
              <span>Xếp hạng</span>
            </button>

            {hasSelectedProblem && (
              <button
                id="nav-submit"
                type="button"
                className={`nav-tab ${view === "submit" ? "active" : ""}`}
                onClick={() => setView("submit")}
              >
                <IconCode size={15} />
                <span>Làm bài</span>
              </button>
            )}

            {isTeacher && (
              <button
                id="nav-add"
                type="button"
                className={`nav-tab ${view === "add-problem" ? "active" : ""}`}
                onClick={() => setView("add-problem")}
              >
                <IconPlus size={15} />
                <span>Tạo bài</span>
              </button>
            )}
          </nav>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="cmd-trigger"
            onClick={onOpenPalette}
            title="Tìm nhanh (Ctrl + K)"
          >
            <IconSearch size={13} />
            <span>Tìm nhanh</span>
            <kbd className="kbd">Ctrl K</kbd>
          </button>

          {judgeStatus && (
            <div
              className={`judge-pill ${judgeStatus.ready ? "ready" : "offline"}`}
              title={`Sandbox: ${judgeStatus.sandbox} · Broker: ${judgeStatus.broker || "db"} · Workers: ${judgeStatus.running}/${judgeStatus.workers}`}
            >
              <span className="judge-dot" />
              <span>{judgeStatus.ready ? judgeStatus.sandbox : "Offline"}</span>
              {judgeStatus.pending > 0 && (
                <span className="judge-queue">{judgeStatus.pending} chờ</span>
              )}
            </div>
          )}

          {user ? (
            <div className="user-chip">
              <button
                type="button"
                className="user-profile-trigger"
                onClick={onOpenProfile}
                title="Xem hồ sơ cá nhân"
              >
                <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.username}</span>
                <span className={`role-pill ${isTeacher ? "teacher" : "student"}`}>
                  {isTeacher ? "GV" : "SV"}
                </span>
              </button>
              <button
                id="btn-logout"
                type="button"
                className="icon-btn"
                onClick={onLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <IconLogout size={15} />
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <button
                id="btn-nav-login"
                type="button"
                className={`btn btn-sm ${view === "login" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("login")}
              >
                Đăng nhập
              </button>
              <button
                id="btn-nav-register"
                type="button"
                className={`btn btn-sm ${view === "register" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setView("register")}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
