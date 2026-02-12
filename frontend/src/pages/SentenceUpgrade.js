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
    const { warning: showWarning } = useToast();

    const handleUpgrade = async () => {
        if (!upgradeInput.trim()) {
            showWarning('Vui lòng nhập nội dung cần nâng cấp');
            return;
        }
        setLoading(true);
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
            setUpgradeResult({
                upgradedSentence: data.upgradedSentence,
                improvements: data.improvements
            });
        } catch (error) {
            console.error('Error upgrading:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sentence-writing-page">
            <div className="tabs">
                <h2>Nâng Cấp Câu</h2>
            </div>

            <div className="tab-content" style={{ borderTopLeftRadius: '16px' }}>
                <div className="upgrade-panel">
                    <div className="input-section full-width">
                        <div className="options-row" style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Grammar Complexity:</label>
                                <select value={grammarLevel} onChange={e => setGrammarLevel(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '100px' }}>
                                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Vocabulary Difficulty:</label>
                                <select value={vocabLevel} onChange={e => setVocabLevel(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '100px' }}>
                                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                        <label>Nhập câu hoặc đoạn văn tiếng Anh của bạn:</label>
                        <textarea
                            value={upgradeInput}
                            onChange={(e) => setUpgradeInput(e.target.value)}
                            placeholder="I want to improve this sentence..."
                            rows={6}
                        />
                        <button className="primary-btn" onClick={handleUpgrade} disabled={loading}>
                            {loading ? 'Đang nâng cấp...' : 'Nâng Cấp Ngay'}
                        </button>
                    </div>

                    {upgradeResult && (
                        <div className="upgrade-result">
                            <div className="original-review">
                                <label>Phiên bản nâng cấp:</label>
                                <div className="upgraded-text">{upgradeResult.upgradedSentence}</div>
                            </div>
                            {upgradeResult.improvements && (
                                <div className="improvements-list">
                                    <h5>Những thay đổi chính:</h5>
                                    <ul>
                                        {upgradeResult.improvements.map((imp, idx) => (
                                            <li key={idx}>
                                                <span className="diff-highlight">"{imp.original}"</span> ➜ <span className="diff-highlight">"{imp.improved}"</span>
                                                <br />
                                                <small>{imp.explanation}</small>
                                            </li>
                                        ))}
                                    </ul>
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
