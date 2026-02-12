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
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <div className="loader">Loading...</div>
  </div>
);

function MainLayout() {
  const { isAuthenticated, user } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Auto-collapse sidebar when location changes (navigating to another page)
    setSidebarOpen(false);
  }, [location]);

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
          title="Mở rộng"
        >
          ▶
        </button>
      )}

      <div className="main-wrapper">
        <nav className={`navbar sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">Menu</span>
          </div>
          <ul>
            <li><Link to="/dashboard">📊 Dashboard</Link></li>
            <li><Link to="/grammar">📚 Học Ngữ Pháp</Link></li>
            <li><Link to="/vocabulary">📖 Từ Vựng</Link></li>
            <li><Link to="/sentence-writing">✍️ Luyện Tập Dịch Câu</Link></li>
            <li><Link to="/sentence-upgrade">⏫ Nâng Cấp Câu</Link></li>
            <li><Link to="/pronunciation">🗣️ Luyện Phát Âm</Link></li>
            <li><Link to="/chatbot">🤖 Chatbot AI</Link></li>
            <li><Link to="/roleplay">🎭 Đóng vai với AI</Link></li>
            {/* Admin Link */}
            {user?.role === 'admin' && (
              <li><div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }}></div></li>
            )}
            {user?.role === 'admin' && (
              <li><Link to="/admin" style={{ color: '#ef4444' }}>⚙️ Admin Control</Link></li>
            )}

            <li><a href="#logout" onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}>🚪 Đăng Xuất</a></li>
          </ul>
          <button
            className={`sidebar-toggle-btn-inner ${isChatbot ? 'chatbot-pos' : 'default-pos'}`}
            onClick={() => setSidebarOpen(false)}
            title="Thu gọn"
          >
            ◀
          </button>
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
    return <div className="loading">Loading...</div>;
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
