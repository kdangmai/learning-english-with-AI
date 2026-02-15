import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useUserStore } from './store/store';
import './App.css';

// Pages (Lazy Loaded)
import { LoginForm, RegisterForm } from './components/AuthForm';
import { ToastProvider } from './context/ToastContext';

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

// Loading Component
const PageLoader = () => (
  <div className="page-loader-wrapper">
    <div className="page-loader-spinner"></div>
    <span className="page-loader-text">Đang tải...</span>
  </div>
);

// Navigation items configuration
const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', section: 'main' },
  { path: '/grammar', icon: '📚', label: 'Học Ngữ Pháp', section: 'learn' },
  { path: '/vocabulary', icon: '📖', label: 'Từ Vựng', section: 'learn' },
  { path: '/sentence-writing', icon: '✍️', label: 'Luyện Dịch Câu', section: 'practice' },
  { path: '/sentence-upgrade', icon: '⏫', label: 'Nâng Cấp Câu', section: 'practice' },
  { path: '/pronunciation', icon: '🗣️', label: 'Luyện Phát Âm', section: 'practice' },
  { path: '/chatbot', icon: '🤖', label: 'Chatbot AI', section: 'ai' },
  { path: '/roleplay', icon: '🎭', label: 'Đóng Vai AI', section: 'ai' },
];

const SECTION_LABELS = {
  main: null, // no label for main
  learn: 'Học tập',
  practice: 'Luyện tập',
  ai: 'Trò chuyện AI',
};

function MainLayout() {
  const { isAuthenticated, user, logout } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Global Focus Page — confirm before reload/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Bạn có chắc muốn rời trang? Dữ liệu chưa lưu có thể bị mất.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="*" element={<Navigate to="/login" />} />
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

  // Group navigation items by section
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
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}>
              <span>🚪</span>
              <span>Đăng Xuất</span>
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

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/grammar" element={<Grammar />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/sentence-writing" element={<SentenceWriting />} />
              <Route path="/sentence-upgrade" element={<SentenceUpgrade />} />
              <Route path="/pronunciation" element={<Pronunciation />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/roleplay" element={<Roleplay />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
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
    return (
      <div className="app-splash">
        <div className="splash-content">
          <span className="splash-icon">🎓</span>
          <h2>LearnAI English</h2>
          <div className="splash-loader"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ToastProvider>
        <div className="App">
          <MainLayout />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;
