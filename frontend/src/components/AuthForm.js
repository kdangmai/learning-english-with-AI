import React, { useState } from 'react';
import './AuthForm.css';

export function LoginForm() {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">LearnEnglish AI</span>
        </div>
        <h2 className="auth-title">Chào mừng trở lại!</h2>
        <p className="auth-subtitle">Đăng nhập để tiếp tục hành trình học tiếng Anh</p>

        {error && (
          <div className="auth-message error">
            <span className="msg-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="emailOrUsername">Email hoặc Tên đăng nhập</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="emailOrUsername"
                name="emailOrUsername"
                value={formData.emailOrUsername}
                onChange={handleChange}
                required
                placeholder="your@email.com hoặc username"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                Đang xử lý...
              </>
            ) : 'Đăng Nhập →'}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <p className="auth-link">
          Chưa có tài khoản? <a href="/register">Đăng ký miễn phí</a>
        </p>
      </div>

      <div className="auth-features">
        <div className="feature-item">
          <span>📚</span>
          <div>
            <strong>Học từ vựng thông minh</strong>
            <p>SRS giúp bạn nhớ từ hiệu quả</p>
          </div>
        </div>
        <div className="feature-item">
          <span>🤖</span>
          <div>
            <strong>AI Chatbot</strong>
            <p>Thực hành hội thoại với AI</p>
          </div>
        </div>
        <div className="feature-item">
          <span>📝</span>
          <div>
            <strong>Ngữ pháp & Viết câu</strong>
            <p>Luyện tập với phản hồi chi tiết</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      setSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
      setFormData({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  return (
    <div className="auth-wrapper">
      <div className="auth-card register">
        <div className="auth-logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">LearnEnglish AI</span>
        </div>
        <h2 className="auth-title">Tạo tài khoản mới</h2>
        <p className="auth-subtitle">Bắt đầu hành trình học tiếng Anh cùng AI</p>

        {error && (
          <div className="auth-message error">
            <span className="msg-icon">⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="auth-message success">
            <span className="msg-icon">✅</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="fullName">Họ Tên</label>
              <div className="input-wrapper">
                <span className="input-icon">📛</span>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="username123"
                  autoComplete="username"
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                id="reg-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="reg-password">Mật khẩu</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="reg-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className={`input-wrapper ${passwordMatch ? 'match' : ''} ${passwordMismatch ? 'mismatch' : ''}`}>
                <span className="input-icon">{passwordMatch ? '✅' : passwordMismatch ? '❌' : '🔒'}</span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                Đang xử lý...
              </>
            ) : 'Tạo Tài Khoản →'}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <p className="auth-link">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
