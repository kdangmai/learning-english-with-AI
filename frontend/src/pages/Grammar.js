import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './Grammar.css';
import { useToast } from '../context/ToastContext';
import { grammarAPI } from '../services/api';



const TENSE_GROUPS = [
  { label: 'Present', icon: '🟢', color: '#22c55e', tenses: ['Simple Present', 'Present Continuous', 'Present Perfect', 'Present Perfect Continuous'] },
  { label: 'Past', icon: '🔵', color: '#3b82f6', tenses: ['Simple Past', 'Past Continuous', 'Past Perfect', 'Past Perfect Continuous'] },
  { label: 'Future', icon: '🟣', color: '#8b5cf6', tenses: ['Simple Future', 'Future Continuous', 'Future Perfect', 'Future Perfect Continuous'] },
];

const TENSE_SHORT = {
  'Simple Present': 'Hiện tại đơn', 'Present Continuous': 'Hiện tại tiếp diễn',
  'Present Perfect': 'Hiện tại hoàn thành', 'Present Perfect Continuous': 'HT hoàn thành TD',
  'Simple Past': 'Quá khứ đơn', 'Past Continuous': 'Quá khứ tiếp diễn',
  'Past Perfect': 'Quá khứ hoàn thành', 'Past Perfect Continuous': 'QK hoàn thành TD',
  'Simple Future': 'Tương lai đơn', 'Future Continuous': 'TL tiếp diễn',
  'Future Perfect': 'TL hoàn thành', 'Future Perfect Continuous': 'TL hoàn thành TD',
};

const QTYPE_LABELS = {
  mcq: { label: 'Trắc nghiệm', icon: '🔘', color: '#6366f1' },
  fill: { label: 'Điền từ', icon: '✏️', color: '#f59e0b' },
  rewrite: { label: 'Viết lại câu', icon: '✍️', color: '#ec4899' },
  find_error: { label: 'Tìm lỗi sai', icon: '🔍', color: '#ef4444' },
  reorder: { label: 'Sắp xếp', icon: '🔀', color: '#06b6d4' },
};

function getAccuracyMessage(percent) {
  if (percent >= 90) return { emoji: '🏆', text: 'Xuất sắc!', sub: 'Bạn nắm vững thì này rất tốt!' };
  if (percent >= 70) return { emoji: '🎉', text: 'Tuyệt vời!', sub: 'Bạn đã hiểu khá tốt rồi!' };
  if (percent >= 50) return { emoji: '💪', text: 'Khá tốt!', sub: 'Cần luyện thêm một chút nữa!' };
  return { emoji: '📚', text: 'Cần cố gắng!', sub: 'Hãy xem lại lý thuyết và thử lại nhé!' };
}

