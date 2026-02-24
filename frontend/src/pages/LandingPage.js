import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion, useInView } from 'framer-motion';
import { useUserStore } from '../store/store';
import './LandingPage.css';

/* ================================================================
   ANIMATED COUNTER HOOK
   ================================================================ */
function useCounter(end, duration = 2000, startOnView = true) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    useEffect(() => {
        if (!startOnView || !isInView) return;
        let start = 0;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end, duration, isInView, startOnView]);

    return { count, ref };
}

/* ================================================================
   LANDING PAGE COMPONENT
   ================================================================ */
function LandingPage() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated } = useUserStore();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* ─── Data ─── */
    const features = [
        { icon: '🤖', title: 'AI Chatbot', desc: 'Trò chuyện tự nhiên với gia sư AI thông minh, hỗ trợ mọi chủ đề tiếng Anh.' },
        { icon: '📖', title: 'Học Từ Vựng', desc: 'Phương pháp SRS khoa học giúp bạn ghi nhớ từ vựng lâu dài, hiệu quả.' },
        { icon: '✍️', title: 'Luyện Viết', desc: 'AI chấm điểm, sửa lỗi ngữ pháp và gợi ý cách diễn đạt tự nhiên hơn.' },
        { icon: '🗣️', title: 'Luyện Phát Âm', desc: 'Kiểm tra phát âm chuẩn xác từng từ với công nghệ nhận dạng giọng nói AI.' },
    ];

    const testimonials = [
        { name: 'Minh Anh', role: 'Sinh viên Đại học', text: 'Nhờ LearnAI, mình đã tự tin giao tiếp tiếng Anh hơn hẳn! Chatbot AI trả lời rất tự nhiên, như nói chuyện với người thật.', stars: 5 },
        { name: 'Hoàng Nam', role: 'Software Developer', text: 'Công cụ tuyệt vời để luyện viết email và tài liệu kỹ thuật bằng tiếng Anh. AI sửa lỗi rất chi tiết và chính xác.', stars: 5 },
        { name: 'Thu Hà', role: 'Product Manager', text: 'Tính năng SRS giúp mình nhớ từ vựng rất hiệu quả. Sau 3 tháng, vốn từ của mình đã tăng gấp đôi!', stars: 5 },
    ];

    const s1 = useCounter(10000, 2000);
    const s2 = useCounter(500, 1800);
    const s3 = useCounter(98, 1600);
    const s4 = useCounter(24, 1200);

    /* ─── Animation Variants ─── */
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
    };

    const stagger = {
        visible: { transition: { staggerChildren: 0.12 } },
    };

    return (
        <div className={`landing-page ${theme}`}>
            {/* ══════════ NAVBAR ══════════ */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-container nav-container">
                    <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <span className="logo-icon">🎓</span>
                        <span className="logo-text">LearnAI</span>
                    </div>
                    <div className="nav-links">
                        <button className="nav-anchor" onClick={() => scrollTo('features')}>Tính năng</button>
                        <button className="nav-anchor" onClick={() => scrollTo('how-it-works')}>Cách hoạt động</button>
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="nav-btn-primary">Vào Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" className="nav-link">Đăng Nhập</Link>
                                <Link to="/register" className="nav-btn-primary">Bắt Đầu Miễn Phí</Link>
                            </>
                        )}
                        <button className="theme-toggle-landing" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ══════════ HERO ══════════ */}
            <header className="landing-hero">
                <div className="hero-gradient-mesh">
                    <div className="hero-mesh-orb" />
                </div>

                <div className="landing-container hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        className="hero-text"
                    >
                        <span className="hero-badge">✨ Nền tảng AI hàng đầu 2026</span>
                        <h1>
                            Học Tiếng Anh<br />
                            <span className="text-gradient">Đột Phá Với AI</span>
                        </h1>
                        <p className="hero-subtitle">
                            Cá nhân hóa lộ trình học tập của bạn cùng trợ lý AI mạnh mẽ.
                            Chatbot thông minh, luyện viết, từ vựng SRS và phát âm — tất cả trong một nền tảng.
                        </p>
                        <div className="hero-cta">
                            <button onClick={() => navigate('/register')} className="cta-btn primary">
                                Bắt Đầu Ngay 🚀
                            </button>
                            <button onClick={() => scrollTo('features')} className="cta-btn secondary">
                                Tìm Hiểu Thêm ↓
                            </button>
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
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="hero-visual"
                    >
                        <div className="hero-visual-container">
                            {/* Floating cards */}
                            <div className="floating-card c1"><span>💬</span> Chat Realtime</div>
                            <div className="floating-card c2"><span>📈</span> Progress Tracking</div>
                            <div className="floating-card c3"><span>🏆</span> Leaderboard</div>

                            {/* AI Chat Mockup */}
                            <div className="hero-mockup">
                                <div className="mockup-header">
                                    <div className="mockup-dots">
                                        <span /><span /><span />
                                    </div>
                                    <div className="mockup-title">LearnAI Chat</div>
                                </div>
                                <div className="mockup-body">
                                    <div className="mock-msg ai">
                                        <div className="mock-avatar">🤖</div>
                                        <div className="mock-bubble">Hi! I'm your AI English tutor. What would you like to practice today? 😊</div>
                                    </div>
                                    <div className="mock-msg user">
                                        <div className="mock-avatar">👤</div>
                                        <div className="mock-bubble">I want to improve my speaking skills!</div>
                                    </div>
                                    <div className="mock-msg ai">
                                        <div className="mock-avatar">🤖</div>
                                        <div className="mock-bubble">Great choice! Let's start with a roleplay. Imagine you're ordering coffee ☕</div>
                                    </div>
                                    <div className="mock-msg user">
                                        <div className="mock-avatar">👤</div>
                                        <div className="mock-bubble">Can I have a latte, please? 🎯</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* ══════════ TRUSTED BY ══════════ */}
            <section className="landing-trusted">
                <div className="landing-container">
                    <div className="trusted-label">Được tin dùng bởi</div>
                    <div className="trusted-items">
                        {[
                            { icon: '🏛️', name: 'Đại học Bách Khoa' },
                            { icon: '🎓', name: 'ĐH Khoa học Tự nhiên' },
                            { icon: '📚', name: 'IELTS Academy' },
                            { icon: '💼', name: 'FPT Software' },
                            { icon: '🌐', name: 'VNG Corporation' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                className="trusted-item"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 0.6, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ opacity: 1 }}
                            >
                                <span className="trusted-icon">{item.icon}</span>
                                <span className="trusted-name">{item.name}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ FEATURES ══════════ */}
            <section id="features" className="landing-features">
                <div className="landing-container">
                    <div className="section-header">
                        <motion.span
                            className="section-badge"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            🎯 Tính năng nổi bật
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                        >
                            Tại sao chọn <span className="text-gradient">LearnAI?</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            Công nghệ AI tiên tiến giúp bạn học nhanh hơn, hiệu quả hơn và thú vị hơn.
                        </motion.p>
                    </div>

                    <motion.div
                        className="features-grid"
                        variants={stagger}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                variants={fadeUp}
                                transition={{ duration: 0.5 }}
                                whileHover={{ y: -8 }}
                                className="feature-card"
                            >
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ══════════ HOW IT WORKS ══════════ */}
            <section id="how-it-works" className="landing-steps">
                <div className="landing-container">
                    <div className="section-header">
                        <motion.span
                            className="section-badge"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            🛤️ Lộ trình
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                        >
                            Bắt đầu trong <span className="text-gradient">3 bước đơn giản</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            Chinh phục tiếng Anh chưa bao giờ dễ dàng đến thế.
                        </motion.p>
                    </div>

                    <div className="steps-grid">
                        {[
                            { num: '01', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí chỉ trong 30 giây. Không cần thẻ tín dụng.' },
                            { num: '02', title: 'Chọn mục tiêu', desc: 'AI phân tích trình độ và đề xuất lộ trình cá nhân hóa riêng cho bạn.' },
                            { num: '03', title: 'Học & Tiến bộ', desc: 'Luyện tập hàng ngày, nhận phản hồi tức thì và xem tiến bộ rõ rệt.' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                className="step-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                            >
                                <div className="step-number">{item.num}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ DEMO PREVIEW ══════════ */}
            <section className="landing-demo">
                <div className="landing-container">
                    <div className="demo-layout">
                        <motion.div
                            className="demo-info"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="section-badge">💬 Live Demo</span>
                            <h2>Trải nghiệm AI Chatbot <span className="text-gradient">ngay bây giờ</span></h2>
                            <p>Trò chuyện tự nhiên bằng tiếng Anh, nhận phản hồi ngữ pháp tức thì, và luyện tập theo chủ đề yêu thích.</p>
                            <div className="demo-features">
                                <div className="demo-feature-item">
                                    <div className="demo-feature-icon">⚡</div>
                                    <span>Phản hồi tức thì trong &lt;1 giây</span>
                                </div>
                                <div className="demo-feature-item">
                                    <div className="demo-feature-icon">🎭</div>
                                    <span>20+ kịch bản roleplay thực tế</span>
                                </div>
                                <div className="demo-feature-item">
                                    <div className="demo-feature-icon">📊</div>
                                    <span>Phân tích ngữ pháp chi tiết</span>
                                </div>
                                <div className="demo-feature-item">
                                    <div className="demo-feature-icon">🌍</div>
                                    <span>Hỗ trợ mọi trình độ A1 → C2</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="demo-window">
                                <div className="demo-header">
                                    <div className="demo-status-dot" />
                                    <span>AI Tutor — Online</span>
                                </div>
                                <div className="demo-messages">
                                    <div className="demo-msg ai">
                                        <div className="demo-msg-avatar">🤖</div>
                                        <div className="demo-msg-bubble">Let's practice ordering food! You walk into a restaurant. The waiter greets you. What do you say? 🍽️</div>
                                    </div>
                                    <div className="demo-msg user">
                                        <div className="demo-msg-avatar">👤</div>
                                        <div className="demo-msg-bubble">Hello, I want a table for two persons.</div>
                                    </div>
                                    <div className="demo-msg ai">
                                        <div className="demo-msg-avatar">🤖</div>
                                        <div className="demo-msg-bubble">Good try! Small correction: we say <strong>"a table for two"</strong> (not "two persons"). Also try: <em>"Could I get a table for two, please?"</em> — it sounds more natural! 🎯</div>
                                    </div>
                                    <div className="demo-msg user">
                                        <div className="demo-msg-avatar">👤</div>
                                        <div className="demo-msg-bubble">Could I get a table for two, please? 😄</div>
                                    </div>
                                </div>
                                <div className="demo-input-bar">
                                    <input type="text" placeholder="Nhập tin nhắn..." readOnly />
                                    <div className="demo-send-btn">➤</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ══════════ TEACHER ══════════ */}
            <section className="landing-teacher">
                <div className="landing-container teacher-content">
                    <motion.div
                        className="teacher-img"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="teacher-placeholder">👨‍🏫</div>
                    </motion.div>
                    <motion.div
                        className="teacher-info"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <span className="section-badge">🎓 Người sáng lập</span>
                        <h2>Học cùng thầy Michael</h2>
                        <p>
                            Với hơn 10 năm kinh nghiệm giảng dạy IELTS và tiếng Anh giao tiếp, thầy Michael đã xây dựng lộ trình học tập kết hợp công nghệ AI để giúp học viên Việt Nam vượt qua rào cản ngôn ngữ một cách tự nhiên nhất.
                        </p>
                        <ul className="teacher-benefits">
                            <li>✅ Lộ trình bài bản, khoa học — phù hợp mọi trình độ</li>
                            <li>✅ Phương pháp giảng dạy hiện đại kết hợp AI</li>
                            <li>✅ Cam kết đầu ra chất lượng — tiến bộ rõ rệt</li>
                        </ul>
                    </motion.div>
                </div>
            </section>

            {/* ══════════ STATS COUNTER ══════════ */}
            <section className="landing-stats-section">
                <div className="landing-container">
                    <div className="stats-grid">
                        <motion.div ref={s1.ref} className="stats-item" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <div className="stats-number">{s1.count.toLocaleString()}+</div>
                            <div className="stats-label">Học viên đang học</div>
                        </motion.div>
                        <motion.div ref={s2.ref} className="stats-item" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <div className="stats-number">{s2.count}+</div>
                            <div className="stats-label">Bài học đa dạng</div>
                        </motion.div>
                        <motion.div ref={s3.ref} className="stats-item" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            <div className="stats-number">{s3.count}%</div>
                            <div className="stats-label">Hài lòng</div>
                        </motion.div>
                        <motion.div ref={s4.ref} className="stats-item" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                            <div className="stats-number">{s4.count}/7</div>
                            <div className="stats-label">Hỗ trợ liên tục</div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ══════════ TESTIMONIALS ══════════ */}
            <section className="landing-testimonials">
                <div className="landing-container">
                    <div className="section-header">
                        <motion.span
                            className="section-badge"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            💬 Phản hồi
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                        >
                            Học viên nói gì về <span className="text-gradient">LearnAI?</span>
                        </motion.h2>
                    </div>
                    <motion.div
                        className="testimonials-grid"
                        variants={stagger}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {testimonials.map((t, i) => (
                            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }} className="testimonial-card">
                                <div className="testimonial-quote">"</div>
                                <div className="testimonial-stars">
                                    {Array.from({ length: t.stars }).map((_, j) => (
                                        <span key={j}>⭐</span>
                                    ))}
                                </div>
                                <p className="testimonial-text">{t.text}</p>
                                <div className="testimonial-author">
                                    <div className="author-avatar">{t.name.charAt(0)}</div>
                                    <div>
                                        <h4>{t.name}</h4>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ══════════ CTA BOTTOM ══════════ */}
            <section className="landing-cta-bottom">
                <div className="cta-glow" />
                <div className="landing-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2>Sẵn sàng chinh phục tiếng Anh?</h2>
                        <p>Tham gia cộng đồng hơn 10,000 người học ngay hôm nay. Hoàn toàn miễn phí.</p>
                        <button onClick={() => navigate('/register')} className="cta-btn large">
                            Đăng Ký Tài Khoản Miễn Phí 🚀
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* ══════════ FOOTER ══════════ */}
            <footer className="landing-footer">
                <div className="landing-container footer-content">
                    <div className="footer-col">
                        <h3>LearnAI</h3>
                        <p>Nền tảng học tiếng Anh số 1 với AI. Cá nhân hóa lộ trình, phản hồi tức thì, và cộng đồng sôi động.</p>
                    </div>
                    <div className="footer-col">
                        <h4>Sản phẩm</h4>
                        <Link to="#">AI Chatbot</Link>
                        <Link to="#">Học Từ Vựng</Link>
                        <Link to="#">Luyện Viết</Link>
                        <Link to="#">Phát Âm</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Hỗ trợ</h4>
                        <Link to="#">FAQ</Link>
                        <Link to="#">Liên hệ</Link>
                        <Link to="#">Chính sách</Link>
                        <Link to="#">Điều khoản</Link>
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
                    <p>© 2026 LearnAI. All rights reserved. Made with ❤️ in Vietnam.</p>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
