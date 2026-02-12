import React, { useState, useRef } from 'react';
import './SentenceWriting.css';
import { useToast } from '../context/ToastContext';

const SUGGESTED_TOPICS = [
  { label: 'Travel', icon: '✈️' },
  { label: 'Technology', icon: '💻' },
  { label: 'Daily Life', icon: '☀️' },
  { label: 'Food', icon: '🍜' },
  { label: 'Environment', icon: '🌿' },
  { label: 'Education', icon: '📚' },
  { label: 'Business', icon: '💼' },
  { label: 'Hobbies', icon: '🎨' },
];

const DIFFICULTY_LEVELS = [
  { value: 'A1', label: 'Beginner', color: '#10b981' },
  { value: 'A2', label: 'Elementary', color: '#3b82f6' },
  { value: 'B1', label: 'Intermediate', color: '#6366f1' },
  { value: 'B2', label: 'Upper-Int', color: '#8b5cf6' },
  { value: 'C1', label: 'Advanced', color: '#f59e0b' },
  { value: 'C2', label: 'Expert', color: '#ef4444' },
];

export function SentenceWriting() {
  const [level, setLevel] = useState('A1');
  const [grammarLevel, setGrammarLevel] = useState('A1');
  const [topic, setTopic] = useState('');
  const [vietnameseSentence, setVietnameseSentence] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [translationFeedback, setTranslationFeedback] = useState(null);
  const [hints, setHints] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const textareaRef = useRef(null);

  const { error: showError, warning: showWarning, success: showSuccess } = useToast();

  const handleTopicClick = (t) => {
    setTopic(prev => prev === t ? '' : t);
  };

  const handleGenerateSentence = async () => {
    setIsGenerating(true);
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
        // Focus textarea after generating
        setTimeout(() => textareaRef.current?.focus(), 300);
      } else {
        showError('Lỗi: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating sentence:', error);
      showError('Lỗi khi tạo câu ngẫu nhiên');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGetHints = async () => {
    if (!vietnameseSentence.trim()) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleSubmitTranslation = async () => {
    if (!translationAnswer.trim()) {
      showWarning('Vui lòng nhập câu trả lời của bạn');
      return;
    }
    setIsLoading(true);
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
      setSessionCount(prev => prev + 1);

      const score = data.feedback?.score || 0;
      if (score >= 80) {
        showSuccess(`Tuyệt vời! Bạn đạt ${score}/100 điểm + XP`);
      } else {
        showWarning(`Đã chấm điểm: ${score}/100. Hãy xem lại lỗi nhé!`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      showError('Lỗi khi chấm bài');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmitTranslation();
    }
  };

  const wordCount = translationAnswer.trim() ? translationAnswer.trim().split(/\s+/).length : 0;

  return (
    <div className="sentence-page">
      {/* Header */}
      <div className="sentence-header">
        <div className="header-content">
          <h1>✍️ Luyện Dịch Câu</h1>
          <p>Rèn luyện kỹ năng viết và ngữ pháp thông qua việc dịch câu</p>
        </div>
        <div className="session-stats">
          {sessionCount > 0 && (
            <div className="session-badge">
              <span className="session-emoji">🔥</span>
              <span>{sessionCount} câu</span>
            </div>
          )}
          <div className="session-badge">
            <span className="session-emoji">🎯</span>
            <span>{level} · {grammarLevel}</span>
          </div>
        </div>
      </div>

      <div className="sentence-container">
        {/* ====== Settings Panel ====== */}
        <div className="settings-panel">
          <div className="settings-section">
            <div className="setting-group">
              <label>📊 Trình độ từ vựng</label>
              <div className="level-pills">
                {DIFFICULTY_LEVELS.map((l) => (
                  <button
                    key={l.value}
                    className={`level-pill ${level === l.value ? 'active' : ''}`}
                    onClick={() => setLevel(l.value)}
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
              <label>📝 Trình độ ngữ pháp</label>
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
              <label>🏷️ Chủ đề (Tùy chọn)</label>
              <div className="topic-input-wrapper">
                <span className="search-icon-sw">🔍</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Technology, Travel..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="topic-chips">
                {SUGGESTED_TOPICS.map((t) => (
                  <button
                    key={t.label}
                    className={`topic-chip ${topic === t.label ? 'active' : ''}`}
                    onClick={() => handleTopicClick(t.label)}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            className="generate-btn"
            onClick={handleGenerateSentence}
            disabled={isGenerating || isLoading}
          >
            {isGenerating ? (
              <>
                <span className="spinner-sw"></span>
                Đang tạo...
              </>
            ) : (
              '✨ Tạo câu mới'
            )}
          </button>
        </div>

        {/* ====== Workspace Panel ====== */}
        <div className="workspace-panel">
          {/* Vietnamese Sentence Card */}
          <div className={`prompt-card ${vietnameseSentence ? 'has-content' : ''}`}>
            <div className="card-label">🇻🇳 Câu tiếng Việt</div>
            <div className="vietnamese-text">
              {vietnameseSentence ? (
                vietnameseSentence
              ) : (
                <span className="placeholder-text-sw">
                  Hãy chọn thiết lập và nhấn "Tạo câu mới" để bắt đầu luyện tập...
                </span>
              )}
            </div>
            {vietnameseSentence && (
              <div className="prompt-actions">
                <button className="hint-btn" onClick={handleGetHints} disabled={isLoading || !!hints}>
                  💡 {hints ? 'Đã hiện gợi ý' : 'Gợi ý từ vựng'}
                </button>
                <button className="regenerate-btn" onClick={handleGenerateSentence} disabled={isGenerating}>
                  🔄 Câu khác
                </button>
              </div>
            )}
          </div>

          {/* Hints Card */}
          {hints && (
            <div className="hints-card bounce-in">
              <div className="hints-header">
                <span className="hints-icon">🗝️</span>
                <span>Gợi ý</span>
              </div>
              <div className="hints-content">
                {hints.vocabularyHints?.length > 0 && (
                  <div className="hint-column">
                    <strong>📖 Từ vựng key:</strong>
                    <ul>{hints.vocabularyHints.map((h, i) => <li key={i}>{h}</li>)}</ul>
                  </div>
                )}
                {hints.grammarStructures?.length > 0 && (
                  <div className="hint-column">
                    <strong>🔧 Cấu trúc:</strong>
                    <ul>{hints.grammarStructures.map((h, i) => <li key={i}>{h}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Translation Input Card */}
          <div className={`input-card ${vietnameseSentence ? '' : 'disabled'}`}>
            <div className="card-label">🇬🇧 Dịch sang tiếng Anh</div>
            <textarea
              ref={textareaRef}
              className="translation-input"
              value={translationAnswer}
              onChange={(e) => setTranslationAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu dịch của bạn tại đây..."
              disabled={!vietnameseSentence || isLoading}
            />
            <div className="input-footer">
              <div className="footer-left">
                <span className="word-count">{wordCount} từ</span>
                <span className="shortcut-hint">Ctrl+Enter để nộp</span>
              </div>
              <button
                className="submit-btn"
                onClick={handleSubmitTranslation}
                disabled={!translationAnswer.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-sw"></span>
                    Đang chấm...
                  </>
                ) : (
                  'Nộp bài 📤'
                )}
              </button>
            </div>
          </div>

          {/* Feedback Card */}
          {translationFeedback && (
            <div className="feedback-card bounce-in">
              <div className="feedback-header">
                <div className="score-badge" style={{
                  background: translationFeedback.score >= 80 ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                    translationFeedback.score >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                      'linear-gradient(135deg, #ef4444, #dc2626)'
                }}>
                  <span className="score-val">{translationFeedback.score}</span>
                  <span className="score-max">/100</span>
                </div>
                <div className="feedback-summary">
                  <h3>{translationFeedback.score >= 80 ? 'Xuất sắc! 🎉' : translationFeedback.score >= 50 ? 'Khá tốt! 👍' : 'Cần cố gắng! 💪'}</h3>
                  <p>Bạn đã nhận được điểm kinh nghiệm cho bài luyện tập này.</p>
                </div>
              </div>

              <div className="feedback-details">
                {translationFeedback.grammarErrors?.length > 0 ? (
                  <div className="feedback-block error">
                    <h4>🚫 Lỗi ngữ pháp</h4>
                    <ul>
                      {translationFeedback.grammarErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="feedback-block success">
                    <h4>✅ Ngữ pháp chính xác</h4>
                    <p>Không tìm thấy lỗi ngữ pháp đáng kể.</p>
                  </div>
                )}

                {translationFeedback.suggestions?.length > 0 && (
                  <div className="feedback-block suggestion">
                    <h4>✨ Gợi ý cải thiện</h4>
                    <ul>
                      {translationFeedback.suggestions.map((sug, i) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="feedback-actions">
                <button className="try-again-btn" onClick={() => {
                  setTranslationAnswer('');
                  setTranslationFeedback(null);
                  setHints(null);
                  textareaRef.current?.focus();
                }}>
                  Viết lại 🔄
                </button>
                <button className="next-sentence-btn" onClick={handleGenerateSentence}>
                  Câu tiếp theo ➡️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SentenceWriting;
