import React, { useState, useEffect } from 'react';
import { readingVocabAPI, vocabularyAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './ReadingVocab.css';

// Sub-components
import AnimatedPage from '../components/AnimatedPage';

export default function ReadingVocab() {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState('analyse');
  
  // Analyse Tab State
  const [passage, setPassage] = useState('');
  const [targetBand, setTargetBand] = useState('7.0');
  const [userLevel, setUserLevel] = useState('Intermediate (B1)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedWords, setExtractedWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Study List Tab State
  const [savedWords, setSavedWords] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Load list when switching tabs
  useEffect(() => {
    if (activeTab === 'list') {
      fetchSavedWords();
    } else if (activeTab === 'review') {
      fetchReviewList();
    }
  }, [activeTab]);

  // Review Tab State
  const [reviewDue, setReviewDue] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  const playAudio = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleDeleteWord = async (wordId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this word?')) return;
    try {
      await vocabularyAPI.deleteWord(wordId);
      success('Word deleted successfully');
      setSavedWords(prev => prev.filter(w => w._id !== wordId));
    } catch (error) {
      console.error(error);
      showError('Failed to delete word');
    }
  };

  const fetchReviewList = async () => {
    setIsLoadingReview(true);
    try {
      const resp = await readingVocabAPI.getReviewDue();
      setReviewDue(resp.data);
      setCurrentReviewIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error(error);
      showError('Failed to load due reviews.');
    } finally {
      setIsLoadingReview(false);
    }
  };

  const submitReview = async (quality, e) => {
    if (e) e.stopPropagation();
    const word = reviewDue[currentReviewIndex];
    let action = 'again';
    if (quality === 1) action = 'hard';
    if (quality === 2) action = 'good';
    if (quality === 3) action = 'easy';

    try {
      await vocabularyAPI.reviewWord({ wordId: word._id, action });
      setCurrentReviewIndex(prev => prev + 1);
      setIsFlipped(false);
    } catch (error) {
      console.error(error);
      showError('Failed to submit review');
    }
  };

  const handleAnalyse = async () => {
    if (!passage.trim() || passage.length < 50) {
      showError('Passage is too short. Please provide a meaningful text.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const response = await readingVocabAPI.analyze({ passage, targetBand, userLevel });
      console.log('AI Response:', response.data);
      setExtractedWords(response.data);
      // Auto-select all by default
      setSelectedWords(new Set(response.data.map(w => w.word)));
      success(`Found ${response.data.length} valuable essential words!`);
    } catch (error) {
      console.error(error);
      showError(error.response?.data?.message || 'Failed to analyze passage.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleWordSelection = (wordStr) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(wordStr)) next.delete(wordStr);
      else next.add(wordStr);
      return next;
    });
  };

  const handleSaveWords = async () => {
    const wordsToSave = extractedWords.filter(w => selectedWords.has(w.word));
    if (wordsToSave.length === 0) return;

    setIsSaving(true);
    try {
      const resp = await readingVocabAPI.saveWords(wordsToSave);
      success(resp.data.message || 'Words saved successfully!');
      // Remove saved words from UI
      setExtractedWords(prev => prev.filter(w => !selectedWords.has(w.word)));
      setSelectedWords(new Set());
    } catch (error) {
      console.error(error);
      showError('Failed to save words.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSavedWords = async () => {
    setIsLoadingList(true);
    try {
      const resp = await readingVocabAPI.getList();
      setSavedWords(resp.data);
    } catch (error) {
      console.error(error);
      showError('Failed to load study list.');
    } finally {
      setIsLoadingList(false);
    }
  };

  return (
    <div className="reading-vocab-container">
      <div className="reading-vocab-header">
        <h1>🔍 IELTS Reading Vocabulary Coach</h1>
        <p>Phân tích bài đọc IELTS và trích xuất lượng từ vựng "ăn điểm" dựa trên AI.</p>
      </div>

      <div className="rv-tabs">
        <button 
          className={`rv-tab-btn ${activeTab === 'analyse' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyse')}
        >
          <span>✨</span> Analyse Text
        </button>
        <button 
          className={`rv-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <span>📚</span> Study List
        </button>
        <button 
          className={`rv-tab-btn ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <span>🧠</span> Flashcard Review
        </button>
      </div>

      <AnimatedPage>
        {activeTab === 'analyse' && (
          <div className="tab-pane">
            <div className="analyse-section">
              <div className="input-group">
                <label>Dán bài đọc tiếng Anh (Reading Passage) vào đây:</label>
                <textarea 
                  className="passage-input"
                  placeholder="The proliferation of digital technology..."
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                />
              </div>

              <div className="controls-row">
                <div className="input-group select-wrapper">
                  <label>Mục tiêu IELTS Band:</label>
                  <select 
                    className="rv-select"
                    value={targetBand}
                    onChange={(e) => setTargetBand(e.target.value)}
                  >
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                    <option value="7.5">7.5</option>
                    <option value="8.0+">8.0+</option>
                  </select>
                </div>

                <div className="input-group select-wrapper">
                  <label>Trình độ hiện tại:</label>
                  <select 
                    className="rv-select"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                  >
                    <option value="Beginner (A1-A2)">Beginner (A1-A2)</option>
                    <option value="Intermediate (B1)">Intermediate (B1)</option>
                    <option value="Upper Intermediate (B2)">Upper Intermediate (B2)</option>
                    <option value="Advanced (C1)">Advanced (C1)</option>
                  </select>
                </div>

                <button 
                  className="analyse-btn" 
                  onClick={handleAnalyse}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <div className="spinner"></div> : 'Phân tích từ vựng'}
                </button>
              </div>
            </div>

            {/* Results Output */}
            {extractedWords.length > 0 && (
              <div className="results-section">
                <div className="results-header">
                  <h2>Từ vựng được đề xuất ({extractedWords.length})</h2>
                  <button 
                    className="save-all-btn"
                    onClick={handleSaveWords}
                    disabled={isSaving || selectedWords.size === 0}
                  >
                    {isSaving ? 'Đang lưu...' : `Lưu từ đã chọn (${selectedWords.size})`}
                  </button>
                </div>

                <div className="words-grid">
                  {extractedWords.map((wordObj) => {
                    const isSelected = selectedWords.has(wordObj.word);
                    return (
                      <div 
                        key={wordObj.word} 
                        className={`word-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleWordSelection(wordObj.word)}
                      >
                        <div className="word-header">
                          <div className="word-title">
                            <h3>{wordObj.word}</h3>
                            <span className="word-phonetic">{wordObj.phonetic}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                             <span className="word-pos">{wordObj.partOfSpeech}</span>
                             <input 
                               type="checkbox" 
                               className="select-checkbox"
                               checked={isSelected}
                               onChange={() => {}} // handled by parent div click
                               onClick={(e) => e.stopPropagation()} // in case they directly click checkbox
                             />
                          </div>
                        </div>

                        <div className="word-body">
                          <p className="word-def">{wordObj.definition}</p>
                          <p className="word-example">"{wordObj.exampleSentence}"</p>
                          
                          {wordObj.synonyms && wordObj.synonyms.length > 0 && (
                           <div className="word-synonyms">
                            {wordObj.synonyms.map(syn => <span key={syn} className="synonym-tag">{syn}</span>)}
                           </div>
                          )}

                          <div className="word-reason">
                            {wordObj.essentialReason}
                          </div>
                          <div className="word-memory">
                            {wordObj.memoryHook}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="tab-pane study-list-section">
            <h2>Danh sách từ đã lưu (IELTS Reading)</h2>
            {isLoadingList ? (
               <p>Đang tải...</p>
            ) : savedWords.length > 0 ? (
              <div className="saved-words-grid">
                {savedWords.map(w => {
                   // Parse JSON stringified vi meaning if it contains full object tracking
                   let parsedMeaning = w.definition;
                   let isJson = false;
                   if (!parsedMeaning && w.meaning && w.meaning.vi) {
                     try {
                       const obj = JSON.parse(w.meaning.vi);
                       if (obj.definition) {
                         parsedMeaning = obj.definition;
                         isJson = true;
                       } else {
                         parsedMeaning = w.meaning.vi;
                       }
                     } catch(e) {
                       parsedMeaning = w.meaning.vi;
                     }
                   }
                   return (
                     <div key={w._id} className="word-card saved-card">
                        <div className="word-header">
                          <div className="word-title">
                            <h3>{w.word}</h3>
                            <span className="word-phonetic">{w.pronunciation || ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                             <button className="icon-btn" onClick={(e) => playAudio(w.word, e)} title="Listen">🔊</button>
                             <span className="word-pos">{w.partOfSpeech}</span>
                             <button className="icon-btn delete-btn" onClick={(e) => handleDeleteWord(w._id, e)} title="Delete word">🗑️</button>
                          </div>
                        </div>
                        <div className="word-body">
                           <p className="word-def">{parsedMeaning}</p>
                           <div className="srs-status">
                             {w.isNewWord ? <span className="status-tag new">Mới</span> : (w.srs?.step > 0 ? <span className="status-tag learning">Đang học (Lv {w.srs.step})</span> : <span className="status-tag due">Cần ôn</span>)}
                           </div>
                        </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <p>Chưa có từ vựng nào. Hãy phân tích bài đọc để thêm từ!</p>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="tab-pane review-section">
             {isLoadingReview ? (
                <div style={{textAlign: 'center', padding: '3rem'}}><div className="spinner" style={{borderColor: 'var(--primary-color)', borderTopColor: 'transparent', width: '40px', height: '40px', margin: '0 auto'}}></div></div>
             ) : reviewDue.length > 0 && currentReviewIndex < reviewDue.length ? (
                <div className="flashcard-container">
                   <div className="flashcard-header">
                     <h3>Thẻ {currentReviewIndex + 1} / {reviewDue.length}</h3>
                   </div>
                   
                   <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                      <div className="flashcard-inner">
                         <div className="flashcard-front">
                            <h2>{reviewDue[currentReviewIndex].word}</h2>
                            <button className="large-audio-btn" onClick={(e) => playAudio(reviewDue[currentReviewIndex].word, e)}>🔊</button>
                            <span className="click-hint">Click để xem nghĩa</span>
                         </div>
                         <div className="flashcard-back">
                            <h2>{reviewDue[currentReviewIndex].word}</h2>
                            <span className="word-phonetic">{reviewDue[currentReviewIndex].pronunciation}</span>
                            <span className="word-pos">{reviewDue[currentReviewIndex].partOfSpeech}</span>
                            <div className="flashcard-meaning">
                               {(() => {
                                 const w = reviewDue[currentReviewIndex];
                                 try {
                                   const obj = JSON.parse(w.meaning.vi);
                                   return (
                                     <>
                                       <p><strong>Nghĩa:</strong> {obj.definition}</p>
                                       {obj.memoryHook && <p className="word-memory">{obj.memoryHook}</p>}
                                       {obj.exampleSentence && <p className="word-example" style={{marginTop: '1rem'}}>"{obj.exampleSentence}"</p>}
                                     </>
                                   );
                                 } catch(e) {
                                   return <p>{w.meaning?.vi}</p>;
                                 }
                               })()}
                            </div>
                         </div>
                      </div>
                   </div>

                   {isFlipped && (
                      <div className="review-actions">
                         <button className="review-btn again" onClick={(e) => submitReview(0, e)}>Lại (Again)</button>
                         <button className="review-btn hard" onClick={(e) => submitReview(1, e)}>Khó (Hard)</button>
                         <button className="review-btn good" onClick={(e) => submitReview(2, e)}>Tốt (Good)</button>
                         <button className="review-btn easy" onClick={(e) => submitReview(3, e)}>Dễ (Easy)</button>
                      </div>
                   )}
                </div>
             ) : (
                <div style={{textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '16px'}}>
                   <h2>🎉 Hoàn thành!</h2>
                   <p>Bạn đã ôn tập xong các từ vựng IELTS Reading hôm nay.</p>
                   <button className="analyse-btn" style={{margin: '2rem auto'}} onClick={() => fetchReviewList()}>Tải lại danh sách</button>
                </div>
             )}
          </div>
        )}
      </AnimatedPage>
    </div>
  );
}
