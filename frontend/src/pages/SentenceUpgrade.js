import React, { useState } from 'react';
import './SentenceWriting.css';
import { useToast } from '../context/ToastContext';
import { sentenceAPI } from '../services/api';

const DIFFICULTY_LEVELS = [
    { value: 'A1', label: 'Beginner', color: '#10b981' },
    { value: 'A2', label: 'Elementary', color: '#3b82f6' },
    { value: 'B1', label: 'Intermediate', color: '#6366f1' },
    { value: 'B2', label: 'Upper-Int', color: '#8b5cf6' },
    { value: 'C1', label: 'Advanced', color: '#f59e0b' },
    { value: 'C2', label: 'Expert', color: '#ef4444' },
];

export function SentenceUpgrade() {
    const [upgradeInput, setUpgradeInput] = useState('');
    const [upgradeResult, setUpgradeResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [grammarLevel, setGrammarLevel] = useState('C1');
    const [vocabLevel, setVocabLevel] = useState('C1');

    const { warning: showWarning, error: showError } = useToast();

    const handleUpgrade = async () => {
        if (!upgradeInput.trim()) {
            showWarning('Vui lòng nhập nội dung cần nâng cấp');
            return;
        }
        setLoading(true);
        setUpgradeResult(null);
        try {
            const response = await sentenceAPI.upgradeSentence({
                userAnswer: upgradeInput,
                grammarLevel,
                vocabularyLevel: vocabLevel
            });
            const data = response.data;

            if (data.success) {
                setUpgradeResult({
                    upgradedSentence: data.upgradedSentence,
                    improvements: data.improvements
                });
            } else {
                showError(data.message || 'Lỗi khi nâng cấp câu');
            }
        } catch (error) {
            console.error('Error upgrading:', error);
            showError('Lỗi kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleUpgrade();
        }
    };

    const handleCopy = () => {
        if (upgradeResult?.upgradedSentence) {
            navigator.clipboard.writeText(upgradeResult.upgradedSentence);
        }
    };

    const wordCount = upgradeInput.trim() ? upgradeInput.trim().split(/\s+/).length : 0;

    return (
        <div className="sentence-page">
            {/* Header */}
            <div className="sentence-header">
                <div className="header-content">
                    <h1>🚀 Nâng Cấp Câu</h1>
                    <p>Biến câu văn đơn giản thành văn phong bản xứ chuyên nghiệp</p>
                </div>
                <div className="session-stats">
                    <div className="session-badge">
                        <span className="session-emoji">🎯</span>
                        <span>Grammar: {grammarLevel} · Vocab: {vocabLevel}</span>
                    </div>
                </div>
            </div>

            <div className="sentence-container">
                {/* Settings Panel */}
                <div className="settings-panel">
                    <div className="settings-section">
                        <div className="setting-group">
                            <label>📝 Mục tiêu ngữ pháp</label>
                            <div className="level-pills">
                                {DIFFICULTY_LEVELS.map((l) => (
                                    <button
                                        key={l.value}
                                        className={`level-pill secondary ${grammarLevel === l.value ? 'active' : ''}`}
                                        onClick={() => setGrammarLevel(l.value)}
                                        style={{ '--level-color': l.color }}
                                        title={l.label}
                                    >
                                        <span className="pill-value">{l.value}</span>
                                        <span className="pill-label">{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="setting-group">
                            <label>📊 Mục tiêu từ vựng</label>
                            <div className="level-pills">
                                {DIFFICULTY_LEVELS.map((l) => (
                                    <button
                                        key={l.value}
                                        className={`level-pill ${vocabLevel === l.value ? 'active' : ''}`}
                                        onClick={() => setVocabLevel(l.value)}
                                        style={{ '--level-color': l.color }}
                                        title={l.label}
                                    >
                                        <span className="pill-value">{l.value}</span>
                                        <span className="pill-label">{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="setting-group">
                            <label>📖 Hướng dẫn</label>
                            <p className="instruction-text">
                                Nhập câu tiếng Anh của bạn vào ô bên phải. AI sẽ viết lại câu đó với ngữ pháp và từ vựng ở cấp độ bạn chọn.
                            </p>
                        </div>
                    </div>

                    <button
                        className="generate-btn upgrade-generate-btn"
                        onClick={handleUpgrade}
                        disabled={loading || !upgradeInput.trim()}
                    >
                        {loading ? (
                            <><span className="spinner-sw"></span> Đang xử lý...</>
                        ) : (
                            '✨ Nâng cấp câu'
                        )}
                    </button>
                </div>

                {/* Workspace Panel */}
                <div className="workspace-panel">
                    {/* Input Area */}
                    <div className="input-card">
                        <div className="card-label">✏️ Câu của bạn</div>
                        <textarea
                            className="translation-input"
                            value={upgradeInput}
                            onChange={(e) => setUpgradeInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ví dụ: I want to get a better job because I need more money..."
                        />
                        <div className="input-footer">
                            <div className="footer-left">
                                <span className="word-count">{wordCount} từ</span>
                                <span className="shortcut-hint">Ctrl+Enter để nâng cấp</span>
                            </div>
                            <button
                                className="submit-btn upgrade-submit-btn"
                                onClick={handleUpgrade}
                                disabled={loading || !upgradeInput.trim()}
                            >
                                {loading ? (
                                    <><span className="spinner-sw"></span> Đang xử lý...</>
                                ) : (
                                    'Nâng cấp ✨'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    {upgradeResult && (
                        <div className="comparison-container bounce-in">
                            {/* Upgraded Version */}
                            <div className="diff-card upgraded">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="diff-label">🌟 Phiên bản nâng cấp ({vocabLevel})</span>
                                    <button className="regenerate-btn" onClick={handleCopy} style={{ fontSize: '0.78rem' }}>
                                        📋 Copy
                                    </button>
                                </div>
                                <div className="diff-content">{upgradeResult.upgradedSentence}</div>
                            </div>

                            {/* Improvements Detail */}
                            {upgradeResult.improvements && upgradeResult.improvements.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <h4 className="improvements-header">
                                        Chi tiết thay đổi
                                    </h4>
                                    {upgradeResult.improvements.map((imp, idx) => (
                                        <div key={idx} className="improvement-item bounce-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                                            <div className="change-row">
                                                <span className="old-val">{imp.original}</span>
                                                <span className="arrow-icon">➜</span>
                                                <span className="new-val">{imp.improved}</span>
                                            </div>
                                            <p className="explanation-text">{imp.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Try again */}
                            <div className="feedback-actions" style={{ marginTop: 16 }}>
                                <button className="try-again-btn" onClick={() => { setUpgradeInput(''); setUpgradeResult(null); }}>
                                    Câu khác 🔄
                                </button>
                                <button className="next-sentence-btn" onClick={handleUpgrade} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                    Nâng cấp lại ✨
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SentenceUpgrade;
