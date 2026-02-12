import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import './Dashboard.css';

const STATUS_COLORS = {
  mastered: '#22c55e',
  known: '#6366f1',
  learning: '#f59e0b',
  unknown: '#94a3b8'
};
const STATUS_LABELS = {
  mastered: 'Thành thạo',
  known: 'Đã biết',
  learning: 'Đang học',
  unknown: 'Chưa biết'
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Short tense labels for chart display
const TENSE_SHORT = {
  'Simple Present': 'S. Present',
  'Present Continuous': 'P. Cont.',
  'Present Perfect': 'P. Perfect',
  'Present Perfect Continuous': 'P.P. Cont.',
  'Simple Past': 'S. Past',
  'Past Continuous': 'Pa. Cont.',
  'Past Perfect': 'Pa. Perfect',
  'Past Perfect Continuous': 'Pa.P. Cont.',
  'Simple Future': 'S. Future',
  'Future Continuous': 'F. Cont.',
  'Future Perfect': 'F. Perfect',
  'Future Perfect Continuous': 'F.P. Cont.'
};
// Tooltip components (defined outside component to avoid recreation)
const GrammarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{d?.fullName || label}</p>
        <p style={{ color: '#6366f1' }}>Đã làm: <strong>{d?.exercisesAttempted || 0}</strong> bài</p>
        <p style={{ color: '#22c55e' }}>Đúng: <strong>{d?.exercisesCorrect || 0}</strong> bài</p>
        {d?.completed && <p style={{ color: '#22c55e', fontWeight: 600 }}>✅ Hoàn thành</p>}
      </div>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [vocabStats, setVocabStats] = useState(null);
  const [grammarProgress, setGrammarProgress] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      try {
        const [ovRes, vocRes, gramRes, sessRes, weekRes] = await Promise.all([
          fetch('/api/dashboard/overview', { headers }),
          fetch('/api/dashboard/vocabulary-stats', { headers }),
          fetch('/api/dashboard/grammar-progress', { headers }),
          fetch('/api/dashboard/session-stats', { headers }),
          fetch('/api/dashboard/weekly-report', { headers })
        ]);

        const [ovData, vocData, gramData, sessData, weekData] = await Promise.all([
          ovRes.json(), vocRes.json(), gramRes.json(), sessRes.json(), weekRes.json()
        ]);

        if (ovData.success) setOverview(ovData.stats);
        if (vocData.success) setVocabStats(vocData);
        if (gramData.success) setGrammarProgress(gramData);
        if (sessData.success) setSessionStats(sessData);
        if (weekData.success) setWeeklyReport(weekData.report);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Memoized chart data — prevent recalculation on every render
  const weeklyData = useMemo(() => {
    if (!sessionStats?.weeklyData) return [];
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = `${DAY_LABELS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      const found = sessionStats.weeklyData.find(w => w._id === key);
      days.push({
        name: dayLabel,
        date: key,
        submitted: found?.submitted || 0,
        avgScore: found?.avgScore ? Math.round(found.avgScore * 10) / 10 : 0
      });
    }
    return days;
  }, [sessionStats]);

  const vocabPieData = useMemo(() => {
    if (!vocabStats?.statusChart) return [];
    return vocabStats.statusChart.map(item => ({
      name: STATUS_LABELS[item.name] || item.name,
      value: item.value,
      color: STATUS_COLORS[item.name] || '#94a3b8'
    }));
  }, [vocabStats]);

  const grammarData = useMemo(() => {
    if (!grammarProgress?.data) return [];
    return grammarProgress.data.map(g => ({
      name: TENSE_SHORT[g.name] || g.name,
      fullName: g.name,
      exercisesAttempted: g.exercisesAttempted || 0,
      exercisesCorrect: g.exercisesCorrect || 0,
      completed: g.completed
    }));
  }, [grammarProgress]);

  const topicData = useMemo(() => {
    if (!vocabStats?.heatmap) return [];
    return [...vocabStats.heatmap]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(t => ({
        name: t.topic.length > 14 ? t.topic.slice(0, 14) + '…' : t.topic,
        total: t.total,
        mastered: t.mastered,
        percentage: t.percentage
      }));
  }, [vocabStats]);

  const vocabTotal = useMemo(() => vocabPieData.reduce((s, d) => s + d.value, 0), [vocabPieData]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const totalVocab = overview?.totalVocabulary || 0;
  const vocabPercent = totalVocab > 0 ? Math.round((overview?.vocabularyMastered || 0) / totalVocab * 100) : 0;
  const avgScore = sessionStats?.summary?.averageScore
    ? Math.round(sessionStats.summary.averageScore * 10) / 10
    : 0;
  const totalExercises = grammarData.reduce((sum, g) => sum + g.exercisesAttempted, 0);
  const totalCorrect = grammarData.reduce((sum, g) => sum + g.exercisesCorrect, 0);
  const grammarAccuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>📊 Dashboard</h1>
          <p className="dashboard-subtitle">Tổng quan tiến độ học tập của bạn</p>
        </div>
        <div className="header-level-badge">
          🎓 {overview?.currentLevel?.toUpperCase() || 'BEGINNER'}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card gradient-blue">
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <p className="stat-label">Từ vựng</p>
            <p className="stat-value">{totalVocab}</p>
            <p className="stat-sub">{overview?.vocabularyMastered || 0} thành thạo</p>
          </div>
          <div className="stat-progress-ring">
            <svg viewBox="0 0 36 36">
              <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="ring-fill blue" strokeDasharray={`${vocabPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <text x="18" y="20.5" className="ring-text">{vocabPercent}%</text>
            </svg>
          </div>
        </div>

        <div className="stat-card gradient-green">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <p className="stat-label">Câu đã nộp</p>
            <p className="stat-value">{overview?.sentencesSubmitted || 0}</p>
            <p className="stat-sub">Điểm TB: {avgScore}/10</p>
          </div>
        </div>

        <div className="stat-card gradient-orange">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <p className="stat-label">Ngữ pháp</p>
            <p className="stat-value">{totalExercises}</p>
            <p className="stat-sub">Bài tập · {grammarAccuracy}% đúng</p>
          </div>
          <div className="stat-progress-ring">
            <svg viewBox="0 0 36 36">
              <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="ring-fill orange" strokeDasharray={`${grammarAccuracy}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <text x="18" y="20.5" className="ring-text">{grammarAccuracy}%</text>
            </svg>
          </div>
        </div>

        <div className="stat-card gradient-purple">
          <div className="stat-icon">💬</div>
          <div className="stat-info">
            <p className="stat-label">Phiên chat</p>
            <p className="stat-value">{sessionStats?.summary?.totalSessions || 0}</p>
            <p className="stat-sub">Với AI tutor</p>
          </div>
        </div>
      </div>

      {/* Weekly Summary Banner */}
      {weeklyReport && (
        <div className="weekly-banner">
          <div className="weekly-banner-inner">
            <div className="weekly-item">
              <span className="weekly-icon">📖</span>
              <div>
                <span className="weekly-num">{weeklyReport.vocabulary?.totalAdded || 0}</span>
                <span className="weekly-desc">từ mới tuần này</span>
              </div>
            </div>
            <div className="weekly-divider" />
            <div className="weekly-item">
              <span className="weekly-icon">📝</span>
              <div>
                <span className="weekly-num">{weeklyReport.sentences || 0}</span>
                <span className="weekly-desc">câu luyện viết</span>
              </div>
            </div>
            <div className="weekly-divider" />
            <div className="weekly-item">
              <span className="weekly-icon">📚</span>
              <div>
                <span className="weekly-num">{weeklyReport.grammar?.exercisesAttempted || 0}</span>
                <span className="weekly-desc">bài tập ngữ pháp</span>
              </div>
            </div>
            <div className="weekly-divider" />
            <div className="weekly-item">
              <span className="weekly-icon">✅</span>
              <div>
                <span className="weekly-num">{weeklyReport.grammar?.exercisesCorrect || 0}</span>
                <span className="weekly-desc">trả lời đúng</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        {/* Grammar Progress — 12 Tenses */}
        <div className="chart-card chart-full">
          <div className="chart-header">
            <h2>📚 Tiến Độ Ngữ Pháp — 12 Thì</h2>
            <span className="chart-badge">{grammarProgress?.completed || 0} / 12 hoàn thành</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={grammarData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="gradAttempted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradCorrect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a5b4fc" stopOpacity={1} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradAttemptedDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradCorrectDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                  angle={-40}
                  textAnchor="end"
                  height={70}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                  label={{ value: 'Số bài tập', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#94a3b8' } }}
                />
                <Tooltip content={<GrammarTooltip />} />
                <Bar dataKey="exercisesAttempted" name="Đã làm" radius={[6, 6, 0, 0]} barSize={22}>
                  {grammarData.map((entry, index) => (
                    <Cell key={index} fill={entry.completed ? 'url(#gradAttemptedDone)' : 'url(#gradAttempted)'} />
                  ))}
                </Bar>
                <Bar dataKey="exercisesCorrect" name="Đúng" radius={[6, 6, 0, 0]} barSize={22}>
                  {grammarData.map((entry, index) => (
                    <Cell key={index} fill={entry.completed ? 'url(#gradCorrectDone)' : 'url(#gradCorrect)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="grammar-legend">
              <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)' }}></span> Đã làm (Đang học)</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}></span> Đã làm (Hoàn thành)</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #a5b4fc, #818cf8)' }}></span> Đúng (Đang học)</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}></span> Đúng (Hoàn thành)</span>
            </div>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <h2>📈 Hoạt Động 7 Ngày Gần Đây</h2>
            <span className="chart-badge">Tuần này</span>
          </div>
          <div className="chart-body">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="50%" stopColor="#818cf8" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="strokeSubmitted" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    name="Câu đã nộp"
                    stroke="url(#strokeSubmitted)"
                    strokeWidth={3}
                    fill="url(#colorSubmitted)"
                    dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2.5 }}
                    activeDot={{ r: 8, fill: '#6366f1', stroke: '#c7d2fe', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Chưa có dữ liệu tuần này</div>
            )}
          </div>
        </div>

        {/* Vocab Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>🎯 Trạng Thái Từ Vựng</h2>
          </div>
          <div className="chart-body">
            {vocabPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vocabPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {vocabPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  {/* Center total label */}
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" className="pie-center-value">
                    {vocabTotal}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="pie-center-label">
                    từ vựng
                  </text>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span style={{ color: '#475569', fontSize: '0.78rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Chưa có dữ liệu từ vựng</div>
            )}
          </div>
        </div>

        {/* Vocab by Topic */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <h2>📖 Từ Vựng Theo Chủ Đề</h2>
            <span className="chart-badge">Top {topicData.length} chủ đề</span>
          </div>
          <div className="chart-body">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topicData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradTopicTotal" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="gradTopicMastered" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Tổng" fill="url(#gradTopicTotal)" radius={[0, 8, 8, 0]} barSize={14} />
                  <Bar dataKey="mastered" name="Thành thạo" fill="url(#gradTopicMastered)" radius={[0, 8, 8, 0]} barSize={14} />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(value) => <span style={{ color: '#475569', fontSize: '0.8rem' }}>{value}</span>}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Chưa có dữ liệu chủ đề</div>
            )}
          </div>
        </div>

        {/* Average Score */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>🏆 Điểm Đánh Giá</h2>
          </div>
          <div className="chart-body score-summary">
            <div className="score-big-ring">
              <svg viewBox="0 0 36 36">
                <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="ring-fill green"
                  strokeDasharray={`${avgScore * 10}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="16.5" className="ring-text-big">{avgScore}</text>
                <text x="18" y="23" className="ring-text-sub">/10</text>
              </svg>
            </div>
            <p className="score-desc">Điểm trung bình các bài luyện viết câu</p>
            <div className="score-stats-row">
              <div className="score-stat">
                <span className="score-stat-value">{overview?.sentencesSubmitted || 0}</span>
                <span className="score-stat-label">Tổng bài</span>
              </div>
              <div className="score-stat">
                <span className="score-stat-value">{sessionStats?.summary?.totalSessions || 0}</span>
                <span className="score-stat-label">Phiên</span>
              </div>
              <div className="score-stat">
                <span className="score-stat-value">{overview?.tensesCompleted || '0/12'}</span>
                <span className="score-stat-label">Thì</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