export function Grammar() {
  const [selectedTense, setSelectedTense] = useState(null);
  const { error: showError } = useToast();
  const [tenses, setTenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenseDetails, setTenseDetails] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [reorderWords, setReorderWords] = useState([]);
  const [pointAnimation, setPointAnimation] = useState(false);
  const [questionAnim, setQuestionAnim] = useState('');
  const [answersTracker, setAnswersTracker] = useState([]);
  const exerciseRef = useRef(null);

  // Memoized progress map
  const progressMap = useMemo(() => {
    const map = {};
    tenses.forEach(t => { map[t.tenseName] = t.progress || 0; });
    return map;
  }, [tenses]);

  const completedCount = useMemo(() => {
    return tenses.filter(t => (t.progress || 0) >= 100).length;
  }, [tenses]);

  useEffect(() => { fetchTenses(); }, []);

  useEffect(() => {
    if (selectedTense) {
      fetchTenseDetails(selectedTense);
      resetExercise();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTense]);

  // Sync reorder words
  useEffect(() => {
    if (exercises?.length > 0) {
      const currentQ = exercises[currentQuestionIndex];
      if (currentQ?.type === 'reorder' && reorderWords.length === 0) {
        let wordsToShuffle = currentQ.words?.length > 0
          ? [...currentQ.words]
          : (currentQ.correctAnswer || '').split(' ');
        if (wordsToShuffle.length > 0) {
          setReorderWords([...wordsToShuffle].sort(() => Math.random() - 0.5));
        }
      }
    }
  }, [currentQuestionIndex, exercises, reorderWords.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!exerciseStarted || !exercises.length) return;
      const currentQ = exercises[currentQuestionIndex];

      if (e.key === 'Enter') {
        e.preventDefault();
        if (feedback) {
          nextQuestion();
        } else if (selectedAnswer) {
          checkAnswer();
        }
      }

      // MCQ shortcuts: a, b, c, d
      if (!feedback && currentQ?.type === 'mcq' && currentQ.options) {
        const key = e.key.toUpperCase();
        if (currentQ.options[key]) {
          handleAnswerChange(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseStarted, exercises, currentQuestionIndex, feedback, selectedAnswer]);

  const resetExercise = useCallback(() => {
    setExerciseStarted(false);
    setExercises([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setSelectedAnswer(null);
    setReorderWords([]);
    setAnswersTracker([]);
    setQuestionAnim('');
  }, []);

  const handleSkip = useCallback(() => {
    setFeedback({ isCorrect: false, message: '🤷 Đã bỏ qua' });
    setAnswersTracker(prev => [...prev, false]);
  }, []);

  const fetchTenses = async () => {
    try {
      const response = await grammarAPI.getTenses();
      const data = response.data;
      if (data.success) setTenses(data.tenses);
    } catch (error) {
      console.error('Error fetching tenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenseDetails = async (tenseName) => {
    try {
      const response = await grammarAPI.getTenseDetails(tenseName);
      const data = response.data;
      if (data.success) setTenseDetails(data.tense);
    } catch (error) {
      console.error('Error fetching tense details:', error);
    }
  };

  const startExercises = async () => {
    setLoadingExercises(true);
    try {
      const response = await grammarAPI.generateExercises(selectedTense);
      const data = response.data;
      if (data.success && data.exercises?.length > 0) {
        setExercises(data.exercises);
        setExerciseStarted(true);
        setAnswersTracker([]);
        setQuestionAnim('slide-in');
      } else {
        showError(data.message || 'Không thể tạo bài tập. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error generating exercises:', error);
      showError('Lỗi kết nối: ' + error.message);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleAnswerChange = useCallback((val) => {
    if (feedback?.isCorrect) return;
    setSelectedAnswer(val);
  }, [feedback]);


  const checkAnswer = useCallback(() => {
    if (!selectedAnswer) return;
    const currentQ = exercises[currentQuestionIndex];
    let isCorrect = false;

    const norm = (str) => str?.toString().toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
    const normStrict = (str) => str?.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (currentQ.type === 'mcq') {
      isCorrect = selectedAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'fill') {
      isCorrect = norm(selectedAnswer) === norm(currentQ.correctAnswer);
    } else if (currentQ.type === 'rewrite') {
      isCorrect = norm(selectedAnswer) === norm(currentQ.correctAnswer);
    } else if (currentQ.type === 'find_error') {
      isCorrect = (selectedAnswer || '').trim() === (currentQ.correctAnswer || '').trim();
    } else if (currentQ.type === 'reorder') {
      isCorrect = normStrict(selectedAnswer) === normStrict(currentQ.correctAnswer);
    }

    setFeedback({
      isCorrect,
      message: isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng, thử lại nhé!'
    });

    setAnswersTracker(prev => [...prev, isCorrect]);

    if (isCorrect) {
      setScore(s => s + 1);
      setPointAnimation(true);
      setTimeout(() => setPointAnimation(false), 1000);
    }
  }, [selectedAnswer, exercises, currentQuestionIndex]);

  const nextQuestion = useCallback(() => {
    setQuestionAnim('slide-out');
    setTimeout(() => {
      setSelectedAnswer(null);
      setFeedback(null);
      setReorderWords([]);
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionAnim('slide-in');
    }, 200);
  }, []);

  const handleFinishSession = async () => {
    try {
      const total = exercises.length;
      const answers = [];
      for (let i = 0; i < total; i++) {
        answers.push({ isCorrect: i < score });
      }

      const response = await grammarAPI.submitExercise({ tenseName: selectedTense, answers });
      const data = response.data;
      if (data.success) {
        fetchTenses();
        setSelectedTense(null);
        resetExercise();
      } else {
        showError(data.message || 'Lỗi lưu kết quả');
      }
    } catch (error) {
      console.error('Save error:', error);
      showError('Không thể lưu kết quả');
    }
  };

  // Render exercise question
  const renderExercise = () => {
    const q = exercises[currentQuestionIndex];
    const qType = QTYPE_LABELS[q.type] || { label: q.type, icon: '❓', color: '#64748b' };

    return (
      <div className={`question-content ${questionAnim}`}>
        <div className="qtype-badge" style={{ '--qtype-color': qType.color }}>
          <span>{qType.icon}</span> {qType.label}
        </div>

        {q.type === 'mcq' && (
          <div>
            <p className="question-text">{q.question}</p>
            <div className="options-grid">
              {Object.entries(q.options).map(([key, value]) => {
                const isSelected = selectedAnswer === key;
                let className = 'option-btn';
                if (feedback) {
                  if (key === q.correctAnswer) className += ' correct';
                  else if (isSelected) className += ' wrong';
                } else if (isSelected) {
                  className += ' selected';
                }
                return (
                  <button key={key} className={className} onClick={() => handleAnswerChange(key)} disabled={!!feedback}>
                    <span className="option-key">{key}</span> {value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {q.type === 'rewrite' && (
          <div className="rewrite-area">
            <p className="question-text">{q.question}</p>
            <textarea
              className="rewrite-input"
              value={selectedAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={!!feedback}
              placeholder="Nhập câu viết lại..."
            />
          </div>
        )}

        {q.type === 'reorder' && (
          <div className="reorder-area">
            <p className="question-text">{q.question}</p>
            <div className="constructed-sentence">
              {selectedAnswer ? (
                selectedAnswer.split(' ').map((w, i) => (
                  <span key={i} className="word-chip used" onClick={() => {
                    if (feedback) return;
                    const newAns = selectedAnswer.split(' ');
                    newAns.splice(i, 1);
                    setSelectedAnswer(newAns.join(' ') || null);
                  }}>{w}</span>
                ))
              ) : <span className="placeholder-text">{feedback ? '' : 'Bấm vào từ bên dưới để ghép câu...'}</span>}
            </div>

            {selectedAnswer && !feedback && (
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <button className="reset-sentence-btn" onClick={() => setSelectedAnswer(null)}>
                  ↺ Xoá hết
                </button>
              </div>
            )}

            <div className="words-pool">
              {(!reorderWords || reorderWords.length === 0) ? (
                <div style={{ textAlign: 'center', width: '100%', padding: '20px' }}>
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '10px' }}>Đang tải từ vựng...</p>
                  <button onClick={() => {
                    const words = q.words?.length > 0 ? q.words : (q.correctAnswer || '').split(' ');
                    setReorderWords(words.sort(() => Math.random() - 0.5));
                  }} className="reload-words-btn">Tải lại</button>
                </div>
              ) : (
                reorderWords.map((w, i) => {
                  const currentSelection = (selectedAnswer || '').trim();
                  const usedCount = currentSelection ? currentSelection.split(' ').filter(x => x === w).length : 0;
                  const totalCount = reorderWords.filter(x => x === w).length;
                  if (usedCount >= totalCount) return null;
                  return (
                    <span key={i} className="word-chip" onClick={() => {
                      if (feedback) return;
                      setSelectedAnswer(selectedAnswer ? selectedAnswer + ' ' + w : w);
                    }}>{w}</span>
                  );
                })
              )}
            </div>
          </div>
        )}

        {q.type === 'find_error' && (() => {
          const parts = q.question.split(/\*\*(.*?)\*\*/g);
          return (
            <div className="error-find-area">
              <p className="question-text">
                {parts.map((part, i) => {
                  if (i % 2 === 1) {
                    const isSelected = selectedAnswer === part;
                    let className = 'error-highlight';
                    if (feedback) {
                      if (part.trim() === (q.correctAnswer || '').trim()) className += ' correct-error';
                      else if (isSelected) className += ' wrong-error';
                    } else if (isSelected) {
                      className += ' selected-error';
                    }
                    return (
                      <span key={i} className={className} onClick={() => handleAnswerChange(part)}>{part}</span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </p>
              <p className="hint-text">💡 Click vào phần bị sai trong câu.</p>
            </div>
          );
        })()}

        {(q.type === 'fill' || (!q.options && q.type !== 'rewrite' && q.type !== 'reorder' && q.type !== 'find_error' && q.type !== 'mcq')) && (() => {
          const parts = q.question.split(/(\[.*?\]|_+)/);
          return (
            <div className="fill-blank-area">
              <p className="question-text" style={{ lineHeight: '2.5' }}>
                {parts.map((part, i) => {
                  const isBracket = part.startsWith('[') && part.endsWith(']');
                  const isUnderscore = /^_/.test(part);
                  if (isBracket || isUnderscore) {
                    return (
                      <input
                        key={i}
                        type="text"
                        className="fill-input"
                        placeholder={isBracket ? part.slice(1, -1) : ''}
                        value={selectedAnswer || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        disabled={!!feedback}
                        autoFocus={true}
                        style={{
                          color: feedback ? (feedback.isCorrect ? '#22c55e' : '#ef4444') : 'inherit'
                        }}
                      />
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </p>
            </div>
          );
        })()}
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="grammar-page">
      {/* Header */}
      <div className="grammar-header">
        <div className="grammar-header-left">
          {selectedTense && (
            <button className="back-btn" onClick={() => { setSelectedTense(null); resetExercise(); }}>
              ← Trở về
            </button>
          )}
          <div>
            <h1>{selectedTense || 'Học Ngữ Pháp'}</h1>
            <p className="grammar-subtitle">
              {selectedTense
                ? TENSE_SHORT[selectedTense] || ''
                : `Thành thạo 12 thì tiếng Anh · ${completedCount}/12 hoàn thành`
              }
            </p>
          </div>
        </div>
        {!selectedTense && (
          <div className="grammar-progress-summary">
            <div className="progress-ring-mini">
              <svg viewBox="0 0 36 36">
                <path className="ring-bg-g" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="ring-fill-g" strokeDasharray={`${Math.round((completedCount / 12) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="ring-text-g">{completedCount}</text>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ==================== TENSE SELECTION GRID ==================== */}
      {!selectedTense ? (
        <div className="tense-selection-area">
          {loading ? (
            <div className="grammar-loading">
              <div className="loading-spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {TENSE_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="tense-group">
                  <div className="tense-group-header" style={{ '--group-color': group.color }}>
                    <span className="group-icon">{group.icon}</span>
                    <span className="group-label">{group.label} Tenses</span>
                    <span className="group-count">
                      {group.tenses.filter(t => (progressMap[t] || 0) >= 100).length}/{group.tenses.length}
                    </span>
                  </div>
                  <div className="tense-cards-row">
                    {group.tenses.map((tense, tIdx) => {
                      const progress = progressMap[tense] || 0;
                      const isCompleted = progress >= 100;
                      return (
                        <button
                          key={tIdx}
                          className={`tense-card ${isCompleted ? 'completed' : ''}`}
                          onClick={() => setSelectedTense(tense)}
                          style={{ '--tense-color': group.color, animationDelay: `${gIdx * 0.08 + tIdx * 0.04}s` }}
                        >
                          <div className="tense-card-top">
                            <span className="tense-card-status">{isCompleted ? '✅' : progress > 0 ? '📝' : '📖'}</span>
                            <span className="tense-card-percent" style={{ color: isCompleted ? '#22c55e' : group.color }}>
                              {progress}%
                            </span>
                          </div>
                          <h3 className="tense-card-name">{tense}</h3>
                          <p className="tense-card-vn">{TENSE_SHORT[tense]}</p>
                          <div className="tense-card-bar">
                            <div className="tense-card-bar-fill" style={{
                              width: `${progress}%`,
                              background: isCompleted ? '#22c55e' : group.color
                            }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

      ) : (
        /* ==================== TENSE DETAIL VIEW ==================== */
        <div className="grammar-container full-height">
          <div className="tense-detail full-view">
            <div className="tense-content">
              <div className="content-columns">
                {/* Theory Column */}
                <div className="theory-column">
                  <div className="theory-section custom-markdown">
                    <h3>📚 Lý Thuyết: {selectedTense}</h3>
                    {tenseDetails?.content ? (
                      <ReactMarkdown>{tenseDetails.content}</ReactMarkdown>
                    ) : (
                      <div className="theory-loading">
                        <div className="loading-spinner small"></div>
                        <p>Đang tải lý thuyết...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Exercise Column */}
                <div className="exercise-column" ref={exerciseRef}>
                  <div className="exercise-section">
                    <h3>📝 Bài Tập Thực Hành</h3>

                    {!exerciseStarted ? (
                      <div className="start-exercise">
                        <span className="start-exercise-icon">🎮</span>
                        <h4>Sẵn sàng luyện tập?</h4>
                        <p>Luyện tập với 15-20 câu hỏi đa dạng bao gồm trắc nghiệm, điền từ, sắp xếp câu và tìm lỗi sai.</p>
                        <button
                          className="start-btn"
                          onClick={startExercises}
                          disabled={loadingExercises}
                        >
                          {loadingExercises ? (
                            <>
                              <span className="loading-spinner tiny"></span>
                              Đang tạo bài tập...
                            </>
                          ) : 'Bắt Đầu Làm Bài 🚀'}
                        </button>
                        <p className="start-hint">Nhấn Enter để kiểm tra · A/B/C/D cho trắc nghiệm</p>
                      </div>
                    ) : (
                      <div className="exercise-content">
                        {exercises.length > 0 && currentQuestionIndex < exercises.length ? (
                          <div className="question-card">
                            {/* Exercise Progress Bar */}
                            <div className="exercise-progress">
                              <div className="exercise-progress-bar">
                                {exercises.map((_, i) => (
                                  <div
                                    key={i}
                                    className={`progress-dot ${i < currentQuestionIndex ? (answersTracker[i] ? 'correct' : 'wrong') : ''} ${i === currentQuestionIndex ? 'current' : ''}`}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="question-header">
                              <span className="question-counter">
                                Câu {currentQuestionIndex + 1}/{exercises.length}
                              </span>
                              <div className="score-container">
                                <span className="score">✅ {score}/{exercises.length}</span>
                                {pointAnimation && <span className="point-popup">+1</span>}
                              </div>
                            </div>

                            {renderExercise()}

                            {feedback ? (
                              <div className={`feedback-area ${feedback.isCorrect ? 'positive' : 'negative'}`}>
                                <p className="feedback-message">{feedback.message}</p>
                                <div className="explanation">
                                  <p><strong>Đáp án đúng: </strong>
                                    <span className="correct-answer-text">{exercises[currentQuestionIndex].correctAnswer}</span>
                                  </p>
                                  <p><strong>Giải thích: </strong>{exercises[currentQuestionIndex].explanation}</p>
                                </div>
                                <button className="next-btn" onClick={nextQuestion}>
                                  {currentQuestionIndex < exercises.length - 1 ? 'Câu Tiếp Theo ➡️' : 'Xem Kết Quả 🏆'}
                                </button>
                                <span className="next-hint">Nhấn Enter ↵</span>
                              </div>
                            ) : (
                              <div className="action-buttons">
                                <button className="skip-btn" onClick={handleSkip}>
                                  Bỏ Qua ⏭️
                                </button>
                                <button
                                  className="check-btn"
                                  onClick={checkAnswer}
                                  disabled={!selectedAnswer}
                                >
                                  Kiểm Tra ✓
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* ==================== COMPLETION MODAL ==================== */
                          <div className="completion-overlay">
                            <div className="completion-modal">
                              {(() => {
                                const percent = exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0;
                                const msg = getAccuracyMessage(percent);
                                return (
                                  <>
                                    <span className="completion-icon">{msg.emoji}</span>
                                    <h3 className="completion-title">{msg.text}</h3>
                                    <div className="completion-score">
                                      {score} / {exercises.length} câu đúng
                                    </div>
                                    <div className="completion-percent">
                                      Độ chính xác: {percent}%
                                    </div>
                                    <p className="completion-sub">{msg.sub}</p>

                                    {/* Answer summary */}
                                    <div className="completion-dots">
                                      {answersTracker.map((correct, i) => (
                                        <span key={i} className={`completion-dot ${correct ? 'correct' : 'wrong'}`}>
                                          {correct ? '✓' : '✕'}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="completion-actions">
                                      <button
                                        className="reset-btn secondary"
                                        onClick={resetExercise}
                                      >
                                        Làm Lại 🔄
                                      </button>
                                      <button
                                        className="reset-btn primary"
                                        onClick={handleFinishSession}
                                      >
                                        Hoàn Thành ✅
                                      </button>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Grammar;
