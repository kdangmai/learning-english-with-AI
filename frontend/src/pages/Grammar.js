import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Grammar.css';
import { useToast } from '../context/ToastContext';

export function Grammar() {
  const [selectedTense, setSelectedTense] = useState(null);
  const { error: showError } = useToast();
  const [tenses, setTenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New state for details and exercises
  const [tenseDetails, setTenseDetails] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null); // format depends on type
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);

  // Reorder specific state
  const [reorderWords, setReorderWords] = useState([]);
  const [pointAnimation, setPointAnimation] = useState(false);

  const tenserList = [
    'Simple Present',
    'Present Continuous',
    'Present Perfect',
    'Present Perfect Continuous',
    'Simple Past',
    'Past Continuous',
    'Past Perfect',
    'Past Perfect Continuous',
    'Simple Future',
    'Future Continuous',
    'Future Perfect',
    'Future Perfect Continuous'
  ];

  useEffect(() => {
    fetchTenses();
  }, []);

  useEffect(() => {
    if (selectedTense) {
      fetchTenseDetails(selectedTense);
      resetExercise();
    }
  }, [selectedTense]);

  const resetExercise = () => {
    setExerciseStarted(false);
    setExercises([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setSelectedAnswer(null);
    setReorderWords([]);
  };

  // Sync reorder words when question changes
  // Sync reorder words when question changes or if empty
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      const currentQ = exercises[currentQuestionIndex];
      // Only for reorder type
      if (currentQ?.type === 'reorder') {
        // If reorderWords is empty, we must fill it
        if (reorderWords.length === 0) {
          let wordsToShuffle = [];
          // Strategy 1: Use words from API
          if (currentQ.words && currentQ.words.length > 0) {
            wordsToShuffle = [...currentQ.words];
          } else if (currentQ.correctAnswer) {
            // Strategy 2: Fallback to answer split if API failed to provide words
            wordsToShuffle = currentQ.correctAnswer.split(' ');
          }

          if (wordsToShuffle.length > 0) {
            // Shuffle and set
            const shuffled = [...wordsToShuffle].sort(() => Math.random() - 0.5);
            setReorderWords(shuffled);
          }
        }
      }
    }
  }, [currentQuestionIndex, exercises, reorderWords.length]);

  const handleSkip = () => {
    setFeedback({
      isCorrect: false,
      message: '🤷 Đã bỏ qua'
    });
    // Auto fill answer so they can see it? Or just leave null? 
    // Usually leaving null is fine as we show Correct Answer in feedback area now.
  };

  const fetchTenses = async () => {
    try {
      const response = await fetch('/api/grammar/tenses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setTenses(data.tenses);
      }
    } catch (error) {
      console.error('Error fetching tenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenseDetails = async (tenseName) => {
    try {
      const response = await fetch(`/api/grammar/tenses/${encodeURIComponent(tenseName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setTenseDetails(data.tense);
      }
    } catch (error) {
      console.error('Error fetching tense details:', error);
    }
  };

  const startExercises = async () => {
    setLoadingExercises(true);
    try {
      const response = await fetch('/api/grammar/generate-exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tenseName: selectedTense })
      });

      const data = await response.json();
      if (data.success && data.exercises?.length > 0) {
        setExercises(data.exercises);
        setExerciseStarted(true);
        // useEffect will handle setting reorderWords
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

  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
  };

  const handleAnswerChange = (val) => {
    if (feedback?.isCorrect) return;
    setSelectedAnswer(val);
  };

  const handleReorderClick = (word) => {
    if (feedback?.isCorrect) return;
    const currentList = selectedAnswer ? selectedAnswer.split(' ') : [];
    const newList = [...currentList, word];
    setSelectedAnswer(newList.join(' '));
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;

    const currentQ = exercises[currentQuestionIndex];
    let isCorrect = false;

    const norm = (str) => str?.toString().toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');

    if (currentQ.type === 'mcq') {
      isCorrect = selectedAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'fill') {
      isCorrect = norm(selectedAnswer) === norm(currentQ.correctAnswer);
    } else if (currentQ.type === 'find_error') {
      isCorrect = selectedAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'reorder') {
      isCorrect = norm(selectedAnswer) === norm(currentQ.correctAnswer);
    } else if (currentQ.type === 'fill' || !currentQ.options) {
      // Simple string comparison for fill-in-the-blank
      isCorrect = selectedAnswer && selectedAnswer.trim().toLowerCase() === currentQ.correctAnswer.toLowerCase();
    }

    setFeedback({
      isCorrect,
      message: isCorrect ? 'Correct!' : 'Incorrect'
    });

    if (isCorrect) {
      setScore(s => s + 1);
      setPointAnimation(true);
      setTimeout(() => setPointAnimation(false), 1000);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setFeedback(null);
    setReorderWords([]);

    const nextIdx = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIdx);
    // useEffect will handle setting reorderWords for the next question
  };

  const getTenseProgress = (tenseName) => {
    const tense = tenses.find(t => t.tenseName === tenseName);
    return tense?.progress || 0;
  };

  // Render Helpers
  const renderExercise = () => {
    const q = exercises[currentQuestionIndex];

    if (q.type === 'mcq') {
      return (
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
                  <span className="option-key">{key}.</span> {value}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (q.type === 'reorder') {
      const isWordsEmpty = !reorderWords || reorderWords.length === 0;

      return (
        <div className="reorder-area">
          <p className="question-text">{q.question}</p>

          <div className="constructed-sentence">
            {selectedAnswer ? (
              selectedAnswer.split(' ').map((w, i) => (
                <span key={i} className="word-chip used" onClick={() => {
                  if (feedback) return;
                  const newAns = selectedAnswer.split(' ');
                  newAns.splice(i, 1);
                  setSelectedAnswer(newAns.join(' '));
                }}>{w}</span>
              ))
            ) : <span className="placeholder">{feedback ? '' : 'Bấm vào từ bên dưới để ghép câu...'}</span>}
          </div>

          {selectedAnswer && !feedback && (
            <div style={{ textAlign: 'right', marginTop: '5px' }}>
              <button
                onClick={() => setSelectedAnswer(null)}
                style={{ fontSize: '0.8rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset Sentence
              </button>
            </div>
          )}

          <div className="words-pool">
            {isWordsEmpty ? (
              <div style={{ textAlign: 'center', width: '100%', padding: '20px' }}>
                <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '10px' }}>Đang tải từ vựng...</p>
                <button
                  onClick={() => {
                    const words = q.words && q.words.length > 0 ? q.words : (q.correctAnswer || '').split(' ');
                    setReorderWords(words.sort(() => Math.random() - 0.5));
                  }}
                  style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#e2e8f0', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                >
                  Reload Words
                </button>
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
      );
    }

    if (q.type === 'find_error') {
      const parts = q.question.split(/\*\*(.*?)\*\*/g);
      return (
        <div className="error-find-area">
          <p className="question-text">
            {parts.map((part, i) => {
              if (i % 2 === 1) {
                const isSelected = selectedAnswer === part;
                let className = 'error-hightlight';
                if (feedback) {
                  if (part === q.correctAnswer) className += ' correct-error';
                  else if (isSelected) className += ' wrong-error';
                } else if (isSelected) {
                  className += ' selected-error';
                }
                return (
                  <span key={i} className={className} onClick={() => handleAnswerChange(part)}>
                    {part}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
          <p className="hint-text">Click vào phần bị sai trong câu.</p>
        </div>
      );
    }

    if (q.type === 'fill' || !q.options) { // Fallback to fill if no options
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
                      borderBottom: '2px solid #3b82f6',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      outline: 'none',
                      margin: '0 5px',
                      padding: '5px',
                      width: '120px',
                      textAlign: 'center',
                      fontSize: '1.2rem',
                      background: 'transparent',
                      color: feedback ? (feedback.isCorrect ? 'green' : 'red') : 'inherit'
                    }}
                  />
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        </div>
      );
    }

    if (q.type === 'reorder') {
      const isWordsEmpty = !reorderWords || reorderWords.length === 0;

      return (
        <div className="reorder-area">
          <p className="question-text">{q.question}</p>

          <div className="constructed-sentence">
            {selectedAnswer ? (
              selectedAnswer.split(' ').map((w, i) => (
                <span key={i} className="word-chip used" onClick={() => {
                  if (feedback) return;
                  const newAns = selectedAnswer.split(' ');
                  newAns.splice(i, 1);
                  setSelectedAnswer(newAns.join(' '));
                }}>{w}</span>
              ))
            ) : <span className="placeholder">{feedback ? '' : 'Bấm vào từ bên dưới để ghép câu...'}</span>}
          </div>

          {selectedAnswer && !feedback && (
            <div style={{ textAlign: 'right', marginTop: '5px' }}>
              <button
                onClick={() => setSelectedAnswer(null)}
                style={{ fontSize: '0.8rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset Sentence
              </button>
            </div>
          )}

          <div className="words-pool">
            {isWordsEmpty ? (
              <div style={{ textAlign: 'center', width: '100%', padding: '20px' }}>
                <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '10px' }}>Đang tải từ vựng...</p>
                {/* Fallback button to manually trigger shuffle from answer */}
                <button
                  onClick={() => {
                    const words = q.words && q.words.length > 0 ? q.words : (q.correctAnswer || '').split(' ');
                    setReorderWords(words.sort(() => Math.random() - 0.5));
                  }}
                  style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#e2e8f0', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                >
                  Reload Words
                </button>
              </div>
            ) : (
              reorderWords.map((w, i) => {
                // Determine usage count safely
                const currentSelection = (selectedAnswer || '').trim();
                const usedCount = currentSelection ? currentSelection.split(' ').filter(x => x === w).length : 0;
                const totalCount = reorderWords.filter(x => x === w).length;

                if (usedCount >= totalCount) return null;

                return (
                  <span key={i} className="word-chip" onClick={() => {
                    if (feedback) return;
                    setSelectedAnswer(selectedAnswer ? selectedAnswer + ' ' + w : w);
                  }}>
                    {w}
                  </span>
                );
              })
            )}
          </div>
        </div>
      );
    }

    return <div>Unknown type</div>;
  };

  return (
    <div className="grammar-page">
      <div className="page-header">
        <div className="header-titles">
          <h1>Học Ngữ Pháp Cơ Bản</h1>
          <p className="subtitle">Thành thạo 12 thì tiếng Anh cơ bản</p>
        </div>

        <div className="tense-selector">
          <select
            value={selectedTense || ''}
            onChange={(e) => setSelectedTense(e.target.value)}
            className="tense-select-dropdown"
          >
            <option value="" disabled>-- Chọn thì cần học --</option>
            {tenserList.map((tense, idx) => {
              const progress = getTenseProgress(tense);
              return (
                <option key={idx} value={tense}>
                  {tense} {progress > 0 ? `(${progress}%)` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="grammar-container full-height">
        <div className="tense-detail full-view">
          {selectedTense ? (
            <div className="tense-content">
              <div className="content-columns">
                <div className="theory-column">
                  <div className="theory-section custom-markdown">
                    <h3>📚 Lý Thuyết: {selectedTense}</h3>
                    {tenseDetails?.content ? (
                      <ReactMarkdown>{tenseDetails.content}</ReactMarkdown>
                    ) : (
                      <p>Đang tải lý thuyết...</p>
                    )}
                  </div>
                </div>

                <div className="exercise-column">
                  <div className="exercise-section">
                    <h3>📝 Bài Tập Thực Hành</h3>

                    {!exerciseStarted ? (
                      <div className="start-exercise">
                        <p>Luyện tập với 15-20 câu hỏi đa dạng.</p>
                        <button
                          className="start-btn"
                          onClick={startExercises}
                          disabled={loadingExercises}
                        >
                          {loadingExercises ? 'Đang tạo bài tập...' : 'Bắt Đầu Làm Bài'}
                        </button>
                      </div>
                    ) : (
                      <div className="exercise-content">
                        {exercises.length > 0 && currentQuestionIndex < exercises.length ? (
                          <div className="question-card">
                            <div className="question-header">
                              <span>Câu {currentQuestionIndex + 1}/{exercises.length}</span>
                              <div className="score-container">
                                <span className="score">Điểm: {score}/{exercises.length}</span>
                                {pointAnimation && <span className="point-popup">+1</span>}
                              </div>
                            </div>

                            {renderExercise()}

                            {feedback ? (
                              <div className={`feedback-area ${feedback.isCorrect ? 'positive' : 'negative'}`}>
                                <p className="feedback-message">
                                  {feedback.message}
                                </p>
                                <p className="explanation">
                                  <strong>Đáp án đúng: </strong>
                                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{exercises[currentQuestionIndex].correctAnswer}</span>
                                  <br />
                                  <strong>Giải thích: </strong>
                                  {exercises[currentQuestionIndex].explanation}
                                </p>
                                <button className="next-btn" onClick={nextQuestion}>
                                  {currentQuestionIndex < exercises.length - 1 ? 'Câu Tiếp Theo ➡️' : 'Hoàn Thành'}
                                </button>
                              </div>
                            ) : (
                              <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                  className="skip-btn"
                                  onClick={handleSkip}
                                  style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                >
                                  Bỏ Qua ⏭️
                                </button>
                                <button
                                  className="check-btn"
                                  onClick={checkAnswer}
                                  disabled={!selectedAnswer}
                                  style={{ flex: 2, padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: !selectedAnswer ? 'not-allowed' : 'pointer', opacity: !selectedAnswer ? 0.7 : 1 }}
                                >
                                  Kiểm Tra
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="completion-overlay">
                            <div className="completion-modal">
                              <span className="completion-icon">🎉</span>
                              <h3 className="completion-title">Excellent!</h3>

                              <div className="completion-score">
                                Score: {score} / {exercises.length}
                              </div>
                              <div className="completion-percent">
                                Accuracy: {exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0}%
                              </div>

                              <button className="reset-btn" onClick={resetExercise}>
                                Practice Again 🔄
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="placeholder">
              <p>Vui lòng chọn một thì từ danh sách phía trên để bắt đầu học.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Grammar;
