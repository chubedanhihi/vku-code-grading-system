import type { Problem, ProfileStatsView } from "../types";
import { IconArrowRight, IconCheck, IconUser } from "../components/Icons";

interface ProfilePageProps {
  profile: ProfileStatsView | null;
  loading: boolean;
  problems: Problem[];
  onSelectProblem: (p: Problem) => void;
}

export function ProfilePage({ profile, loading, problems, onSelectProblem }: ProfilePageProps) {
  if (loading || !profile) {
    return (
      <div className="page-container fade-in">
        <div className="surface-card">
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải hồ sơ cá nhân...</p>
          </div>
        </div>
      </div>
    );
  }

  // Tạo lưới 140 ngày gần nhất cho Activity Heatmap
  const days: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 139; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: profile.dailyHeatmap[key] || 0 });
  }

  const langEntries = Object.entries(profile.languageBreakdown);
  const totalLang = langEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="page-container fade-in">
      <div className="surface-card profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar-lg">{profile.username.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>{profile.username}</span>
              <span className="tag-pill sample">{profile.role}</span>
            </h1>
            <p className="page-subtitle">{profile.email}</p>
          </div>
        </div>
        <div className="profile-badge-info">
          <IconUser size={15} className="muted" />
          <span>Hồ sơ học tập</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Bài đã giải (AC)</span>
          <span className="stat-value accent">{profile.solvedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tổng lần nộp</span>
          <span className="stat-value">{profile.totalSubmissions}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lượt AC</span>
          <span className="stat-value">{profile.acceptedSubmissions}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tỷ lệ chính xác</span>
          <span className="stat-value">{profile.accuracyRate}%</span>
        </div>
      </div>

      <div className="home-two-col">
        <div className="surface-card">
          <div className="section-header">
            <h2 className="section-title">Hoạt động 20 tuần gần đây</h2>
          </div>
          <div className="heatmap-grid">
            {days.map((d) => {
              const level =
                d.count === 0 ? 0 : d.count === 1 ? 1 : d.count <= 3 ? 2 : d.count <= 6 ? 3 : 4;
              return (
                <div
                  key={d.date}
                  className={`heatmap-cell lv-${level}`}
                  title={`${d.date}: ${d.count} lần nộp`}
                />
              );
            })}
          </div>
          <div className="heatmap-legend">
            <span>Ít</span>
            <span className="heatmap-cell lv-0" />
            <span className="heatmap-cell lv-1" />
            <span className="heatmap-cell lv-2" />
            <span className="heatmap-cell lv-3" />
            <span className="heatmap-cell lv-4" />
            <span>Nhiều</span>
          </div>
        </div>

        <div className="surface-card">
          <div className="section-header">
            <h2 className="section-title">Ngôn ngữ sử dụng</h2>
          </div>
          {langEntries.length === 0 ? (
            <div className="empty-state compact">
              <p>Chưa có dữ liệu nộp bài.</p>
            </div>
          ) : (
            <div className="lang-breakdown">
              {langEntries.map(([lang, count]) => {
                const pct = totalLang ? Math.round((count * 100) / totalLang) : 0;
                return (
                  <div key={lang} className="lang-bar-row">
                    <div className="lang-bar-head">
                      <span className="mono">{lang}</span>
                      <span className="muted">
                        {count} bài ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="surface-card">
        <div className="section-header">
          <h2 className="section-title">
            Bài tập đã hoàn thành
            <span className="count-pill">{profile.solvedProblems.length}</span>
          </h2>
        </div>
        {profile.solvedProblems.length === 0 ? (
          <div className="empty-state compact">
            <p>Bạn chưa giải được bài tập nào.</p>
          </div>
        ) : (
          <div className="solved-chips">
            {profile.solvedProblems.map((sp) => {
              const full = problems.find((p) => p.id === sp.id);
              return (
                <button
                  key={sp.id}
                  type="button"
                  className="solved-chip"
                  onClick={() => full && onSelectProblem(full)}
                >
                  <IconCheck size={13} style={{ color: "var(--accent-success)" }} />
                  <span className="mono muted">#{sp.id}</span>
                  <span>{sp.title}</span>
                  <IconArrowRight size={12} className="muted" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
