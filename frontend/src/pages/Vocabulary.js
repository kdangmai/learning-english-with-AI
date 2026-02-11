import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import './Vocabulary.css';

import Modal from '../components/common/Modal';

export function Vocabulary() {
  const navigate = useNavigate();
  const { success, error, warning, info } = useToast();
  const [activeTab, setActiveTab] = useState('topics');
  const [libraryTab, setLibraryTab] = useState('all');
  const [customTopic, setCustomTopic] = useState('');
  const [words, setWords] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState('UK');

  // UI State
  const [viewMode, setViewMode] = useState('grid');
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  // Filter States
  const [selectedLevel, setSelectedLevel] = useState('B1');
  const [wordCount, setWordCount] = useState(5);
  const [selectedType, setSelectedType] = useState('Daily');
  const [selectedPart, setSelectedPart] = useState('mix');

  // SRS Stats
  const [srsStats, setSrsStats] = useState(null);

  // Session tracking for completion modal
  const [sessionResults, setSessionResults] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    fetchFolders();
    fetchSrsStats();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setFolders(data.folders);
    } catch (err) {
      console.error("Fetch folders error", err);
    }
  };

  const fetchSrsStats = async () => {
    try {
      const res = await fetch('/api/vocabulary/srs-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setSrsStats(data.stats);
    } catch (err) {
      console.error("SRS stats error", err);
    }
  };

  // Fetch words based on Library Tab
  const fetchLibraryWords = useCallback(async () => {
    setLoading(true);
    try {
      let statusParam = 'all';
      if (libraryTab === 'new') statusParam = 'new';
      if (libraryTab === 'learned') statusParam = 'known';
      if (libraryTab === 'mastered') statusParam = 'mastered';

      const response = await fetch(`/api/vocabulary/by-status/${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      let fetchedWords = data.words || [];

      if (selectedFolder) {
        fetchedWords = fetchedWords.filter(w => w.folderId === selectedFolder);
      }

      setWords(fetchedWords);
      setSelectedWords(new Set());
    } catch (err) {
      console.error('Error fetching library words:', err);
    } finally {
      setLoading(false);
    }
  }, [libraryTab, selectedFolder]);

  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibraryWords();
    }
  }, [activeTab, fetchLibraryWords]);

  const handleSpeak = (text, accent = null) => {
    if (!window.speechSynthesis) {
      warning("Trình duyệt không hỗ trợ phát âm.");
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = null;

    // Default to UK if no accent provided, or if specifically requested
    const targetAccent = accent || selectedAccent || 'UK';

    if (targetAccent === 'UK') {
      utterance.lang = 'en-GB';
      preferredVoice = voices.find(v => (v.name.includes('Google UK English') || v.name.includes('Great Britain') || v.name.includes('UK')) && v.lang.includes('en-GB'));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('en-GB'));
    } else {
      utterance.lang = 'en-US';
      preferredVoice = voices.find(v => (v.name.includes('Google US English') || v.name.includes('United States')) && v.lang.includes('en-US'));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('en-US'));
    }

    // Fallback if specific voice not found
    if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('en'));

    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  const startLearning = async () => {
    const topicToUse = customTopic.trim();
    if (!topicToUse) { warning('Vui lòng nhập chủ đề!'); return; }

    setLoading(true);
    try {
      const response = await fetch('/api/vocabulary/start-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          topic: topicToUse,
          count: wordCount,
          category: selectedType,
          partOfSpeech: selectedPart,
          level: selectedLevel
        })
      });

      if (response.status === 401) { error('Session expired.'); localStorage.removeItem('token'); navigate('/login'); return; }

      const data = await response.json();
      if (data.success) {
        setFlashcards(data.words || []);
        setCurrentCardIndex(0);
        setFlipped(false);
        setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 });
        setIsLearning(true);
      } else {
        error(data.message);
      }
    } catch (err) {
      console.error(err);
      error('Cannot start learning.');
    } finally {
      setLoading(false);
    }
  };

  const startReviewSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vocabulary/flashcards?limit=20`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCardIndex(0);
        setFlipped(false);
        setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 });
        setIsLearning(true);
        success(`Bắt đầu ôn tập ${data.flashcards.length} từ!`);
      } else {
        info('Bạn không có từ nào cần ôn tập ngay lúc này.');
      }
    } catch (err) {
      console.error("Review error", err);
      error("Lỗi khi tải bài ôn tập.");
    } finally {
      setLoading(false);
    }
  };

  // SRS Action Handler
  const handleSRSAction = async (rating) => {
    const card = flashcards[currentCardIndex];
    if (!card) return;

    // Track session results
    setSessionResults(prev => ({ ...prev, [rating]: (prev[rating] || 0) + 1 }));

    try {
      const res = await fetch('/api/vocabulary/srs-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ wordId: card._id, rating })
      });

      const data = await res.json();

      // Update current card's intervals if server returns them (for next card display)
      if (data.nextIntervals && currentCardIndex + 1 < flashcards.length) {
        setFlashcards(prev => {
          const updated = [...prev];
          if (updated[currentCardIndex + 1]) {
            updated[currentCardIndex + 1] = {
              ...updated[currentCardIndex + 1],
              nextIntervals: data.nextIntervals
            };
          }
          return updated;
        });
      }

      // Move Next
      if (currentCardIndex < flashcards.length - 1) {
        setFlipped(false);
        setTimeout(() => setCurrentCardIndex(prev => prev + 1), 150);
      } else {
        setShowCompletionModal(true);
        fetchSrsStats();
      }
    } catch (err) {
      console.error("SRS Error", err);
    }
  };

  // Selection Logic
  const toggleSelectWord = (id) => {
    const newSet = new Set(selectedWords);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedWords(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedWords.size === words.length) setSelectedWords(new Set());
    else setSelectedWords(new Set(words.map(w => w._id)));
  };

  // Folder Logic
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return warning("Nhập tên thư mục");
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: newFolderName })
      });
      const data = await res.json();
      if (data.success) {
        setFolders([data.folder, ...folders]);
        setTargetFolderId(data.folder._id);
        setNewFolderName('');
        success("Thư mục đã tạo!");
      } else {
        error(data.message);
      }
    } catch (err) {
      error("Không thể tạo thư mục");
    }
  };

  const handleAddToFolder = async () => {
    if (!targetFolderId) return warning("Chọn thư mục");
    try {
      const res = await fetch('/api/folders/add-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ folderId: targetFolderId, wordIds: Array.from(selectedWords) })
      });
      const data = await res.json();
      if (data.success) {
        success(`Đã thêm ${selectedWords.size} từ vào thư mục.`);
        setShowFolderModal(false);
        setSelectedWords(new Set());
        fetchLibraryWords();
      } else {
        error(data.message);
      }
    } catch (err) {
      error("Không thể thêm từ");
    }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const res = await fetch(`/api/vocabulary/${wordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        success("Đã xóa từ!");
        setWords(prev => prev.filter(w => w._id !== wordId));
        fetchSrsStats();
      } else {
        error(data.message);
      }
    } catch (err) {
      error("Không thể xóa từ");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWords.size === 0) return;
    const confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedWords.size} từ?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const promises = Array.from(selectedWords).map(id =>
        fetch(`/api/vocabulary/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      );
      await Promise.all(promises);
      success(`Đã xóa ${selectedWords.size} từ!`);
      setSelectedWords(new Set());
      fetchLibraryWords();
      fetchSrsStats();
    } catch (err) {
      error("Lỗi khi xóa từ hàng loạt");
    }
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleRelearn = () => {
    setFlashcards(shuffleArray(flashcards));
    setCurrentCardIndex(0);
    setFlipped(false);
    setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 });
    setShowCompletionModal(false);
    setIsLearning(true);
  };

  const closeCompletionModal = () => {
    setShowCompletionModal(false);
    setIsLearning(false);
    setFlashcards([]);
    setCustomTopic('');
  };

  // Get SRS interval display text for current card
  const getCurrentCardIntervals = () => {
    const card = flashcards[currentCardIndex];
    if (!card) return { again: '1 phút', hard: '1 phút', good: '10 phút', easy: '4 ngày' };

    if (card.nextIntervals) {
      return card.nextIntervals;
    }

    // Fallback for cards from startLearning (no nextIntervals from server)
    const srs = card.srs || { step: 0, interval: 0, easeFactor: 2.5 };
    const step = srs.step || 0;
    if (step === 0) {
      return { again: '1 phút', hard: '1 phút', good: '10 phút', easy: '4 ngày' };
    }
    if (step === 1) {
      return { again: '1 phút', hard: '10 phút', good: '1 ngày', easy: '4 ngày' };
    }
    return { again: '1 phút', hard: '1 ngày', good: '3 ngày', easy: '4 ngày' };
  };

  // Mastery status helpers
  const getMasteryLabel = (status) => {
    const map = { unknown: 'Chưa học', learning: 'Đang học', known: 'Đã biết', mastered: 'Thành thạo' };
    return map[status] || status;
  };

  const getMasteryColor = (status) => {
    const map = { unknown: '#94a3b8', learning: '#f59e0b', known: '#6366f1', mastered: '#22c55e' };
    return map[status] || '#94a3b8';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Quá hạn';
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    if (days < 7) return `${days} ngày`;
    if (days < 30) return `${Math.round(days / 7)} tuần`;
    return `${Math.round(days / 30)} tháng`;
  };

  // Filter words by search query
  const filteredWords = words.filter(w => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return w.word.toLowerCase().includes(q) ||
      (w.meaning?.vi || '').toLowerCase().includes(q) ||
      (w.topic || '').toLowerCase().includes(q);
  });

  // Sort filtered words
  const sortedWords = [...filteredWords].sort((a, b) => {
    switch (sortBy) {
      case 'az': return a.word.localeCompare(b.word);
      case 'za': return b.word.localeCompare(a.word);
      case 'mastery': {
        const order = { mastered: 0, known: 1, learning: 2, unknown: 3 };
        return (order[a.mastery?.status] || 3) - (order[b.mastery?.status] || 3);
      }
      case 'due': {
        const aDate = new Date(a.srs?.dueDate || a.mastery?.nextReviewAt || '2099-01-01');
        const bDate = new Date(b.srs?.dueDate || b.mastery?.nextReviewAt || '2099-01-01');
        return aDate - bDate;
      }
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  // Mastery progress percentage
  const getMasteryProgress = (status) => {
    const map = { unknown: 0, learning: 33, known: 66, mastered: 100 };
    return map[status] || 0;
  };

  const intervals = getCurrentCardIntervals();

  return (
    <div className="vocabulary-page">
      <div className="main-tabs">
        <button
          className={`main-tab-btn ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('topics'); setIsLearning(false); }}
        >
          📖 Học Từ Vựng
        </button>
        <button
          className={`main-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          📚 Kho Từ Vựng
        </button>
      </div>

      <div className="content-area">
        {/* TOPICS TAB */}
        {activeTab === 'topics' && !isLearning && (
          <div className="topics-container">
            {/* SRS Stats Bar */}
            {srsStats && (
              <div className="srs-stats-bar">
                <div className="srs-stat-item">
                  <span className="srs-stat-number">{srsStats.total}</span>
                  <span className="srs-stat-text">Tổng từ</span>
                </div>
                <div className="srs-stat-divider" />
                <div className="srs-stat-item due">
                  <span className="srs-stat-number">{srsStats.dueCount}</span>
                  <span className="srs-stat-text">Cần ôn tập</span>
                </div>
                <div className="srs-stat-divider" />
                <div className="srs-stat-item">
                  <span className="srs-stat-number">{srsStats.newCount}</span>
                  <span className="srs-stat-text">Từ mới</span>
                </div>
                <div className="srs-stat-divider" />
                <div className="srs-stat-item learning">
                  <span className="srs-stat-number">{srsStats.learningCount}</span>
                  <span className="srs-stat-text">Đang học</span>
                </div>
                <div className="srs-stat-divider" />
                <div className="srs-stat-item known">
                  <span className="srs-stat-number">{srsStats.knownCount}</span>
                  <span className="srs-stat-text">Đã biết</span>
                </div>
                <div className="srs-stat-divider" />
                <div className="srs-stat-item mastered">
                  <span className="srs-stat-number">{srsStats.masteredCount}</span>
                  <span className="srs-stat-text">Thành thạo</span>
                </div>
              </div>
            )}

            <div className="filters-section">
              <div className="filter-group">
                <label>📚 Bộ từ vựng:</label>
                <div className="filter-options">
                  {['Daily', 'IELTS', 'TOEIC', 'Academic'].map(type => (
                    <button key={type} className={`filter-chip ${selectedType === type ? 'active' : ''}`} onClick={() => setSelectedType(type)}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <label>🔤 Loại từ:</label>
                <div className="filter-options">
                  {[{ k: 'mix', l: 'Hỗn hợp' }, { k: 'noun', l: 'Danh từ' }, { k: 'verb', l: 'Động từ' }, { k: 'adjective', l: 'Tính từ' }].map(p => (
                    <button key={p.k} className={`filter-chip ${selectedPart === p.k ? 'active' : ''}`} onClick={() => setSelectedPart(p.k)}>{p.l}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>📊 Trình độ:</label>
                <div className="filter-options">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                    <button key={lvl} className={`filter-chip ${selectedLevel === lvl ? 'active' : ''}`} onClick={() => setSelectedLevel(lvl)}>{lvl}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>🔢 Số lượng từ ({wordCount}):</label>
                <input
                  type="range"
                  min="3" max="20"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>

            <div className="custom-topic-section">
              <h3>Nhập chủ đề bạn muốn học:</h3>
              <input
                type="text"
                className="custom-topic-input"
                placeholder="Ví dụ: Space exploration, Football, Technology..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                autoFocus
              />
            </div>

            <div className="action-area">
              <button
                className="start-btn primary-btn"
                onClick={startLearning}
                disabled={loading || !customTopic.trim()}
              >
                {loading ? '⏳ Đang tạo...' : `🚀 Tạo ${wordCount} Từ Vựng`}
              </button>

              <button
                className="start-btn review-btn"
                onClick={startReviewSession}
                disabled={loading}
              >
                {loading ? '⏳ Đang tải...' : `📅 Ôn Tập (${srsStats?.dueCount || 0} từ)`}
              </button>
            </div>
          </div>
        )}

        {/* LEARNING / SRS FLASHCARD MODE */}
        {isLearning && flashcards.length > 0 && flashcards[currentCardIndex] && (
          <div className="flashcard-session">
            <div className="session-header">
              <button className="back-btn" onClick={() => { setIsLearning(false); setFlashcards([]); }}>
                ← Quay lại
              </button>
              <div className="progress-indicator">
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                  />
                </div>
                <span className="progress-text">{currentCardIndex + 1} / {flashcards.length}</span>
              </div>
            </div>

            <div className={`flashcard-3d ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
              <div className="card-face front">
                <div className="card-content">
                  <h2 className="word">{flashcards[currentCardIndex].word}</h2>

                  <div className="card-meta">
                    <span className="part-of-speech">({flashcards[currentCardIndex].partOfSpeech})</span>
                    <span className={`level-badge ${flashcards[currentCardIndex].level}`}>{flashcards[currentCardIndex].level}</span>
                    {flashcards[currentCardIndex].mastery && (
                      <span className="mastery-badge-simple" style={{ color: getMasteryColor(flashcards[currentCardIndex].mastery.status) }}>
                        {getMasteryLabel(flashcards[currentCardIndex].mastery.status)}
                      </span>
                    )}
                  </div>

                  {typeof flashcards[currentCardIndex].pronunciation === 'string' ? (
                    <div className="pronunciation-single" onClick={(e) => { e.stopPropagation(); handleSpeak(flashcards[currentCardIndex].word, 'UK'); }}>
                      <span className="ipa">/{flashcards[currentCardIndex].pronunciation}/</span>
                      <button className="audio-btn-round">🔊</button>
                    </div>
                  ) : (
                    <div className="pronunciation-container">
                      {/* UK First (Default) */}
                      <div className="pron-item uk" onClick={(e) => { e.stopPropagation(); handleSpeak(flashcards[currentCardIndex].word, 'UK'); }}>
                        <span className="lang-code">UK</span>
                        <span className="ipa">/{flashcards[currentCardIndex].pronunciation?.uk || ''}/</span>
                        <button className="audio-btn-mini">🔊</button>
                      </div>
                      <div className="pron-item us" onClick={(e) => { e.stopPropagation(); handleSpeak(flashcards[currentCardIndex].word, 'US'); }}>
                        <span className="lang-code">US</span>
                        <span className="ipa">/{flashcards[currentCardIndex].pronunciation?.us || ''}/</span>
                        <button className="audio-btn-mini">??</button>
                      </div>
                    </div>
                  )}

                  <p className="hint">👆 Chạm để lật</p>
                </div>
              </div>

              <div className="card-face back">
                <div className="card-content">
                  <h3 className="meaning">{flashcards[currentCardIndex].meaning?.vi}</h3>
                  <div className="card-back-meta">
                    <span className="back-pos">({flashcards[currentCardIndex].partOfSpeech})</span>
                    {flashcards[currentCardIndex].topic && (
                      <span className="back-topic">📂 {flashcards[currentCardIndex].topic}</span>
                    )}
                  </div>
                  <div className="example-box">
                    <p className="example-en">"{flashcards[currentCardIndex].example}"</p>
                  </div>
                  {flashcards[currentCardIndex].srs?.step > 0 && (
                    <div className="card-back-srs">
                      <span className="srs-step-info">📊 SRS Bước {flashcards[currentCardIndex].srs.step}</span>
                      <span className="srs-reviews-info">
                        ✅ {flashcards[currentCardIndex].mastery?.correctCount || 0} / ❌ {flashcards[currentCardIndex].mastery?.incorrectCount || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SRS CONTROLS - 4 buttons like Anki */}
            <div className="controls srs-controls">
              <button disabled={loading} className="btn-srs again" onClick={() => handleSRSAction('again')}>
                <span className="srs-emoji">🔁</span>
                <span className="srs-label">Quên</span>
                <span className="srs-time">{intervals.again}</span>
              </button>
              <button disabled={loading} className="btn-srs hard" onClick={() => handleSRSAction('hard')}>
                <span className="srs-emoji">😓</span>
                <span className="srs-label">Khó</span>
                <span className="srs-time">{intervals.hard}</span>
              </button>
              <button disabled={loading} className="btn-srs good" onClick={() => handleSRSAction('good')}>
                <span className="srs-emoji">👍</span>
                <span className="srs-label">Tốt</span>
                <span className="srs-time">{intervals.good}</span>
              </button>
              <button disabled={loading} className="btn-srs easy" onClick={() => handleSRSAction('easy')}>
                <span className="srs-emoji">😎</span>
                <span className="srs-label">Dễ</span>
                <span className="srs-time">{intervals.easy}</span>
              </button>
            </div>
          </div>
        )}

        {/* LIBRARY / KHO TỪ VỰNG */}
        {activeTab === 'library' && (
          <div className="library-container">
            {/* Library Header */}
            <div className="library-header">
              <h2 className="library-title">📚 Kho Từ Vựng</h2>
              <div className="library-count">{sortedWords.length} từ</div>
            </div>

            {/* Toolbar */}
            <div className="library-toolbar">
              <div className="library-tabs">
                {[
                  { key: 'all', label: 'Tất cả', icon: '📋' },
                  { key: 'new', label: 'Từ mới', icon: '🆕' },
                  { key: 'learned', label: 'Đã biết', icon: '✅' },
                  { key: 'mastered', label: 'Thành thạo', icon: '🏆' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`lib-tab-btn ${libraryTab === tab.key ? 'active' : ''}`}
                    onClick={() => setLibraryTab(tab.key)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="library-actions-row">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm từ vựng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                <div className="lib-action-buttons">
                  <select
                    value={selectedFolder || ''}
                    onChange={(e) => setSelectedFolder(e.target.value || null)}
                    className="filter-select"
                  >
                    <option value="">📁 Tất cả thư mục</option>
                    {folders.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="newest">🕐 Mới nhất</option>
                    <option value="az">🔤 A → Z</option>
                    <option value="za">🔤 Z → A</option>
                    <option value="mastery">📊 Mức thành thạo</option>
                    <option value="due">📅 Sắp ôn tập</option>
                  </select>

                  {selectedWords.size > 0 && (
                    <>
                      <button className="action-btn-mini folder-action" onClick={() => setShowFolderModal(true)}>
                        📂 Thêm vào thư mục ({selectedWords.size})
                      </button>
                      <button className="action-btn-mini delete-action" onClick={handleBulkDelete}>
                        🗑️ Xóa ({selectedWords.size})
                      </button>
                    </>
                  )}

                  <div className="view-toggle-group">
                    <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                      ⊞
                    </button>
                    <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                      ☰
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="word-list">
              {viewMode === 'list' && sortedWords.length > 0 && (
                <div className="list-header-row">
                  <input type="checkbox" checked={selectedWords.size === sortedWords.length && sortedWords.length > 0} onChange={toggleSelectAll} />
                  <span className="list-header-word">Từ vựng</span>
                  <span className="list-header-pron">Phát âm</span>
                  <span className="list-header-meaning">Nghĩa</span>
                  <span className="list-header-status">Trạng thái</span>
                  <span className="list-header-review">Ôn tập</span>
                  <span className="list-header-actions">Thao tác</span>
                </div>
              )}

              {loading ? (
                <div className="empty-state">
                  <div className="loading-spinner-small" />
                  <p>Đang tải...</p>
                </div>
              ) : sortedWords.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>Chưa có từ vựng nào.</p>
                  <p className="empty-sub">Hãy bắt đầu học từ vựng theo chủ đề!</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "words-grid" : "words-list"}>
                  {sortedWords.map((word) => (
                    <div
                      key={word._id}
                      className={`word-card ${viewMode} ${selectedWords.has(word._id) ? 'selected' : ''} ${expandedCard === word._id ? 'expanded' : ''}`}
                      onClick={() => toggleSelectWord(word._id)}
                    >
                      {viewMode === 'grid' ? (
                        // GRID VIEW
                        <>
                          <div className="card-select" onClick={(e) => { e.stopPropagation(); toggleSelectWord(word._id); }}>
                            <input type="checkbox" checked={selectedWords.has(word._id)} readOnly />
                          </div>
                          <div className="word-header">
                            <h4>{word.word}</h4>
                            <div className="word-badges">
                              <span className={`level-badge ${word.level}`}>{word.level}</span>
                              <span
                                className="mastery-badge"
                                style={{ backgroundColor: getMasteryColor(word.mastery?.status) + '20', color: getMasteryColor(word.mastery?.status) }}
                              >
                                {getMasteryLabel(word.mastery?.status)}
                              </span>
                            </div>
                          </div>

                          {/* Mastery Progress Bar */}
                          <div className="mastery-progress-bar">
                            <div
                              className="mastery-progress-fill"
                              style={{ width: `${getMasteryProgress(word.mastery?.status)}%`, backgroundColor: getMasteryColor(word.mastery?.status) }}
                            />
                          </div>

                          {typeof word.pronunciation === 'string' ? (
                            <p className="pronunciation-text">{word.pronunciation}</p>
                          ) : (
                            <div className="pronunciation-dual">
                              <span className="pron-inline">🇺🇸 /{word.pronunciation?.us}/</span>
                              <span className="pron-inline">🇬🇧 /{word.pronunciation?.uk}/</span>
                            </div>
                          )}

                          <p className="meaning-vi">🇻🇳 {word.meaning?.vi}</p>

                          {word.example && (
                            <p className="example-text">💬 {word.example}</p>
                          )}

                          <div className="card-footer">
                            <div className="srs-info">
                              <span className="srs-next-review" title="Ôn tập tiếp theo">
                                🔄 {formatDate(word.srs?.dueDate || word.mastery?.nextReviewAt)}
                              </span>
                              {word.srs?.step > 0 && (
                                <span className="srs-step" title="SRS Step">
                                  Bước {word.srs.step}
                                </span>
                              )}
                            </div>
                            <div className="card-actions">
                              <button className="audio-btn" onClick={(e) => { e.stopPropagation(); handleSpeak(word.word); }}>🔊</button>
                              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteWord(word._id); }} title="Xóa từ">🗑️</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        // LIST VIEW
                        <>
                          <input
                            type="checkbox"
                            checked={selectedWords.has(word._id)}
                            onChange={() => toggleSelectWord(word._id)}
                            onClick={(e) => e.stopPropagation()}
                            className="list-checkbox"
                          />
                          <div className="list-word-col">
                            <span className="list-word-text">{word.word}</span>
                            <span className={`level-badge-sm ${word.level}`}>{word.level}</span>
                          </div>
                          <div className="list-pron-col">
                            {typeof word.pronunciation === 'string'
                              ? <span>{word.pronunciation}</span>
                              : <span>/{word.pronunciation?.us}/</span>
                            }
                            <button className="audio-btn-mini" onClick={(e) => { e.stopPropagation(); handleSpeak(word.word); }}>🔊</button>
                          </div>
                          <div className="list-meaning-col">
                            {word.meaning?.vi}
                          </div>
                          <div className="list-status-col">
                            <span
                              className="mastery-badge-sm"
                              style={{ backgroundColor: getMasteryColor(word.mastery?.status) + '20', color: getMasteryColor(word.mastery?.status) }}
                            >
                              {getMasteryLabel(word.mastery?.status)}
                            </span>
                          </div>
                          <div className="list-review-col">
                            <span className="review-date">🔄 {formatDate(word.srs?.dueDate || word.mastery?.nextReviewAt)}</span>
                          </div>
                          <div className="list-actions-col">
                            <button className="delete-btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteWord(word._id); }} title="Xóa">🗑️</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Completion */}
        <Modal isOpen={showCompletionModal} onClose={closeCompletionModal} title="🎉 Tuyệt vời!">
          <div className="completion-modal-content">
            <p className="completion-title">Bạn đã hoàn thành phiên ôn tập!</p>
            <p className="completion-subtitle">{flashcards.length} từ đã được ôn tập</p>

            <div className="session-stats-grid">
              <div className="session-stat-item again-stat">
                <span className="stat-count">{sessionResults.again}</span>
                <span className="stat-label">🔁 Quên</span>
              </div>
              <div className="session-stat-item hard-stat">
                <span className="stat-count">{sessionResults.hard}</span>
                <span className="stat-label">😓 Khó</span>
              </div>
              <div className="session-stat-item good-stat">
                <span className="stat-count">{sessionResults.good}</span>
                <span className="stat-label">👍 Tốt</span>
              </div>
              <div className="session-stat-item easy-stat">
                <span className="stat-count">{sessionResults.easy}</span>
                <span className="stat-label">😎 Dễ</span>
              </div>
            </div>

            {sessionResults.again > 0 && (
              <p className="completion-hint">
                💡 Bạn có {sessionResults.again} từ cần ôn lại sớm. Chúng sẽ xuất hiện trong phiên ôn tập tiếp theo.
              </p>
            )}

            <div className="completion-actions">
              <button className="start-btn primary-btn" onClick={handleRelearn}>🔄 Học lại</button>
              <button className="cancel-btn" onClick={closeCompletionModal}>Đóng</button>
            </div>
          </div>
        </Modal>

        {/* Modal: Add to Folder */}
        <Modal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} title="📂 Thêm vào Thư mục">
          <div className="folder-modal-content">
            <div className="form-group">
              <label>Chọn thư mục:</label>
              <select value={targetFolderId} onChange={(e) => setTargetFolderId(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <option value="">-- Chọn thư mục --</option>
                {folders.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="divider">HOẶC tạo mới</div>

            <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Tên thư mục mới"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <button className="action-btn-mini folder-action" onClick={handleCreateFolder}>Tạo</button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="start-btn primary-btn" onClick={handleAddToFolder}>Xác nhận</button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default Vocabulary;
