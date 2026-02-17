import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/store';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, user } = useUserStore();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        { icon: '🤖', title: 'AI Chatbot', desc: 'Trò chuyện tự nhiên với gia sư AI thông minh' },
        { icon: '📖', title: 'Học Từ Vựng', desc: 'Phương pháp SRS giúp ghi nhớ từ vựng lâu dài' },
        { icon: '✍️', title: 'Luyện Viết', desc: 'Sửa lỗi ngữ pháp và gợi ý cách viết hay hơn' },
        { icon: '🗣️', title: 'Phát Âm', desc: 'Check phát âm chuẩn xác từng từ với AI' },
    ];

    const testimonials = [
        { name: 'Minh Anh', role: 'Sinh viên', text: 'Nhờ LearnAI, mình đã tự tin giao tiếp tiếng Anh hơn hẳn!' },
        { name: 'Hoàng Nam', role: 'Developer', text: 'Công cụ tuyệt vời để luyện viết email và tài liệu kỹ thuật.' },
    ];

    return (
        <div className={`landing-page ${theme}`}>
            {/* Navbar */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-container nav-container">
                    <div className="logo">
                        <span className="logo-icon">🎓</span>
                        <span className="logo-text">LearnAI</span>
                    </div>
                    <div className="nav-links">
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="nav-btn-primary">Vào Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" className="nav-link">Đăng Nhập</Link>
                                <Link to="/register" className="nav-btn-primary">Đăng Ký Miễn Phí</Link>
                            </>
                        )}
                        <button className="theme-toggle-landing" onClick={toggleTheme}>
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="landing-hero">
                {/* Animated Background Blobs */}
                <div className="hero-blob blob-1"></div>
                <div className="hero-blob blob-2"></div>

                <div className="landing-container hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="hero-text"
                    >
                        <span className="hero-badge">✨ Phiên bản AI 2026</span>
                        <h1>Học Tiếng Anh <br /><span className="text-gradient">Đột Phá Với AI</span></h1>
                        <p className="hero-subtitle">
                            Nền tảng học tiếng Anh thông minh, cá nhân hóa lộ trình học tập của bạn cùng thầy Michael và trợ lý AI mạnh mẽ.
                        </p>
                        <div className="hero-cta">
                            <button onClick={() => navigate('/register')} className="cta-btn primary">Bắt Đầu Ngay 🚀</button>
                            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="cta-btn secondary">Tìm Hiểu Thêm</button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <strong>10k+</strong>
                                <span>Học viên</span>
                            </div>
                            <div className="stat-item">
                                <strong>500+</strong>
                                <span>Bài học</span>
                            </div>
                            <div className="stat-item">
                                <strong>24/7</strong>
                                <span>Hỗ trợ AI</span>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="hero-image"
                    >
                        <div className="hero-img-placeholder">
                            <div className="floating-card c1">
                                <span>💬</span> Chat Realtime
                            </div>
                            <div className="floating-card c2">
                                <span>📈</span> Progress Tracking
                            </div>
                            <div className="hero-circle"></div>
                            {/* Abstract decorative shapes */}
                            <div className="hero-shape shape-1"></div>
                            <div className="hero-shape shape-2"></div>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Features Section */}
            <section id="features" className="landing-features">
                <div className="landing-container">
                    <div className="section-header">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            Tại sao chọn LearnAI?
                        </motion.h2>
                        <p>Công nghệ tiên tiến giúp bạn học nhanh hơn, hiệu quả hơn.</p>
                    </div>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="feature-card"
                            >
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="landing-steps">
                <div className="landing-container">
                    <div className="section-header">
                        <h2>Lộ trình học tập 3 bước</h2>
                        <p>Đơn giản hóa quá trình chinh phục tiếng Anh của bạn.</p>
                    </div>
                    <div className="steps-grid">
                        {[
                            { step: '01', title: 'Đánh giá trình độ', desc: 'Làm bài test AI để xác định chính xác năng lực hiện tại của bạn.' },
                            { step: '02', title: 'Học cá nhân hóa', desc: 'Nhận lộ trình bài học và bài tập được "may đo" riêng cho bạn.' },
                            { step: '03', title: 'Theo dõi & Cải thiện', desc: 'Xem báo cáo tiến bộ chi tiết và nhận phản hồi tức thì từ AI.' }
                        ].map((item, index) => (
                            <motion.div
                                className="step-card"
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                            >
                                <div className="step-number">{item.step}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Teacher Section */}
            <section className="landing-teacher">
                <div className="landing-container teacher-content">
                    <div className="teacher-img">
                        {/* Placeholder for Teacher Image */}
                        <div className="teacher-placeholder">👨‍🏫</div>
                    </div>
                    <div className="teacher-info">
                        <h2>Học cùng thầy Michael</h2>
                        <p>
                            Với hơn 10 năm kinh nghiệm giảng dạy IELTS và tiếng Anh giao tiếp, thầy Michael đã xây dựng lộ trình học tập kết hợp công nghệ AI để giúp học viên Việt Nam vượt qua rào cản ngôn ngữ một cách tự nhiên nhất.
                        </p>
                        <ul className="teacher-benefits">
                            <li>✅ Lộ trình bài bản, khoa học</li>
                            <li>✅ Phương pháp giảng dạy hiện đại</li>
                            <li>✅ Cam kết đầu ra chất lượng</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="landing-testimonials">
                <div className="landing-container">
                    <h2 className="section-title">Học viên nói gì?</h2>
                    <div className="testimonials-grid">
                        {testimonials.map((t, i) => (
                            <div key={i} className="invoice-card">
                                <p className="invoice-text">"{t.text}"</p>
                                <div className="invoice-author">
                                    <div className="author-avatar">{t.name.charAt(0)}</div>
                                    <div>
                                        <h4>{t.name}</h4>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="landing-cta-bottom">
                <div className="landing-container">
                    <h2>Sẵn sàng chinh phục tiếng Anh?</h2>
                    <p>Tham gia cộng đồng hơn 10,000 người học ngay hôm nay.</p>
                    <button onClick={() => navigate('/register')} className="cta-btn large">Đăng Ký Tài Khoản Miễn Phí</button>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container footer-content">
                    <div className="footer-col">
                        <h3>LearnAI</h3>
                        <p>Nền tảng học tiếng Anh số 1 với AI.</p>
                    </div>
                    <div className="footer-col">
                        <h4>Liên kết</h4>
                        <Link to="#">Về chúng tôi</Link>
                        <Link to="#">Khóa học</Link>
                        <Link to="#">Blog</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Hỗ trợ</h4>
                        <Link to="#">FAQ</Link>
                        <Link to="#">Liên hệ</Link>
                        <Link to="#">Chính sách</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Kết nối</h4>
                        <div className="social-links">
                            <span>Facebook</span>
                            <span>Youtube</span>
                            <span>Tiktok</span>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 LearnAI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
