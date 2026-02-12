import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import './Dashboard.css';

// Lazy render wrapper - only renders children when scrolled into view
const LazyRender = React.memo(({ children, height = 300, rootMargin = '100px' }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only need to observe once
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? 'auto' : height }}>
      {isVisible ? children : (
        <div style={{
          height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', fontSize: '0.9rem'
        }}>
          Đang tải biểu đồ...
        </div>
      )}
    </div>
  );
});

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

const TENSE_SHORT = {
  'Simple Present': 'S. Present', 'Present Continuous': 'P. Cont.',
  'Present Perfect': 'P. Perfect', 'Present Perfect Continuous': 'P.P. Cont.',
  'Simple Past': 'S. Past', 'Past Continuous': 'Pa. Cont.',
  'Past Perfect': 'Pa. Perfect', 'Past Perfect Continuous': 'Pa.P. Cont.',
  'Simple Future': 'S. Future', 'Future Continuous': 'F. Cont.',
  'Future Perfect': 'F. Perfect', 'Future Perfect Continuous': 'F.P. Cont.'
};

const LEVEL_LABELS = {
  beginner: 'Beginner', elementary: 'Elementary', intermediate: 'Intermediate',
  'upper-intermediate': 'Upper Intermediate', advanced: 'Advanced', expert: 'Expert',
  master: 'Master', legend: 'Legend'
};

const LEVEL_BADGES = {
  beginner: '🌱',
  elementary: '🥉',
  intermediate: '🥈',
  'upper-intermediate': '🥇',
  advanced: '💠',
  expert: '💎',
  master: '👑',
  legend: '🐲'
};

const LEVEL_COLORS = {
  beginner: '#94a3b8', elementary: '#22c55e', intermediate: '#3b82f6',
  'upper-intermediate': '#8b5cf6', advanced: '#f59e0b', expert: '#ef4444',
  master: '#ec4899', legend: '#eab308'
};

const LEVEL_THRESHOLDS = {
  beginner: 0,
  elementary: 500,
  intermediate: 2000,
  'upper-intermediate': 5000,
  advanced: 10000,
  expert: 25000,
  master: 50000,
  legend: 100000
};

const LEVEL_ORDER = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'expert', 'master', 'legend'];

const CATEGORY_LABEL = {
  vocabulary: '📖 Từ vựng', grammar: '📐 Ngữ pháp', sentence: '✍️ Luyện dịch', communication: '💬 Giao tiếp'
};

const QUICK_ACTIONS = [
  { icon: '📖', label: 'Từ Vựng', path: '/vocabulary', color: '#6366f1', desc: 'Học từ mới' },
  { icon: '📐', label: 'Ngữ Pháp', path: '/grammar', color: '#22c55e', desc: '12 thì' },
  { icon: '✍️', label: 'Luyện Dịch', path: '/sentence-writing', color: '#f59e0b', desc: 'Viết câu' },
  { icon: '💬', label: 'Hội Thoại', path: '/chatbot', color: '#ec4899', desc: 'Chat AI' },
  { icon: '🎭', label: 'Roleplay', path: '/roleplay', color: '#8b5cf6', desc: 'Đóng vai' },
  { icon: '🗣️', label: 'Phát Âm', path: '/pronunciation', color: '#06b6d4', desc: 'Luyện nói' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Khuya rồi, học chăm quá!', emoji: '🌙' };
  if (hour < 12) return { text: 'Chào buổi sáng!', emoji: '🌅' };
  if (hour < 18) return { text: 'Chào buổi chiều!', emoji: '☀️' };
  return { text: 'Chào buổi tối!', emoji: '🌆' };
}

// Animated counter hook
function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

// Memoized tooltip components to prevent re-renders
const GrammarTooltip = React.memo(({ active, payload, label }) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{d?.fullName || label}</p>
        <p style={{ color: '#6366f1' }}>Đã làm: <strong>{d?.exercisesAttempted || 0}</strong></p>
        <p style={{ color: '#22c55e' }}>Đúng: <strong>{d?.exercisesCorrect || 0}</strong></p>
        {d?.completed && <p style={{ color: '#22c55e', fontWeight: 600 }}>✅ Hoàn thành</p>}
      </div>
    );
  }
  return null;
});

