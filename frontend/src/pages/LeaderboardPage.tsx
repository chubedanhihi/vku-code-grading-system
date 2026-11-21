import { useState } from "react";
import type { LeaderboardEntry } from "../types";
import { IconRefresh, IconSearch } from "../components/Icons";

interface LeaderboardPageProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  currentUserId?: number;
  onRefresh: () => void;
}

export function LeaderboardPage({
  entries,
  loading,
  currentUserId,
  onRefresh,
}: LeaderboardPageProps) {
  const [search, setSearch] = useState("");

  const filtered = entries.filter(
    (item) =>
      item.username.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalCompetitors = entries.length;
  const totalSolved = entries.reduce((acc, cur) => acc + cur.solvedCount, 0);
  const totalSubs = entries.reduce((acc, cur) => acc + cur.totalSubmissions, 0);
  const maxScore = entries.length > 0 ? Math.max(...entries.map((e) => e.totalScore)) : 0;

  const top3 = entries.slice(0, 3);

  return (
    <div className="page-container fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bảng xếp hạng</h1>
          <p className="page-subtitle">
            Xếp hạng dựa trên tổng điểm bài đã giải (AC) và độ chính xác.
          </p>
        </div>
        <div className="page-controls">
          <div className="search-field">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Tìm thí sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="icon-btn" onClick={onRefresh} title="Làm mới">
            <IconRefresh size={15} />
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Thí sinh</span>
          <span className="stat-value">{totalCompetitors}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bài đã giải (AC)</span>
          <span className="stat-value">{totalSolved}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tổng lần nộp</span>
          <span className="stat-value">{totalSubs}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Điểm cao nhất</span>
          <span className="stat-value accent">{maxScore} pts</span>
        </div>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="top3-grid">
          {top3.map((entry) => (
            <div key={entry.userId} className={`top-card rank-${entry.rank}`}>
              <div className="top-card-head">
                <span className="top-rank">#{entry.rank}</span>
                <span className={`tier-pill tier-${entry.tier.toLowerCase()}`}>{entry.tier}</span>
              </div>
              <div className="top-card-user">
                <span className="top-avatar">{entry.username.charAt(0).toUpperCase()}</span>
                <div>
                  <div className="top-username">{entry.username}</div>
                  <div className="top-sub">
                    {entry.solvedCount} bài · {entry.accuracyRate}% AC
                  </div>
                </div>
              </div>
              <div className="top-score">{entry.totalScore} pts</div>
            </div>
          ))}
        </div>
      )}

      {/* Full Table */}
      <div className="surface-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải bảng xếp hạng...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có dữ liệu thí sinh.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Hạng</th>
                  <th>Thí sinh</th>
                  <th>Danh hiệu</th>
                  <th>Điểm</th>
                  <th>Đã giải</th>
                  <th>Tỷ lệ AC</th>
                  <th>Tổng nộp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isMe = currentUserId === item.userId;
                  return (
                    <tr key={item.userId} className={isMe ? "highlight-row" : ""}>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        #{item.rank}
                      </td>
                      <td>
                        <div className="user-cell">
                          <span className="mini-avatar">
                            {item.username.charAt(0).toUpperCase()}
                          </span>
                          <span>{item.username}</span>
                          {isMe && <span className="tag-pill sample">Bạn</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`tier-pill tier-${item.tier.toLowerCase()}`}>
                          {item.tier}
                        </span>
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {item.totalScore} pts
                      </td>
                      <td>{item.solvedCount} bài</td>
                      <td
                        style={{
                          color:
                            item.accuracyRate >= 50
                              ? "var(--accent-success)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {item.accuracyRate}%
                      </td>
                      <td className="muted">{item.totalSubmissions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
