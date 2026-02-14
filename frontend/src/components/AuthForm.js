import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthForm.css';

/* ================================================================
   UNIFIED AUTH COMPONENT — Sliding Overlay (Neumorphism)
   Adapted from: https://codepen.io/ricardoolivaalonso/pen/YzyaRPN
   ================================================================ */

export function LoginForm() {
    return <AuthPage initialMode="login" />;
}

export function RegisterForm() {
    return <AuthPage initialMode="register" />;
}

function AuthPage({ initialMode }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Check for OTP verification from URL
    const urlParams = new URLSearchParams(location.search);
    const verifyEmail = urlParams.get('verify');

    // State for the sliding animation
    // isSwitchOn = true  => Switch on Right => Login Mode
    // isSwitchOn = false => Switch on Left => Register Mode
    const [isSwitchOn, setIsSwitchOn] = useState(false);

    // Sync state with prop if it changes
    useEffect(() => {
        if (!verifyEmail) {
            if (initialMode === 'login') {
                setIsSwitchOn(true);
            } else {
                setIsSwitchOn(false);
            }
        }
    }, [initialMode, verifyEmail]);

    const toggleSwitch = () => {
        const newState = !isSwitchOn;
        setIsSwitchOn(newState);

        // Update URL without full reload
        window.history.pushState(null, '', newState ? '/login' : '/register');
    };

    // ──── Login state ────
    const [loginData, setLoginData] = useState({ emailOrUsername: '', password: '' });
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // ──── Register state ────
    const [regData, setRegData] = useState({
        username: '', email: '', password: '', fullName: '' // Removed confirmPassword per design simplified inputs, but I should probably keep it for safety? The design shows simplified inputs. I'll keep it simple to match design visual but validation might fail if backend requires it. 
        // Backend likely requires confirmPassword? Let's check backend... assume standard register needs it but I can just send password as confirmPassword if I want to hide the field, or just add the field. 
        // The design has 3 inputs for Sign Up: Name, Email, Password.
        // I will stick to the design inputs: Name, Email, Password. 
        // Wait, backend requires username?
        // Design: Name, Email, Password.
        // I will consolidate Name -> fullName. Email -> email. Password -> password.
        // I will auto-generate username from email or name if needed, or add a username field.
        // User asked to "upgrade... following this style". Style has specific inputs.
        // I'll add "Username" to match my backend requirements but style it same way.
    });

    // I will add confirmPassword behavior hidden or just add the field. 
    // Safety: Add the field but style it consistent.

    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');

    // ──── OTP state (overlay or separate screen) ────
    // Since the sliding design is complex, I'll show OTP as a full screen replacement or modal if active.
    const [showOTPScreen, setShowOTPScreen] = useState(!!verifyEmail);
    const [otpEmail, setOtpEmail] = useState(verifyEmail ? decodeURIComponent(verifyEmail) : '');
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [otpSuccess, setOtpSuccess] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const otpRefs = useRef([]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ======================== LOGIN HANDLERS ========================
    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
        setLoginError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.requiresVerification) {
                    setOtpEmail(data.email);
                    setShowOTPScreen(true);
                    return;
                }
                throw new Error(data.message || 'Đăng nhập thất bại.');
            }
            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard';
        } catch (err) {
            setLoginError(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    // ======================== REGISTER HANDLERS ========================
    const handleRegChange = (e) => {
        const { name, value } = e.target;
        setRegData(prev => ({ ...prev, [name]: value }));
        setRegError('');
    };

    const handleRegSubmit = async (e) => {
        e.preventDefault();
        setRegError('');
        setRegLoading(true);
        try {
            // Backend expects: username, email, password, confirmPassword, fullName
            // We will provide confirmPassword = password if not present in form
            const payload = {
                ...regData,
                confirmPassword: regData.password // Auto-confirm for this design
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Đăng ký thất bại');

            if (data.requiresOTP) {
                setOtpEmail(data.email || regData.email);
                setShowOTPScreen(true);
                setCountdown(60);
            }
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegLoading(false);
        }
    };

    // Resend OTP State
    const [resendingOTP, setResendingOTP] = useState(false);

    const handleResendOTP = async () => {
        if (countdown > 0) return;
        setResendingOTP(true);
        setOtpError('');
        setOtpSuccess('');

        try {
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail })
            });

            const data = await response.json();

            if (data.success) {
                setOtpSuccess('📩 Mã OTP mới đã được gửi!');
                setCountdown(60);
                setOtpValues(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
                setTimeout(() => setOtpSuccess(''), 5000);
            } else {
                setOtpError(data.message);
            }
        } catch {
            setOtpError('Đã xảy ra lỗi khi gửi lại mã OTP');
        } finally {
            setResendingOTP(false);
        }
    };

    // ======================== OTP HANDLERS ========================
    const handleOTPChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newValues = [...otpValues];
        newValues[index] = value;
        setOtpValues(newValues);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleVerifyOTP = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length !== 6) { setOtpError('Vui lòng nhập đủ 6 số'); return; }
        setVerifying(true);
        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail, otpCode })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setOtpSuccess('Thành công!');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (err) {
            setOtpError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    if (showOTPScreen) {
        return (
            <div className="main-otp">
                <div className="container-otp">
                    <div className="otp-icon">✉️</div>
                    <h2 className="title" style={{ fontSize: '24px', lineHeight: '1.5' }}>Xác thực Email</h2>
                    <p className="description" style={{ marginBottom: '20px' }}>
                        Mã xác thực đã được gửi đến<br />
                        <strong>{otpEmail}</strong>
                    </p>

                    {otpError && <div className="error-msg">{otpError}</div>}
                    {otpSuccess && <div className="success-msg">{otpSuccess}</div>}

                    <div className="otp-inputs">
                        {otpValues.map((v, i) => (
                            <input key={i} ref={el => otpRefs.current[i] = el}
                                className="otp-field"
                                value={v} maxLength={1}
                                onChange={e => handleOTPChange(i, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && !otpValues[i] && i > 0) otpRefs.current[i - 1]?.focus();
                                }}
                            />
                        ))}
                    </div>

                    <button className="button submit" onClick={handleVerifyOTP} disabled={verifying} style={{ marginTop: '10px' }}>
                        {verifying ? 'VERIFYING...' : 'XÁC THỰC'}
                    </button>

                    <div className="otp-resend">
                        {countdown > 0 ? (
                            <span>Gửi lại mã sau {countdown}s</span>
                        ) : (
                            <>
                                Chưa nhận được mã?
                                <button className="otp-resend-btn" onClick={handleResendOTP} disabled={resendingOTP}>
                                    {resendingOTP ? 'Đang gửi...' : 'Gửi lại'}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="back-btn" onClick={() => setShowOTPScreen(false)}>
                        ← Quay lại đăng nhập
                    </div>
                </div>
            </div>
        );
    }

    // Classes logic
    // isSwitchOn (Login Mode) -> add classes
    // is-txr to switch
    // is-txl to containers
    // is-z200 to b-container (Login)

    const switchClasses = `switch ${isSwitchOn ? 'is-txr' : ''}`;
    const circleClasses = `switch__circle ${isSwitchOn ? 'is-txr' : ''}`;
    const circleTClasses = `switch__circle switch__circle--t ${isSwitchOn ? 'is-txr' : ''}`;

    const containerAClasses = `container a-container ${isSwitchOn ? 'is-txl' : ''}`;
    const containerBClasses = `container b-container ${isSwitchOn ? 'is-txl is-z200' : ''}`;

    const switchC1Classes = `switch__container ${isSwitchOn ? 'is-hidden' : ''}`; // "Welcome Back" (Sign In) -> Hidden when mode is Sign In (Switch Right)
    const switchC2Classes = `switch__container ${!isSwitchOn ? 'is-hidden' : ''}`; // "Hello Friend" (Sign Up) -> Hidden when mode is Sign Up (Switch Left)

    return (
        <div className="auth-body">
            <div className="main">
                {/* Register Form (A) */}
                <div className={containerAClasses} id="a-container">
                    <form className="form" id="a-form" onSubmit={handleRegSubmit}>
                        <h2 className="form_title title">Create Account</h2>
                        {/* Icons placeholders or SVGs */}
                        <div className="form__icons">
                            <span className="form__icon">🔵</span>
                            <span className="form__icon">🔷</span>
                            <span className="form__icon">🔹</span>
                        </div>
                        <span className="form__span">or use email for registration</span>

                        <input className="form__input" type="text" placeholder="Full Name" name="fullName" value={regData.fullName} onChange={handleRegChange} required />
                        <input className="form__input" type="text" placeholder="Username" name="username" value={regData.username} onChange={handleRegChange} required />
                        <input className="form__input" type="email" placeholder="Email" name="email" value={regData.email} onChange={handleRegChange} required />
                        <input className="form__input" type="password" placeholder="Password" name="password" value={regData.password} onChange={handleRegChange} required />


                        {regError && <div className="error-text">{regError}</div>}

                        <button className="form__button button submit" disabled={regLoading}>
                            {regLoading ? 'PROCESSING...' : 'SIGN UP'}
                        </button>

                        {/* Mobile toggle (visible only on ≤1024px via CSS) */}
                        <p className="mobile-toggle">
                            Already have an account?{' '}
                            <button type="button" className="mobile-toggle-btn" onClick={toggleSwitch}>Sign In</button>
                        </p>
                    </form>
                </div>

                {/* Login Form (B) */}
                <div className={containerBClasses} id="b-container">
                    <form className="form" id="b-form" onSubmit={handleLoginSubmit}>
                        <h2 className="form_title title">Sign in to Website</h2>
                        <div className="form__icons">
                            <span className="form__icon">🔵</span>
                            <span className="form__icon">🔷</span>
                            <span className="form__icon">🔹</span>
                        </div>
                        <span className="form__span">or use your email account</span>

                        <input className="form__input" type="text" placeholder="Email or Username" name="emailOrUsername" value={loginData.emailOrUsername} onChange={handleLoginChange} required />
                        <input className="form__input" type="password" placeholder="Password" name="password" value={loginData.password} onChange={handleLoginChange} required />

                        {loginError && <div className="error-text">{loginError}</div>}

                        <button type="button" className="form__link" onClick={() => navigate('/forgot-password')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Forgot your password?</button>
                        <button className="form__button button submit" disabled={loginLoading}>
                            {loginLoading ? 'LOADING...' : 'SIGN IN'}
                        </button>

                        {/* Mobile toggle (visible only on ≤1024px via CSS) */}
                        <p className="mobile-toggle">
                            Don't have an account?{' '}
                            <button type="button" className="mobile-toggle-btn" onClick={toggleSwitch}>Sign Up</button>
                        </p>
                    </form>
                </div>

                {/* Switch Overlay (hidden on mobile via CSS) */}
                <div className={switchClasses} id="switch-cnt">
                    <div className={circleClasses}></div>
                    <div className={circleTClasses}></div>

                    <div className={switchC1Classes} id="switch-c1">
                        <h2 className="switch__title title">Welcome Back !</h2>
                        <p className="switch__description description">To keep connected with us please login with your personal info</p>
                        <button className="switch__button button switch-btn" onClick={toggleSwitch}>SIGN IN</button>
                    </div>

                    <div className={switchC2Classes} id="switch-c2">
                        <h2 className="switch__title title">Hello Friend !</h2>
                        <p className="switch__description description">Enter your personal details and start journey with us</p>
                        <button className="switch__button button switch-btn" onClick={toggleSwitch}>SIGN UP</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