const CustomTooltip = React.memo(({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>{entry.name}: <strong>{entry.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
});

// Animated stat card
const AnimatedStatValue = ({ value }) => {
  const animated = useAnimatedValue(value);
  return <>{animated}</>;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [overview, setOverview] = useState(null);
  const [vocabStats, setVocabStats] = useState(null);
  const [grammarProgress, setGrammarProgress] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [srsStats, setSrsStats] = useState(null);
  const [missions, setMissions] = useState([]);
  const [levelData, setLevelData] = useState(null);
  const [missionFilter, setMissionFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    const fetchAll = async () => {
      try {
        // Single combined API call instead of 7 separate requests
        const response = await fetch('/api/dashboard/all', { headers });
        const data = await response.json();

        if (data.success) {
          setOverview(data.overview);
          setVocabStats(data.vocabStats);
          setGrammarProgress(data.grammarProgress);
          setSessionStats(data.sessionStats);
          setWeeklyReport(data.weeklyReport);

          if (data.srsStats) {
            setSrsStats(data.srsStats);
          }

          if (data.missions) {
            setMissions(data.missions.missions);
            setLevelData({
              xp: data.missions.xp,
              level: data.missions.level,
              levelInfo: data.missions.levelInfo,
              streak: data.missions.streak
            });
          }
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        // Fallback to individual requests if combined endpoint fails
        try {
          const [ovRes, vocRes, gramRes, sessRes, weekRes, srsRes, missRes] = await Promise.all([
            fetch('/api/dashboard/overview', { headers }),
            fetch('/api/dashboard/vocabulary-stats', { headers }),
            fetch('/api/dashboard/grammar-progress', { headers }),
            fetch('/api/dashboard/session-stats', { headers }),
            fetch('/api/dashboard/weekly-report', { headers }),
            fetch('/api/vocabulary/srs-stats', { headers }),
            fetch('/api/dashboard/missions', { headers })
          ]);

          const [ovData, vocData, gramData, sessData, weekData, srsData, missData] = await Promise.all([
            ovRes.json(), vocRes.json(), gramRes.json(), sessRes.json(), weekRes.json(), srsRes.json(), missRes.json()
          ]);

          if (ovData.success) setOverview(ovData.stats);
          if (vocData.success) setVocabStats(vocData);
          if (gramData.success) setGrammarProgress(gramData);
          if (sessData.success) setSessionStats(sessData);
          if (weekData.success) setWeeklyReport(weekData.report);
          if (srsData.success) setSrsStats(srsData.stats);
          if (missData.success) {
            setMissions(missData.missions);
            setLevelData({
              xp: missData.xp,
              level: missData.level,
              levelInfo: missData.levelInfo,
              streak: missData.streak
            });
          }
        } catch (fallbackError) {
          console.error('Dashboard fallback fetch error:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleClaimMission = useCallback(async (mission) => {
    try {
      const res = await fetch('/api/dashboard/claim-mission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ missionId: mission.id, xp: mission.xp })
      });
      const data = await res.json();
      if (data.success) {
        setLevelData({ xp: data.xp, level: data.level, levelInfo: data.levelInfo, streak: data.streak });
        setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, claimed: true } : m));
      }
    } catch (err) {
      console.error('Claim error', err);
    }
  }, []);

  // Memoized chart data
  const weeklyData = useMemo(() => {
    if (!sessionStats?.weeklyData) return [];
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = `${DAY_LABELS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      const found = sessionStats.weeklyData.find(w => w._id === key);
      days.push({ name: dayLabel, date: key, submitted: found?.submitted || 0, avgScore: found?.avgScore ? Math.round(found.avgScore * 10) / 10 : 0 });
    }
    return days;
  }, [sessionStats]);

  const vocabPieData = useMemo(() => {
    if (!vocabStats?.statusChart) return [];
    return vocabStats.statusChart.map(item => ({ name: STATUS_LABELS[item.name] || item.name, value: item.value, color: STATUS_COLORS[item.name] || '#94a3b8' }));
  }, [vocabStats]);

  const grammarData = useMemo(() => {
    if (!grammarProgress?.data) return [];
    return grammarProgress.data.map(g => ({ name: TENSE_SHORT[g.name] || g.name, fullName: g.name, exercisesAttempted: g.exercisesAttempted || 0, exercisesCorrect: g.exercisesCorrect || 0, completed: g.completed }));
  }, [grammarProgress]);

  const topicData = useMemo(() => {
    if (!vocabStats?.heatmap) return [];
    return [...vocabStats.heatmap].sort((a, b) => b.total - a.total).slice(0, 8).map(t => ({ name: t.topic.length > 14 ? t.topic.slice(0, 14) + '…' : t.topic, total: t.total, mastered: t.mastered, percentage: t.percentage }));
  }, [vocabStats]);

  const vocabTotal = useMemo(() => vocabPieData.reduce((s, d) => s + d.value, 0), [vocabPieData]);

  const filteredMissions = useMemo(() => {
    if (missionFilter === 'all') return missions;
    if (missionFilter === 'daily') return missions.filter(m => m.type === 'daily');
    return missions.filter(m => m.category === missionFilter);
  }, [missions, missionFilter]);

  const claimableMissions = useMemo(() => missions.filter(m => m.completed && !m.claimed).length, [missions]);

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
  const avgScore = sessionStats?.summary?.averageScore ? Math.round(sessionStats.summary.averageScore * 10) / 10 : 0;
  const totalExercises = grammarData.reduce((sum, g) => sum + g.exercisesAttempted, 0);
  const totalCorrect = grammarData.reduce((sum, g) => sum + g.exercisesCorrect, 0);
  const grammarAccuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;

  return (
    <div className="dashboard">
      {/* Level Modal */}
      {showLevelModal && (
        <div className="level-modal-overlay" onClick={() => setShowLevelModal(false)}>
          <div className="level-modal-content" onClick={e => e.stopPropagation()}>
            <div className="level-modal-header">
              <h2>🏆 Hệ thống Cấp bậc</h2>
              <button className="close-btn" onClick={() => setShowLevelModal(false)}>×</button>
            </div>

            <div className="current-xp-info">
              <p>XP hiện tại: <strong>{levelData?.xp?.toLocaleString()}</strong></p>
              <div className="xp-progress-mini">
                <div className="xp-bar-fill" style={{ width: `${levelData?.xpProgress || 0}%`, background: LEVEL_COLORS[levelData?.level] }}></div>
              </div>
              <p className="next-level-hint">Cần thêm {levelData?.xpNeeded?.toLocaleString()} XP để lên cấp tiếp theo</p>
            </div>

            <div className="level-list">
              {LEVEL_ORDER.map((lvl) => {
                const isCurrent = lvl === levelData?.level;
                const isUnlocked = (levelData?.xp || 0) >= LEVEL_THRESHOLDS[lvl];
                const effectiveUnlocked = isUnlocked || lvl === 'beginner';

                return (
                  <div
                    key={lvl}
                    className={`level-item ${isCurrent ? 'current' : ''} ${effectiveUnlocked ? 'unlocked' : 'locked'}`}
                    style={{ '--level-color': LEVEL_COLORS[lvl] }}
                  >
                    <div className="level-icon-wrapper" style={{ background: effectiveUnlocked ? LEVEL_COLORS[lvl] : '#e2e8f0' }}>
                      {effectiveUnlocked ? (lvl === 'legend' ? '👑' : lvl === 'master' ? '💠' : '🔓') : '🔒'}
                    </div>
                    <div className="level-info-row">
                      <h3 style={{ color: effectiveUnlocked ? LEVEL_COLORS[lvl] : '#94a3b8' }}>
                        {LEVEL_LABELS[lvl]}
                        {isCurrent && <span className="current-badge">Hiện tại</span>}
                      </h3>
                      <span className="level-threshold">{LEVEL_THRESHOLDS[lvl].toLocaleString()} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== HERO HEADER ==================== */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-greeting">
            <span className="hero-emoji">{greeting.emoji}</span>
            <div>
              <h1>{greeting.text}</h1>
              <p className="hero-subtitle">Tiếp tục hành trình học tiếng Anh của bạn</p>
            </div>
          </div>
          <div className="hero-badges">
            {levelData && (
              <button
                className="level-badge-btn"
                onClick={() => setShowLevelModal(true)}
                style={{ borderColor: LEVEL_COLORS[levelData.level] }}
              >
                <div className="level-badge-inner">
                  <span className="level-emoji">{LEVEL_BADGES[levelData.level] || '🎓'}</span>
                  <div className="level-text">
                    <span className="level-name" style={{ color: LEVEL_COLORS[levelData.level] }}>
                      {LEVEL_LABELS[levelData.level] || levelData.level}
                    </span>
                    <span className="xp-text">{levelData.xp?.toLocaleString()} XP</span>
                  </div>
                </div>
                {levelData.streak > 0 && (
                  <div className="streak-badge-mini">🔥 {levelData.streak}</div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        {levelData?.levelInfo?.nextLevel && (
          <div className="hero-xp-bar">
            <div className="xp-bar-labels">
              <span style={{ color: LEVEL_COLORS[levelData.level] }}>
                {LEVEL_BADGES[levelData.level]} {LEVEL_LABELS[levelData.level]}
              </span>
              <span className="xp-bar-percent">{levelData.levelInfo.xpProgress}%</span>
              <span style={{ color: LEVEL_COLORS[levelData.levelInfo.nextLevel] }}>
                {LEVEL_BADGES[levelData.levelInfo.nextLevel]} {LEVEL_LABELS[levelData.levelInfo.nextLevel]}
              </span>
            </div>
            <div className="xp-bar-track-hero">
              <div className="xp-bar-fill-hero" style={{
                width: `${levelData.levelInfo.xpProgress}%`,
                background: `linear-gradient(90deg, ${LEVEL_COLORS[levelData.level]}, ${LEVEL_COLORS[levelData.levelInfo.nextLevel]})`
              }} />
            </div>
            <p className="xp-remaining-hero">Còn <strong>{levelData.levelInfo.xpNeeded?.toLocaleString()}</strong> XP để lên cấp</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            className="quick-action-btn"
            onClick={() => navigate(action.path)}
            style={{ '--action-color': action.color }}
          >
            <span className="qa-icon">{action.icon}</span>
            <span className="qa-label">{action.label}</span>
            <span className="qa-desc">{action.desc}</span>
          </button>
        ))}
      </div>

      {/* Dashboard Tabs */}
      <div className="dashboard-tabs">
        <button className={`dash-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📈 Tổng Quan
        </button>
        <button className={`dash-tab ${activeTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveTab('missions')}>
          🎯 Nhiệm Vụ
          {claimableMissions > 0 && (
            <span className="tab-badge">{claimableMissions}</span>
          )}
        </button>
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <>
          {/* SRS Review Widget */}
          {srsStats && (
            <div className="srs-review-widget" onClick={() => navigate('/vocabulary')}>
              <div className="srs-widget-left">
                <h3>🔄 Ôn Tập Từ Vựng</h3>
                <p className="srs-widget-desc">Hệ thống Spaced Repetition giúp bạn ghi nhớ từ lâu dài</p>
              </div>
              <div className="srs-widget-stats">
                <div className="srs-widget-stat due">
                  <span className="srs-w-num">{srsStats.dueCount}</span>
                  <span className="srs-w-label">Cần ôn tập</span>
                </div>
                <div className="srs-widget-stat">
                  <span className="srs-w-num">{srsStats.learningCount}</span>
                  <span className="srs-w-label">Đang học</span>
                </div>
                <div className="srs-widget-stat">
                  <span className="srs-w-num">{srsStats.knownCount}</span>
                  <span className="srs-w-label">Đã biết</span>
                </div>
                <div className="srs-widget-stat mastered">
                  <span className="srs-w-num">{srsStats.masteredCount}</span>
                  <span className="srs-w-label">Thành thạo</span>
                </div>
              </div>
              <div className="srs-widget-action">
                <span className="srs-action-btn">Ôn tập ngay →</span>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="section-label"><span>📊</span> Thống kê tổng quan</div>
          <div className="stats-grid">
            <div className="stat-card gradient-blue" onClick={() => navigate('/vocabulary')}>
              <div className="stat-icon">📖</div>
              <div className="stat-info">
                <p className="stat-label">Từ vựng</p>
                <p className="stat-value"><AnimatedStatValue value={totalVocab} /></p>
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

            <div className="stat-card gradient-green" onClick={() => navigate('/sentence-writing')}>
              <div className="stat-icon">📝</div>
              <div className="stat-info">
                <p className="stat-label">Câu đã nộp</p>
                <p className="stat-value"><AnimatedStatValue value={overview?.sentencesSubmitted || 0} /></p>
                <p className="stat-sub">Điểm TB: {avgScore}/10</p>
              </div>
            </div>

            <div className="stat-card gradient-orange" onClick={() => navigate('/grammar')}>
              <div className="stat-icon">📚</div>
              <div className="stat-info">
                <p className="stat-label">Ngữ pháp</p>
                <p className="stat-value"><AnimatedStatValue value={totalExercises} /></p>
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

            <div className="stat-card gradient-purple" onClick={() => navigate('/chatbot')}>
              <div className="stat-icon">💬</div>
              <div className="stat-info">
                <p className="stat-label">Phiên chat</p>
                <p className="stat-value"><AnimatedStatValue value={sessionStats?.summary?.totalSessions || 0} /></p>
                <p className="stat-sub">Với AI tutor</p>
              </div>
            </div>
          </div>

          {/* Weekly Summary Banner */}
          {weeklyReport && (
            <>
              <div className="section-label"><span>📅</span> Hoạt động tuần này</div>
              <div className="weekly-banner">
                <div className="weekly-banner-inner">
                  <div className="weekly-item">
                    <span className="weekly-icon">📖</span>
                    <div><span className="weekly-num">{weeklyReport.vocabulary?.totalAdded || 0}</span><span className="weekly-desc">từ mới tuần này</span></div>
                  </div>
                  <div className="weekly-divider" />
                  <div className="weekly-item">
                    <span className="weekly-icon">📝</span>
                    <div><span className="weekly-num">{weeklyReport.sentences || 0}</span><span className="weekly-desc">câu luyện viết</span></div>
                  </div>
                  <div className="weekly-divider" />
                  <div className="weekly-item">
                    <span className="weekly-icon">📚</span>
                    <div><span className="weekly-num">{weeklyReport.grammar?.exercisesAttempted || 0}</span><span className="weekly-desc">bài tập ngữ pháp</span></div>
                  </div>
                  <div className="weekly-divider" />
                  <div className="weekly-item">
                    <span className="weekly-icon">✅</span>
                    <div><span className="weekly-num">{weeklyReport.grammar?.exercisesCorrect || 0}</span><span className="weekly-desc">trả lời đúng</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Charts */}
          <div className="section-label"><span>📉</span> Biểu đồ chi tiết</div>
          <div className="charts-grid">
            {/* Grammar Progress */}
            <div className="chart-card chart-full">
              <div className="chart-header">
                <h2>📚 Tiến Độ Ngữ Pháp — 12 Thì</h2>
                <span className="chart-badge">{grammarProgress?.completed || 0} / 12 hoàn thành</span>
              </div>
              <div className="chart-body">
                <LazyRender height={320}>
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
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} angle={-40} textAnchor="end" height={70} interval={0} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} label={{ value: 'Số bài tập', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#94a3b8' } }} />
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
                </LazyRender>
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
                  <LazyRender height={260}>
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
                        <Area type="monotone" dataKey="submitted" name="Câu đã nộp" stroke="url(#strokeSubmitted)" strokeWidth={3} fill="url(#colorSubmitted)" dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2.5 }} activeDot={{ r: 8, fill: '#6366f1', stroke: '#c7d2fe', strokeWidth: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </LazyRender>
                ) : (
                  <div className="chart-empty">Chưa có dữ liệu tuần này</div>
                )}
              </div>
            </div>

            {/* Vocab Pie */}
            <div className="chart-card">
              <div className="chart-header"><h2>🎯 Trạng Thái Từ Vựng</h2></div>
              <div className="chart-body">
                {vocabPieData.length > 0 ? (
                  <LazyRender height={300}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={vocabPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.6)" strokeWidth={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                          {vocabPieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie>
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" className="pie-center-value">{vocabTotal}</text>
                        <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="pie-center-label">từ vựng</text>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: '#475569', fontSize: '0.78rem' }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </LazyRender>
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
                  <LazyRender height={260}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topicData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gradTopicTotal" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} /><stop offset="100%" stopColor="#818cf8" stopOpacity={1} /></linearGradient>
                          <linearGradient id="gradTopicMastered" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} /><stop offset="100%" stopColor="#4ade80" stopOpacity={1} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" name="Tổng" fill="url(#gradTopicTotal)" radius={[0, 8, 8, 0]} barSize={14} />
                        <Bar dataKey="mastered" name="Thành thạo" fill="url(#gradTopicMastered)" radius={[0, 8, 8, 0]} barSize={14} />
                        <Legend verticalAlign="top" height={30} formatter={(value) => <span style={{ color: '#475569', fontSize: '0.8rem' }}>{value}</span>} />
                      </BarChart>
                    </ResponsiveContainer>
                  </LazyRender>
                ) : (
                  <div className="chart-empty">Chưa có dữ liệu chủ đề</div>
                )}
              </div>
            </div>

            {/* Average Score */}
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
          </div>
        </>
      )}

      {/* ==================== MISSIONS TAB ==================== */}
      {activeTab === 'missions' && (
        <div className="missions-container">
          {/* Level Card */}
          {levelData && (
            <div className="level-card">
              <div className="level-card-top">
                <div className="level-card-icon" style={{ background: `linear-gradient(135deg, ${LEVEL_COLORS[levelData.level]}40, ${LEVEL_COLORS[levelData.level]}15)` }}>
                  <span style={{ fontSize: '2.5rem' }}>{LEVEL_BADGES[levelData.level] || '🎓'}</span>
                </div>
                <div className="level-card-info">
                  <h2 style={{ color: LEVEL_COLORS[levelData.level] }}>
                    {LEVEL_LABELS[levelData.level] || levelData.level}
                  </h2>
                  <p className="level-card-xp">{levelData.xp} XP tổng cộng</p>
                  {levelData.streak > 0 && (
                    <div className="level-streak">🔥 Chuỗi {levelData.streak} ngày liên tục</div>
                  )}
                </div>
              </div>
              {levelData.levelInfo.nextLevel && (
                <div className="level-card-progress">
                  <div className="level-progress-labels">
                    <span>{LEVEL_LABELS[levelData.level]}</span>
                    <span>{levelData.levelInfo.xpProgress}%</span>
                    <span>{LEVEL_LABELS[levelData.levelInfo.nextLevel]}</span>
                  </div>
                  <div className="level-progress-track">
                    <div className="level-progress-fill" style={{
                      width: `${levelData.levelInfo.xpProgress}%`,
                      background: `linear-gradient(90deg, ${LEVEL_COLORS[levelData.level]}, ${LEVEL_COLORS[levelData.levelInfo.nextLevel]})`
                    }} />
                  </div>
                  <p className="level-progress-hint">Còn {levelData.levelInfo.xpNeeded} XP để lên cấp</p>
                </div>
              )}
            </div>
          )}

          {/* Mission Filters */}
          <div className="mission-filters">
            {[
              { key: 'all', label: '🎯 Tất cả' },
              { key: 'daily', label: '📅 Hàng ngày' },
              { key: 'vocabulary', label: '📖 Từ vựng' },
              { key: 'grammar', label: '📐 Ngữ pháp' },
              { key: 'sentence', label: '✍️ Luyện dịch' },
              { key: 'communication', label: '💬 Giao tiếp' },
            ].map(f => (
              <button
                key={f.key}
                className={`mission-filter-btn ${missionFilter === f.key ? 'active' : ''}`}
                onClick={() => setMissionFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Mission List */}
          <div className="missions-list">
            {filteredMissions.map(mission => (
              <div key={mission.id} className={`mission-card ${mission.completed ? 'completed' : ''} ${mission.claimed ? 'claimed' : ''}`}>
                <div className="mission-icon-wrap">
                  <span className="mission-icon">{mission.icon}</span>
                </div>
                <div className="mission-content">
                  <div className="mission-header-row">
                    <h4 className="mission-title">{mission.title}</h4>
                    <span className="mission-xp-badge">+{mission.xp} XP</span>
                  </div>
                  <p className="mission-desc">{mission.description}</p>
                  <div className="mission-category-tag">{CATEGORY_LABEL[mission.category]}</div>
                  <div className="mission-progress-row">
                    <div className="mission-progress-track">
                      <div
                        className="mission-progress-fill"
                        style={{ width: `${mission.progress}%` }}
                      />
                    </div>
                    <span className="mission-progress-text">{mission.current}/{mission.target}</span>
                  </div>
                </div>
                <div className="mission-action">
                  {mission.claimed ? (
                    <span className="mission-claimed-badge">✅ Đã nhận</span>
                  ) : mission.completed ? (
                    <button className="mission-claim-btn" onClick={() => handleClaimMission(mission)}>
                      🎁 Nhận thưởng
                    </button>
                  ) : (
                    <button className="mission-go-btn" onClick={() => navigate(mission.link)}>
                      Thực hiện →
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredMissions.length === 0 && (
              <div className="empty-missions">
                <span style={{ fontSize: '2rem' }}>🎯</span>
                <p>Không có nhiệm vụ nào trong danh mục này.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
