import React, { useState, useRef } from 'react';
import './SentenceWriting.css';
import { useToast } from '../context/ToastContext';

export function SentenceWriting() {
  // Translation State
  const [level, setLevel] = useState('A1');
  const [grammarLevel, setGrammarLevel] = useState('A1');
  const [topic, setTopic] = useState('');
  const [vietnameseSentence, setVietnameseSentence] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [translationFeedback, setTranslationFeedback] = useState(null);
  const [hints, setHints] = useState(null);
  const [loading, setLoading] = useState(false);
  const { error: showError, warning: showWarning } = useToast();

  // --- Translation Functions ---
  const handleGenerateSentence = async () => {
    setLoading(true);
    setTranslationFeedback(null);
    setTranslationAnswer('');
    setHints(null);
    try {
      const response = await fetch('/api/sentences/generate-random', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ difficulty: level, topic })
      });
      const data = await response.json();
      if (data.success) {
        setVietnameseSentence(data.vietnameseSentence);
      } else {
        showError('Lỗi: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating sentence:', error);
      showError('Lỗi khi tạo câu ngẫu nhiên');
    } finally {
      setLoading(false);
    }
  };

  const handleGetHints = async () => {
    if (!vietnameseSentence.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/sentences/get-hints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ vietnameseSentence, difficulty: level })
      });
      const data = await response.json();
      setHints(data.hints);
    } catch (error) {
      console.error('Error getting hints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTranslation = async () => {
    if (!translationAnswer.trim()) {
      showWarning('Vui lòng nhập câu trả lời');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/sentences/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vietnameseSentence,
          userAnswer: translationAnswer,
          difficulty: level,
          grammarDifficulty: grammarLevel
        })
      });
      const data = await response.json();
      setTranslationFeedback(data.feedback);
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sentence-writing-page">
      <div className="tabs">
        <h2>Luyện Tập Dịch Câu</h2>
      </div>

      <div className="tab-content" style={{ borderTopLeftRadius: '16px' }}>
        <div className="translation-panel">
          <div className="control-bar">
            <div className="filters-group">
              <div className="level-select">
                <label>Mức độ:</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="level-select">
                <label>Ngữ pháp:</label>
                <select value={grammarLevel} onChange={(e) => setGrammarLevel(e.target.value)}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="topic-input">
                <input
                  type="text"
                  placeholder="Chủ đề (VD: du lịch, công nghệ...)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

            </div>
            <button className="primary-btn" onClick={handleGenerateSentence} disabled={loading}>
              {loading ? '...' : 'Tạo Câu Mới'}
            </button>
          </div>

          <div className="work-area">
            <div className="input-section">
              <label>Câu Tiếng Việt:</label>
              <div className="vn-sentence-box">
                {vietnameseSentence || 'Nhấn "Tạo Câu Mới" để bắt đầu...'}
              </div>
              {vietnameseSentence && (
                <button className="hint-link" onClick={handleGetHints} disabled={loading}>
                  Cần gợi ý?
                </button>
              )}
            </div>

            <div className="input-section">
              <label>Dịch sang Tiếng Anh:</label>
              <textarea
                value={translationAnswer}
                onChange={(e) => setTranslationAnswer(e.target.value)}
                placeholder="Nhập câu dịch của bạn..."
                rows={4}
              />
              <button className="submit-btn" onClick={handleSubmitTranslation} disabled={loading}>
                {loading ? 'Đang chấm...' : 'Kiểm Tra'}
              </button>
            </div>
          </div>

          {/* Results/Hints Area */}
          <div className="feedback-area">
            {hints && (
              <div className="hints-box">
                <h4>Gợi Ý:</h4>
                {hints.vocabularyHints?.length > 0 && (
                  <div className="hint-group">
                    <strong>Từ vựng:</strong>
                    <ul>
                      {hints.vocabularyHints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {hints.grammarStructures?.length > 0 && (
                  <div className="hint-group">
                    <strong>Cấu trúc:</strong>
                    <ul>
                      {hints.grammarStructures.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {translationFeedback && (
              <div className="result-box">
                <div className="score-ring">
                  <span>{translationFeedback.score}</span>
                  <small>/100</small>
                </div>
                <div className="details">
                  {translationFeedback.grammarErrors?.length > 0 && (
                    <div className="error-list">
                      <h5>Lỗi ngữ pháp:</h5>
                      <ul>{translationFeedback.grammarErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )}
                  {translationFeedback.suggestions?.length > 0 && (
                    <div className="suggestion-list">
                      <h5>Gợi ý cải thiện:</h5>
                      <ul>{translationFeedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentenceWriting;
