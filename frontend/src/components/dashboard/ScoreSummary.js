import React from 'react';

const ScoreSummary = ({ overview, sessionStats }) => {
    const avgScore = sessionStats?.summary?.averageScore ? Math.round(sessionStats.summary.averageScore * 10) / 10 : 0;

    return (
        <div className="chart-card">
            <div className="chart-header"><h2>🏆 Điểm Đánh Giá</h2></div>
            <div className="chart-body score-summary">
                <div className="score-big-ring">
                    <svg viewBox="0 0 36 36">
                        <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="ring-fill green" strokeDasharray={`${avgScore * 10}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="16.5" className="ring-text-big">{avgScore}</text>
                        <text x="18" y="23" className="ring-text-sub">/10</text>
                    </svg>
                </div>
                <p className="score-desc">Điểm trung bình các bài luyện viết câu</p>
                <div className="score-stats-row">
                    <div className="score-stat"><span className="score-stat-value">{overview?.sentencesSubmitted || 0}</span><span className="score-stat-label">Tổng bài</span></div>
                    <div className="score-stat"><span className="score-stat-value">{sessionStats?.summary?.totalSessions || 0}</span><span className="score-stat-label">Phiên</span></div>
                    <div className="score-stat"><span className="score-stat-value">{overview?.tensesCompleted || '0/12'}</span><span className="score-stat-label">Thì</span></div>
                </div>
            </div>
        </div>
    );
};

export default ScoreSummary;
