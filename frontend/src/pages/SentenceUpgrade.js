import React, { useState } from 'react';
import './SentenceWriting.css';
import { useToast } from '../context/ToastContext';

export function SentenceUpgrade() {
    const [upgradeInput, setUpgradeInput] = useState('');
    const [upgradeResult, setUpgradeResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [grammarLevel, setGrammarLevel] = useState('C1');
    const [vocabLevel, setVocabLevel] = useState('C1');

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const { warning: showWarning, error: showError } = useToast();

    const handleUpgrade = async () => {
        if (!upgradeInput.trim()) {
            showWarning('Vui lòng nhập nội dung cần nâng cấp');
            return;
        }
        setLoading(true);
        setUpgradeResult(null);
        try {
            const response = await fetch('/api/sentences/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userAnswer: upgradeInput, grammarLevel, vocabularyLevel: vocabLevel })
            });
            const data = await response.json();

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

    return (
        <div className="sentence-page">
            <div className="sentence-header">
                <div className="header-content">
                    <h1>🚀 Nâng Cấp Câu</h1>
                    <p>Biến câu văn đơn giản thành văn phong bản xứ chuyên nghiệp</p>
                </div>
            </div>

            <div className="sentence-container">
                {/* Settings Panel */}
                <div className="settings-panel">
                    <div className="setting-group">
                        <label>Mục tiêu Ngữ pháp</label>
                        <div className="level-pills">
                            {levels.map((l) => (
                                <button
                                    key={l}
                                    className={`level-pill secondary ${grammarLevel === l ? 'active' : ''}`}
                                    onClick={() => setGrammarLevel(l)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-group">
                        <label>Mục tiêu Từ vựng</label>
                        <div className="level-pills">
                            {levels.map((l) => (
                                <button
                                    key={l}
                                    className={`level-pill ${vocabLevel === l ? 'active' : ''}`}
                                    onClick={() => setVocabLevel(l)}
                                    style={{ '--level-color': '#0ea5e9' }}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-group">
                        <label>Hướng dẫn</label>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                            Nhập câu tiếng Anh của bạn vào ô bên phải. AI sẽ viết lại câu đó với ngữ pháp và từ vựng ở cấp độ bạn chọn (mặc định C1).
                        </p>
                    </div>
                </div>

                {/* Workspace */}
                <div className="workspace-panel">
                    {/* Input Area */}
                    <div className="input-card">
                        <div className="card-label">Câu của bạn</div>
                        <textarea
                            className="translation-input"
                            value={upgradeInput}
                            onChange={(e) => setUpgradeInput(e.target.value)}
                            placeholder="Ví dụ: I want to get a better job because I need more money..."
                            rows={5}
                        />
                        <div className="input-footer">
                            <span className="word-count">{upgradeInput.trim() ? upgradeInput.trim().split(/\s+/).length : 0} từ</span>
                            <button
                                className="submit-btn"
                                onClick={handleUpgrade}
                                disabled={loading || !upgradeInput.trim()}
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                                {loading ? 'Đang xử lý...' : 'Nâng cấp ngay ✨'}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    {upgradeResult && (
                        <div className="comparison-container">
                            <div className="diff-card upgraded">
                                <span className="diff-label">🌟 Phiên bản nâng cấp ({vocabLevel})</span>
                                <div className="diff-content">
                                    {upgradeResult.upgradedSentence}
                                </div>
                            </div>

                            {upgradeResult.improvements && upgradeResult.improvements.length > 0 && (
                                <div className="improvements-list">
                                    <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SentenceUpgrade;
