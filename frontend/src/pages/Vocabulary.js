import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import './Vocabulary.css';

import Modal from '../components/common/Modal';
import { vocabularyAPI, folderAPI } from '../services/api';

const ITEMS_PER_PAGE = 30;

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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
  const [selectedAccent] = useState('UK');

  // UI State
  const [viewMode, setViewMode] = useState('grid');
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [selectedLevel, setSelectedLevel] = useState('B1');
  const [wordCount, setWordCount] = useState(5);
  const [selectedType, setSelectedType] = useState('Daily');
  const [selectedPart, setSelectedPart] = useState('mix');

  // SRS Stats
  const [srsStats, setSrsStats] = useState(null);

  // Session tracking for completion modal
  const [sessionResults, setSessionResults] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // ===== MATCH GAME STATE =====
  const [matchWords, setMatchWords] = useState([]);
  const [matchSelected, setMatchSelected] = useState({ en: null, vi: null });
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [matchWrong, setMatchWrong] = useState({ en: null, vi: null });
  const [matchGameActive, setMatchGameActive] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [matchCombo, setMatchCombo] = useState(0);
  const [matchTimer, setMatchTimer] = useState(0);
  const [matchGameComplete, setMatchGameComplete] = useState(false);
  const [matchPairCount, setMatchPairCount] = useState(6);
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [matchStartTime, setMatchStartTime] = useState(null);
  const [shuffledEn, setShuffledEn] = useState([]);
  const [shuffledVi, setShuffledVi] = useState([]);
  const [matchLoadingGame, setMatchLoadingGame] = useState(false);
  const [floatingScores, setFloatingScores] = useState([]);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [matchSrsReviewed, setMatchSrsReviewed] = useState(0);

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
      const response = await folderAPI.getAll();
      const data = response.data;
      if (data.success) setFolders(data.folders);
    } catch (err) {
      console.error("Fetch folders error", err);
    }
  };

  const fetchSrsStats = async () => {
    try {
      const response = await vocabularyAPI.getSRSStats();
      const data = response.data;
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

      const response = await vocabularyAPI.getWordsByStatus(statusParam);
      const data = response.data;
      let fetchedWords = data.words || [];

      if (selectedFolder) {
        fetchedWords = fetchedWords.filter(w => w.folderId === selectedFolder);
      }

      setWords(fetchedWords);
      setSelectedWords(new Set());
      setCurrentPage(1);
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

    if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('en'));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  // Fetch SRS intervals for a specific card
  const fetchCardIntervals = async (cardId) => {
    try {
      const response = await vocabularyAPI.getIntervals(cardId);
      const data = response.data;
      if (data.success) {
        setFlashcards(prev => prev.map(c =>
          c._id === cardId ? { ...c, nextIntervals: data.intervals } : c
        ));
      }
    } catch (err) {
      console.error("Fetch intervals error", err);
    }
  };

  const startLearning = async () => {
    const topicToUse = customTopic.trim();
    if (!topicToUse) { warning('Vui lòng nhập chủ đề!'); return; }

    setLoading(true);
    try {
      const response = await vocabularyAPI.startLearning({
        topic: topicToUse,
        count: wordCount,
        category: selectedType,
        partOfSpeech: selectedPart,
        level: selectedLevel
      });

      const data = response.data;
      if (data.success) {
        setFlashcards(data.words || []);
        setCurrentCardIndex(0);
        setFlipped(false);
        setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 });
        setIsLearning(true);
        // Fetch intervals for the first card
        if (data.words?.[0]?._id) {
          fetchCardIntervals(data.words[0]._id);
        }
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
      const response = await vocabularyAPI.getFlashcards({ limit: 20 });
      const data = response.data;
      if (data.success && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCardIndex(0);
        setFlipped(false);
        setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 });
        setIsLearning(true);
        success(`Bắt đầu ôn tập ${data.flashcards.length} từ!`);
        // Fetch intervals for the first card
        if (data.flashcards[0]?._id) {
          fetchCardIntervals(data.flashcards[0]._id);
        }
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

    setSessionResults(prev => ({ ...prev, [rating]: (prev[rating] || 0) + 1 }));

    try {
      const response = await vocabularyAPI.reviewWord({ wordId: card._id, rating });
      await response.data; // Wait for completion

      if (currentCardIndex < flashcards.length - 1) {
        const nextIndex = currentCardIndex + 1;
        const nextCard = flashcards[nextIndex];
        setFlipped(false);
        setTimeout(() => {
          setCurrentCardIndex(nextIndex);
          // Fetch accurate intervals for next card from backend
          if (nextCard?._id) {
            fetchCardIntervals(nextCard._id);
          }
        }, 120);
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
    if (selectedWords.size === paginatedWords.length) setSelectedWords(new Set());
    else setSelectedWords(new Set(paginatedWords.map(w => w._id)));
  };

  // Folder Logic
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return warning("Nhập tên thư mục");
    try {
      const response = await folderAPI.create(newFolderName);
      const data = response.data;
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
      const response = await folderAPI.addWords(targetFolderId, Array.from(selectedWords));
      const data = response.data;
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
      const response = await vocabularyAPI.deleteWord(wordId);
      const data = response.data;
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
      const response = await vocabularyAPI.bulkDelete(Array.from(selectedWords));
      const data = response.data;
      if (data.success) {
        success(`Đã xóa ${data.deletedCount} từ!`);
        setSelectedWords(new Set());
        fetchLibraryWords();
        fetchSrsStats();
      } else {
        error(data.message || 'Lỗi khi xóa');
      }
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

  const getMasteryIcon = (status) => {
    const map = { unknown: '⚪', learning: '🟡', known: '🔵', mastered: '🟢' };
    return map[status] || '⚪';
  };

  // User-friendly SRS review status
  const getSrsReviewLabel = (word) => {
    const dueDate = word.srs?.dueDate || word.mastery?.nextReviewAt;
    if (!dueDate) return { text: 'Chưa lên lịch', color: '#94a3b8', icon: '📅' };
    const now = new Date();
    const d = new Date(dueDate);
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Quá hạn', color: '#ef4444', icon: '🔴' };
    if (days === 0) return { text: 'Ôn hôm nay', color: '#f59e0b', icon: '🟠' };
    if (days === 1) return { text: 'Ôn ngày mai', color: '#3b82f6', icon: '🔵' };
    if (days < 7) return { text: `Ôn sau ${days} ngày`, color: '#6366f1', icon: '🟣' };
    if (days < 30) return { text: `Ôn sau ${Math.round(days / 7)} tuần`, color: '#22c55e', icon: '🟢' };
    return { text: `Ôn sau ${Math.round(days / 30)} tháng`, color: '#22c55e', icon: '🟢' };
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

  // Debounced search to prevent excessive re-renders while typing
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Memoized: filter + sort words (uses debounced search for better perf)
  const sortedWords = useMemo(() => {
    let filtered = words;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = words.filter(w =>
        w.word.toLowerCase().includes(q) ||
        (w.meaning?.vi || '').toLowerCase().includes(q) ||
        (w.topic || '').toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
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
  }, [words, debouncedSearch, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedWords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedWords, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, libraryTab, selectedFolder]);

  const intervals = getCurrentCardIntervals();
  const currentCard = flashcards[currentCardIndex];

  // ===== MATCH GAME LOGIC =====
  // Timer effect for match game
  useEffect(() => {
    let interval;
    if (matchGameActive && !matchGameComplete) {
      interval = setInterval(() => {
        setMatchTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchGameActive, matchGameComplete]);

  // SRS review for matched words (fire & forget)
  const reviewMatchedWord = async (wordId) => {
    try {
      await vocabularyAPI.reviewWord({ wordId, rating: 'good' });
      setMatchSrsReviewed(prev => prev + 1);
    } catch (err) {
      // Silent fail — don't interrupt game
    }
  };

  // Spawn floating score popup
  const spawnFloatingScore = (points, combo) => {
    const id = Date.now() + Math.random();
    const x = 30 + Math.random() * 40; // random horizontal position %
    setFloatingScores(prev => [...prev, { id, points, combo, x }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1200);
  };

  // Spawn confetti on game complete
  const spawnConfetti = () => {
    const pieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      color: ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa'][Math.floor(Math.random() * 6)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360
    }));
    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 4000);
  };

  const startMatchGame = async () => {
    setMatchLoadingGame(true);
    try {
      const response = await vocabularyAPI.matchGame(matchPairCount);
      const data = response.data;
      if (data.success && data.words.length >= 3) {
        const words = data.words;
        setMatchWords(words);
        setShuffledEn([...words].sort(() => Math.random() - 0.5));
        setShuffledVi([...words].sort(() => Math.random() - 0.5));
        setMatchedPairs(new Set());
        setMatchSelected({ en: null, vi: null });
        setMatchWrong({ en: null, vi: null });
        setMatchScore(0);
        setMatchCombo(0);
        setMatchTimer(0);
        setMatchAttempts(0);
        setMatchGameComplete(false);
        setMatchGameActive(true);
        setMatchStartTime(Date.now());
        setMatchSrsReviewed(0);
        setFloatingScores([]);
        setConfettiPieces([]);
        success(`🎮 Bắt đầu nối ${words.length} cặp từ!`);
      } else {
        warning(data.message || 'Không đủ từ vựng để chơi. Hãy học thêm từ mới!');
      }
    } catch (err) {
      console.error('Match game error:', err);
      error('Lỗi khi tải trò chơi.');
    } finally {
      setMatchLoadingGame(false);
    }
  };

  const handleMatchSelect = (type, wordObj) => {
    if (matchedPairs.has(wordObj._id)) return;

    const newSelection = { ...matchSelected, [type]: wordObj };
    setMatchSelected(newSelection);
    setMatchWrong({ en: null, vi: null });

    if (newSelection.en && newSelection.vi) {
      setMatchAttempts(prev => prev + 1);

      if (newSelection.en._id === newSelection.vi._id) {
        // ✅ Correct match!
        const newCombo = matchCombo + 1;
        const points = 10 * newCombo;
        setMatchScore(prev => prev + points);
        setMatchCombo(newCombo);

        // Floating score effect
        spawnFloatingScore(points, newCombo);

        // SRS Review — count as "good" review
        reviewMatchedWord(newSelection.en._id);

        const newMatched = new Set(matchedPairs);
        newMatched.add(newSelection.en._id);
        setMatchedPairs(newMatched);
        setMatchSelected({ en: null, vi: null });

        // Check if game complete
        if (newMatched.size === matchWords.length) {
          setMatchGameComplete(true);
          const totalTime = Math.round((Date.now() - matchStartTime) / 1000);
          setMatchTimer(totalTime);
          spawnConfetti();
          fetchSrsStats(); // Refresh SRS stats after game
        }
      } else {
        // ❌ Wrong match
        setMatchWrong({ en: newSelection.en, vi: newSelection.vi });
        setMatchCombo(0);
        setTimeout(() => {
          setMatchSelected({ en: null, vi: null });
          setMatchWrong({ en: null, vi: null });
        }, 600);
      }
    }
  };

  const formatMatchTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getMatchAccuracy = () => {
    if (matchAttempts === 0) return 100;
    return Math.round((matchedPairs.size / matchAttempts) * 100);
  };

  const getMatchStars = () => {
    const accuracy = getMatchAccuracy();
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    return 1;
  };

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
        <button
          className={`main-tab-btn ${activeTab === 'match' ? 'active' : ''}`}
          onClick={() => { setActiveTab('match'); setMatchGameActive(false); setMatchGameComplete(false); }}
        >
          🎮 Nối Từ
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
        {isLearning && flashcards.length > 0 && currentCard && (
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
                  <h2 className="word">{currentCard.word}</h2>

                  <div className="card-meta">
                    <span className="part-of-speech">({currentCard.partOfSpeech})</span>
                    <span className={`level-badge ${currentCard.level}`}>{currentCard.level}</span>
                    {currentCard.mastery && (
                      <span className="mastery-badge-simple" style={{ color: getMasteryColor(currentCard.mastery.status) }}>
                        {getMasteryLabel(currentCard.mastery.status)}
                      </span>
                    )}
                  </div>

                  {typeof currentCard.pronunciation === 'string' ? (
                    <div className="pronunciation-single" onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.word, 'UK'); }}>
                      <span className="ipa">/{currentCard.pronunciation}/</span>
                      <button className="audio-btn-round">🔊</button>
                    </div>
                  ) : (
                    <div className="pronunciation-container">
                      <div className="pron-item uk" onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.word, 'UK'); }}>
                        <span className="lang-code">UK</span>
                        <span className="ipa">/{currentCard.pronunciation?.uk || ''}/</span>
                        <button className="audio-btn-mini">🔊</button>
                      </div>
                      <div className="pron-item us" onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.word, 'US'); }}>
                        <span className="lang-code">US</span>
                        <span className="ipa">/{currentCard.pronunciation?.us || ''}/</span>
                        <button className="audio-btn-mini">🔊</button>
                      </div>
                    </div>
                  )}

                  <p className="hint">👆 Chạm để lật</p>
                </div>
              </div>

              <div className="card-face back">
                <div className="card-content">
                  <h3 className="meaning">{currentCard.meaning?.vi}</h3>
                  <div className="card-back-meta">
                    <span className="back-pos">({currentCard.partOfSpeech})</span>
                    {currentCard.topic && (
                      <span className="back-topic">📂 {currentCard.topic}</span>
                    )}
                  </div>
                  <div className="example-box">
                    <p className="example-en">"{currentCard.example}"</p>
                  </div>
                  {currentCard.srs?.step > 0 && (
                    <div className="card-back-srs">
                      <span className="srs-step-info">📊 SRS Bước {currentCard.srs.step}</span>
                      <span className="srs-reviews-info">
                        ✅ {currentCard.mastery?.correctCount || 0} / ❌ {currentCard.mastery?.incorrectCount || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SRS CONTROLS */}
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
                        📂 Thêm ({selectedWords.size})
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
              {viewMode === 'list' && paginatedWords.length > 0 && (
                <div className="list-header-row">
                  <input type="checkbox" checked={selectedWords.size === paginatedWords.length && paginatedWords.length > 0} onChange={toggleSelectAll} />
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
              ) : paginatedWords.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>Chưa có từ vựng nào.</p>
                  <p className="empty-sub">Hãy bắt đầu học từ vựng theo chủ đề!</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "words-grid" : "words-list"}>
                  {paginatedWords.map((word) => (
                    <div
                      key={word._id}
                      className={`word-card ${viewMode} ${selectedWords.has(word._id) ? 'selected' : ''}`}
                      onClick={() => toggleSelectWord(word._id)}
                    >
                      {viewMode === 'grid' ? (
                        // GRID VIEW - Clean Minimal Card
                        <>
                          <div className="card-select" onClick={(e) => { e.stopPropagation(); toggleSelectWord(word._id); }}>
                            <input type="checkbox" checked={selectedWords.has(word._id)} readOnly />
                          </div>

                          <div className="word-header">
                            <h4>{word.word}</h4>
                            <div className="word-badges">
                              <span className={`level-badge ${word.level}`}>{word.level}</span>
                            </div>
                          </div>

                          <p className="meaning-vi">{word.meaning?.vi}</p>

                          <div className="card-footer">
                            <div className="srs-info">
                              <span className="mastery-indicator" style={{ color: getMasteryColor(word.mastery?.status) }}>
                                {getMasteryIcon(word.mastery?.status)} {getMasteryLabel(word.mastery?.status)}
                              </span>
                              <span className="srs-review-status" style={{ color: getSrsReviewLabel(word).color }}>
                                {getSrsReviewLabel(word).icon} {getSrsReviewLabel(word).text}
                              </span>
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
                              ? <span>/{word.pronunciation}/</span>
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
                              style={{ backgroundColor: getMasteryColor(word.mastery?.status) + '18', color: getMasteryColor(word.mastery?.status) }}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) {
                      page = i + 1;
                    } else if (currentPage <= 4) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      page = totalPages - 6 + i;
                    } else {
                      page = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={page}
                        className={currentPage === page ? 'active' : ''}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    ›
                  </button>
                  <span className="pagination-info">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedWords.length)} / {sortedWords.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MATCH GAME TAB */}
        {activeTab === 'match' && !matchGameActive && !matchGameComplete && (
          <div className="match-game-setup">
            <div className="match-hero">
              <span className="match-hero-icon">🎯</span>
              <h2>Trò Chơi Nối Từ</h2>
              <p>Nối các từ tiếng Anh với nghĩa tiếng Việt tương ứng!</p>
            </div>

            <div className="match-rules">
              <div className="match-rule">
                <span className="rule-icon">👆</span>
                <div><strong>Chọn từ</strong><p>Chọn 1 từ tiếng Anh ở cột trái</p></div>
              </div>
              <div className="match-rule">
                <span className="rule-icon">👉</span>
                <div><strong>Nối nghĩa</strong><p>Chọn nghĩa tiếng Việt tương ứng ở cột phải</p></div>
              </div>
              <div className="match-rule">
                <span className="rule-icon">⚡</span>
                <div><strong>Combo</strong><p>Nối liên tiếp đúng để nhân điểm!</p></div>
              </div>
            </div>

            <div className="match-pair-selector">
              <label>🔢 Số cặp từ:</label>
              <div className="match-pair-options">
                {[4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    className={`match-pair-btn ${matchPairCount === n ? 'active' : ''}`}
                    onClick={() => setMatchPairCount(n)}
                  >
                    {n} cặp
                  </button>
                ))}
              </div>
            </div>

            <button
              className="match-start-btn"
              onClick={startMatchGame}
              disabled={matchLoadingGame}
            >
              {matchLoadingGame ? (
                <><span className="match-spinner" /> Đang tải...</>
              ) : (
                <>🚀 Bắt Đầu Chơi!</>
              )}
            </button>
          </div>
        )}

        {/* MATCH GAME ACTIVE */}
        {activeTab === 'match' && matchGameActive && !matchGameComplete && (
          <div className="match-game-board">
            <div className="match-game-header">
              <button className="back-btn" onClick={() => { setMatchGameActive(false); setMatchGameComplete(false); }}>← Quay lại</button>
              <div className="match-hud">
                <div className="hud-item score">
                  <span className="hud-icon">⭐</span>
                  <span className="hud-value">{matchScore}</span>
                </div>
                {matchCombo > 1 && (
                  <div className={`hud-item combo ${matchCombo >= 5 ? 'on-fire' : ''}`}>
                    <span className="hud-value">x{matchCombo}</span>
                    <span className="hud-label">{matchCombo >= 5 ? '🔥 On Fire!' : 'Combo!'}</span>
                  </div>
                )}
                <div className="hud-item timer">
                  <span className="hud-icon">⏱️</span>
                  <span className="hud-value">{formatMatchTime(matchTimer)}</span>
                </div>
                <div className="hud-item progress">
                  <span className="hud-value">{matchedPairs.size}/{matchWords.length}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="match-progress-track">
              <div
                className="match-progress-fill"
                style={{ width: `${(matchedPairs.size / matchWords.length) * 100}%` }}
              />
            </div>

            {/* Floating Score Popups */}
            <div className="floating-scores-container">
              {floatingScores.map(s => (
                <div key={s.id} className="floating-score" style={{ left: `${s.x}%` }}>
                  <span className="fs-points">+{s.points}</span>
                  {s.combo > 1 && <span className="fs-combo">x{s.combo}</span>}
                </div>
              ))}
            </div>

            <div className="match-columns">
              {/* English Column */}
              <div className="match-column en-column">
                <div className="column-header">🇬🇧 English</div>
                {shuffledEn.map(w => {
                  const isMatched = matchedPairs.has(w._id);
                  const isSelected = matchSelected.en?._id === w._id;
                  const isWrong = matchWrong.en?._id === w._id;
                  return (
                    <button
                      key={`en-${w._id}`}
                      className={`match-word-btn ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                      onClick={() => !isMatched && handleMatchSelect('en', w)}
                      disabled={isMatched}
                    >
                      <span className="match-word-text">{w.word}</span>
                      {w.partOfSpeech && <span className="match-word-pos">({w.partOfSpeech})</span>}
                      {isMatched && <span className="match-check">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Vietnamese Column */}
              <div className="match-column vi-column">
                <div className="column-header">🇻🇳 Tiếng Việt</div>
                {shuffledVi.map(w => {
                  const isMatched = matchedPairs.has(w._id);
                  const isSelected = matchSelected.vi?._id === w._id;
                  const isWrong = matchWrong.vi?._id === w._id;
                  return (
                    <button
                      key={`vi-${w._id}`}
                      className={`match-word-btn vi ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                      onClick={() => !isMatched && handleMatchSelect('vi', w)}
                      disabled={isMatched}
                    >
                      <span className="match-word-text">{w.meaning}</span>
                      {isMatched && <span className="match-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MATCH GAME COMPLETE */}
        {activeTab === 'match' && matchGameComplete && (
          <div className="match-result">
            {/* Confetti Effect */}
            {confettiPieces.length > 0 && (
              <div className="confetti-container">
                {confettiPieces.map(p => (
                  <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                      left: `${p.x}%`,
                      animationDelay: `${p.delay}s`,
                      animationDuration: `${p.duration}s`,
                      backgroundColor: p.color,
                      width: `${p.size}px`,
                      height: `${p.size * 0.6}px`,
                      transform: `rotate(${p.rotation}deg)`
                    }}
                  />
                ))}
              </div>
            )}

            <div className="match-result-card">
              <div className="result-trophy">
                {getMatchStars() === 3 ? '🏆' : getMatchStars() === 2 ? '🥈' : '🥉'}
              </div>
              <h2 className="result-title">Hoàn Thành!</h2>
              <div className="result-stars">
                {[1, 2, 3].map(i => (
                  <span key={i} className={`result-star ${i <= getMatchStars() ? 'earned' : ''}`}>⭐</span>
                ))}
              </div>

              {/* SRS Badge */}
              <div className="srs-review-badge">
                <span className="srs-badge-icon">📊</span>
                <span className="srs-badge-text">
                  Đã ôn tập SRS: <strong>{matchSrsReviewed}</strong> từ
                </span>
              </div>

              <div className="result-stats-grid">
                <div className="result-stat">
                  <span className="result-stat-icon">⭐</span>
                  <span className="result-stat-value">{matchScore}</span>
                  <span className="result-stat-label">Điểm</span>
                </div>
                <div className="result-stat">
                  <span className="result-stat-icon">⏱️</span>
                  <span className="result-stat-value">{formatMatchTime(matchTimer)}</span>
                  <span className="result-stat-label">Thời gian</span>
                </div>
                <div className="result-stat">
                  <span className="result-stat-icon">🎯</span>
                  <span className="result-stat-value">{getMatchAccuracy()}%</span>
                  <span className="result-stat-label">Chính xác</span>
                </div>
                <div className="result-stat">
                  <span className="result-stat-icon">🔗</span>
                  <span className="result-stat-value">{matchWords.length}</span>
                  <span className="result-stat-label">Cặp từ</span>
                </div>
              </div>

              <div className="result-word-list">
                <h4>📝 Các từ đã nối:</h4>
                {matchWords.map(w => (
                  <div key={w._id} className="result-word-row">
                    <span className="rw-en">{w.word}</span>
                    <span className="rw-arrow">↔</span>
                    <span className="rw-vi">{w.meaning}</span>
                  </div>
                ))}
              </div>

              <div className="result-actions">
                <button className="match-start-btn" onClick={startMatchGame}>🔄 Chơi Lại</button>
                <button className="cancel-btn" onClick={() => { setMatchGameActive(false); setMatchGameComplete(false); }}>← Quay lại</button>
              </div>
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
