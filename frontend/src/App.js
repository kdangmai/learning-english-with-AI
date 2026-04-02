import React, { useState, useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useUserStore } from './store/store';
import './App.css';

// Components
import { LoginForm, RegisterForm } from './components/AuthForm';
import { ToastProvider } from './context/ToastContext';
import PageLoader from './components/PageLoader';
import AnimatedPage from './components/AnimatedPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Lazy Components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Grammar = lazy(() => import('./pages/Grammar'));
const Vocabulary = lazy(() => import('./pages/Vocabulary'));
const SentenceWriting = lazy(() => import('./pages/SentenceWriting'));
const SentenceUpgrade = lazy(() => import('./pages/SentenceUpgrade'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const Pronunciation = lazy(() => import('./pages/Pronunciation'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Roleplay = lazy(() => import('./pages/Roleplay'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ReadingVocab = lazy(() => import('./pages/ReadingVocab'));


// Navigation items configuration
const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', section: 'main' },
  { path: '/leaderboard', icon: '🏆', label: 'Bảng Xếp Hạng', section: 'main' },
  { path: '/grammar', icon: '📚', label: 'Học Ngữ Pháp', section: 'learn' },
  { path: '/vocabulary', icon: '📖', label: 'Từ Vựng', section: 'learn' },
  { path: '/reading-vocab', icon: '🔍', label: 'Từ Vựng Reading', section: 'learn' },
  { path: '/sentence-writing', icon: '✍️', label: 'Luyện Dịch Câu', section: 'practice' },
  { path: '/sentence-upgrade', icon: '⏫', label: 'Nâng Cấp Câu', section: 'practice' },
  { path: '/pronunciation', icon: '🗣️', label: 'Luyện Phát Âm', section: 'practice' },
  { path: '/chatbot', icon: '🤖', label: 'Chatbot AI', section: 'ai' },
  { path: '/roleplay', icon: '🎭', label: 'Đóng Vai AI', section: 'ai' },
];

const SECTION_LABELS = {
  main: null,
  learn: 'Học tập',
  practice: 'Luyện tập',
  ai: 'Trò chuyện AI',
};

const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));

const AdminRoute = ({ children }) => {
  const { user } = useUserStore();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function MainLayout() {
  const { isAuthenticated, user, logout } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  /* ====== Theme Logic ====== */
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Always collapse sidebar on navigation
    setSidebarOpen(false);
  }, [location]);

  // Global Focus Page — confirm before reload/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only prompt if on a page where data might be lost (optional refinement)
      // e.preventDefault();
      // e.returnValue = 'Bạn có chắc muốn rời trang? Dữ liệu chưa lưu có thể bị mất.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<AnimatedPage><LandingPage /></AnimatedPage>} />
        <Route path="/login" element={<AnimatedPage><LoginForm /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><RegisterForm /></AnimatedPage>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  const isDashboard = location.pathname === '/dashboard';
  const isChatbot = location.pathname === '/chatbot';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // Get user initials for avatar
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  let lastSection = null;

  return (
    <div className="app-container">
      {isDashboard && (
        <header className="App-header">
          <h1>English Learning Platform</h1>
          <p>Học tiếng Anh với AI - Hành trình nâng cao kỹ năng của bạn bắt đầu tại đây</p>
        </header>
      )}

      {!sidebarOpen && (
        <button
          className={`sidebar-toggle-floating closed-only ${isChatbot ? 'chatbot-pos' : 'default-pos'}`}
          onClick={() => setSidebarOpen(true)}
          title="Mở menu"
        >
          ☰
        </button>
      )}

      <div className="main-wrapper">
        {/* Overlay to close sidebar on outside click */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <nav className={`navbar sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          {/* Sidebar Brand */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-icon">🎓</span>
              <span className="brand-text">LearnAI</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="sidebar-user-section">
            <div className="sidebar-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className="sidebar-user-role">
                {user?.role === 'admin' ? '⭐ Admin' : '📝 Học viên'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <ul className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              const showSectionLabel = item.section !== lastSection && SECTION_LABELS[item.section];
              lastSection = item.section;

              return (
                <React.Fragment key={item.path}>
                  {showSectionLabel && (
                    <li className="nav-section-label">{showSectionLabel}</li>
                  )}
                  <li>
                    <Link
                      to={item.path}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      {isActive && <span className="nav-active-dot"></span>}
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}

            {/* Admin Section */}
            {user?.role === 'admin' && (
              <>
                <li className="nav-section-label">Quản trị</li>
                <li>
                  <Link
                    to="/admin"
                    className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Admin Control</span>
                    {location.pathname === '/admin' && <span className="nav-active-dot"></span>}
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Sidebar Footer */}
          <div className="sidebar-footer" style={{ display: 'flex', gap: '8px', padding: '14px 18px', borderTop: 'var(--border-subtle)' }}>
            <button className="theme-toggle-btn" onClick={toggleTheme} title={`Chuyển sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="logout-btn" onClick={handleLogout} style={{ flex: 1 }}>
              <span>🚪</span>
              <span style={{ marginLeft: '6px' }}>Đăng Xuất</span>
            </button>
            <button
              className={`sidebar-collapse-btn ${isChatbot ? 'chatbot-pos' : 'default-pos'}`}
              onClick={() => setSidebarOpen(false)}
              title="Thu gọn"
            >
              ◀
            </button>
          </div>
        </nav>

        <main className="main-content" style={{ position: 'relative' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/grammar" element={<AnimatedPage><Grammar /></AnimatedPage>} />
              <Route path="/vocabulary" element={<AnimatedPage><Vocabulary /></AnimatedPage>} />
              <Route path="/reading-vocab" element={<AnimatedPage><ReadingVocab /></AnimatedPage>} />
              <Route path="/sentence-writing" element={<AnimatedPage><SentenceWriting /></AnimatedPage>} />
              <Route path="/sentence-upgrade" element={<AnimatedPage><SentenceUpgrade /></AnimatedPage>} />
              <Route path="/pronunciation" element={<AnimatedPage><Pronunciation /></AnimatedPage>} />
              <Route path="/chatbot" element={<AnimatedPage><Chatbot /></AnimatedPage>} />
              <Route path="/roleplay" element={<AnimatedPage><Roleplay /></AnimatedPage>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { setToken, fetchUser } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        await fetchUser();
      }
      setLoading(false);
    };
    initApp();
  }, [setToken, fetchUser]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <ToastProvider>
        <ThemeProvider>
          <div className="App">
            <MainLayout />
          </div>
        </ThemeProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
