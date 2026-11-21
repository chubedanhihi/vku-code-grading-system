import type { JudgeStatus, LeaderboardEntry, Problem, UserProfile } from "../types";
import {
  IconArrowRight,
  IconCheck,
  IconCode,
  IconCpu,
  IconSparkles,
  IconTerminal,
  IconTrophy,
} from "../components/Icons";

interface HomePageProps {
  user: UserProfile | null;
  problems: Problem[];
  leaderboard: LeaderboardEntry[];
  judgeStatus: JudgeStatus | null;
  onStartCoding: () => void;
  onSelectProblem: (p: Problem) => void;
  onOpenLeaderboard: () => void;
  onOpenLogin: () => void;
}

export function HomePage({
  user,
  problems,
  leaderboard,
  judgeStatus,
  onStartCoding,
  onSelectProblem,
  onOpenLeaderboard,
  onOpenLogin,
}: HomePageProps) {
  const featuredProblems = problems.slice(0, 4);
  const topLearners = leaderboard.slice(0, 3);
  const totalSolved = leaderboard.reduce((sum, e) => sum + e.solvedCount, 0);

  return (
    <div className="page-container home-page fade-in">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className={`judge-dot ${judgeStatus?.ready ? "is-ready" : ""}`} />
            <span>VKU Code Grading Platform · Docker Sandbox</span>
          </div>

          <h1 className="hero-title">
            Luyện tập lập trình,
            <br />
            <span className="hero-accent">chấm bài tự động</span> trong tích tắc.
          </h1>

          <p className="hero-desc">
            Nền tảng học tập và thực hành thuật toán dành cho sinh viên VKU. Hỗ trợ biên dịch đa
            ngôn ngữ (C, C++, Java, Python), đo chính xác CPU time, bộ nhớ đỉnh và tích hợp Trợ
            lý AI phân tích mã nguồn.
          </p>

          <div className="hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onStartCoding}>
              <span>Bắt đầu luyện tập</span>
              <IconArrowRight size={16} />
            </button>

            {user ? (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={onOpenLeaderboard}
              >
                <IconTrophy size={16} />
                <span>Bảng xếp hạng</span>
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-lg" onClick={onOpenLogin}>
                <span>Đăng nhập tài khoản</span>
              </button>
            )}
          </div>

          <div className="hero-langs">
            <span className="hero-lang-label">Hỗ trợ:</span>
            <span className="tag-pill">C++ 17</span>
            <span className="tag-pill">C11</span>
            <span className="tag-pill">Java 17</span>
            <span className="tag-pill">Python 3</span>
          </div>
        </div>

        {/* Hero Visual: Live Code & Verdict Preview */}
        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="preview-filename mono">solution.cpp</span>
              <span className="verdict-badge tone-success">
                <IconCheck size={12} />
                <span>Accepted · 4/4</span>
              </span>
            </div>

            <pre className="preview-code mono">
              <code>{`#include <iostream>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    cout << a + b << "\\n";
    return 0;
}`}</code>
            </pre>

            <div className="preview-footer">
              <div className="preview-metric">
                <span className="preview-metric-lbl">CPU Time</span>
                <span className="preview-metric-val mono">4 ms</span>
              </div>
              <div className="preview-metric">
                <span className="preview-metric-lbl">Memory</span>
                <span className="preview-metric-val mono">3,340 KB</span>
              </div>
              <div className="preview-metric">
                <span className="preview-metric-lbl">Sandbox</span>
                <span className="preview-metric-val mono">Isolated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LIVE STATS STRIP ===== */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Bài tập hiện có</span>
          <span className="stat-value">{problems.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sinh viên tham gia</span>
          <span className="stat-value">{leaderboard.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lượt giải thành công</span>
          <span className="stat-value accent">{totalSolved}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Hệ thống chấm</span>
          <span className="stat-value" style={{ fontSize: "1.05rem" }}>
            {judgeStatus?.ready ? `Docker (${judgeStatus.workers} workers)` : "Đang kiểm tra"}
          </span>
        </div>
      </section>

      {/* ===== CORE FEATURES ===== */}
      <section className="home-section">
        <div className="home-section-head">
          <h2 className="home-section-title">Vì sao học tập trên VKU Judge?</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <IconCpu size={18} />
            </div>
            <h3 className="feature-title">Docker Sandbox an toàn</h3>
            <p className="feature-desc">
              Mỗi bài nộp được biên dịch và thực thi trong container cô lập hoàn toàn, ngắt mạng và
              giới hạn chặt chẽ CPU, RAM.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <IconTerminal size={18} />
            </div>
            <h3 className="feature-title">Chấm chi tiết từng Test Case</h3>
            <p className="feature-desc">
              Xem rõ kết quả từng test (AC, WA, TLE, MLE, CE), thời gian chạy và bộ nhớ sử dụng
              để dễ dàng tìm lỗi sai.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon ai">
              <IconSparkles size={18} />
            </div>
            <h3 className="feature-title">Trợ lý AI & Xếp hạng</h3>
            <p className="feature-desc">
              Gợi ý hướng giải theo phương pháp Socratic, đánh giá độ phức tạp thuật toán và thi
              đua trên bảng xếp hạng.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FEATURED PROBLEMS + TOP LEARNERS ===== */}
      <section className="home-two-col">
        <div className="surface-card">
          <div className="section-header">
            <h2 className="section-title">
              <IconCode size={16} />
              <span>Bài tập nổi bật</span>
            </h2>
            <button type="button" className="link-btn" onClick={onStartCoding}>
              Xem tất cả →
            </button>
          </div>

          {featuredProblems.length === 0 ? (
            <div className="empty-state compact">
              <p>Chưa có bài tập nào.</p>
            </div>
          ) : (
            <div className="home-problem-list">
              {featuredProblems.map((prob) => (
                <div
                  key={prob.id}
                  className="home-problem-row"
                  onClick={() => onSelectProblem(prob)}
                >
                  <div className="home-problem-info">
                    <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                      #{prob.id}
                    </span>
                    <span className="home-problem-name">{prob.title}</span>
                  </div>
                  <div className="home-problem-right">
                    <span className={`diff-badge diff-${prob.difficulty.toLowerCase()}`}>
                      {prob.difficulty}
                    </span>
                    <IconArrowRight size={14} className="muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card">
          <div className="section-header">
            <h2 className="section-title">
              <IconTrophy size={16} />
              <span>Top thí sinh</span>
            </h2>
            <button type="button" className="link-btn" onClick={onOpenLeaderboard}>
              Bảng xếp hạng →
            </button>
          </div>

          {topLearners.length === 0 ? (
            <div className="empty-state compact">
              <p>Chưa có dữ liệu xếp hạng.</p>
            </div>
          ) : (
            <div className="home-problem-list">
              {topLearners.map((entry) => (
                <div key={entry.userId} className="home-leader-row">
                  <div className="user-cell">
                    <span className="mono" style={{ width: 26, fontWeight: 700, color: "var(--accent-primary)" }}>
                      #{entry.rank}
                    </span>
                    <span className="mini-avatar">{entry.username.charAt(0).toUpperCase()}</span>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{entry.username}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {entry.solvedCount} bài AC · {entry.accuracyRate}%
                      </div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                    {entry.totalScore} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="home-footer">
        <span>VKU Online Judge — Khoa Khoa học Máy tính, ĐH CNTT & TT Việt - Hàn</span>
        <span className="mono">Spring Boot · React · Docker Sandbox</span>
      </footer>
    </div>
  );
}
