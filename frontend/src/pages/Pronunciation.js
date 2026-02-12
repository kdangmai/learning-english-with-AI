import React, { useState, useRef, useEffect } from 'react';
import './Pronunciation.css';
import { useToast } from '../context/ToastContext';

const LEVELS = [
    { value: 'A1', label: 'Cơ bản', color: '#10b981' },
    { value: 'A2', label: 'Sơ cấp', color: '#3b82f6' },
    { value: 'B1', label: 'Trung cấp', color: '#6366f1' },
    { value: 'B2', label: 'Cao trung', color: '#8b5cf6' },
    { value: 'C1', label: 'Cao cấp', color: '#f59e0b' },
    { value: 'C2', label: 'Thành thạo', color: '#ef4444' },
];

export default function Pronunciation() {
    const [targetSentence, setTargetSentence] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [voices, setVoices] = useState([]);
    const [level, setLevel] = useState('A1');
    const [generating, setGenerating] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);

    const recognitionRef = useRef(null);
    const transcriptRef = useRef('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const { error: showError } = useToast();

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;

            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            if (SpeechGrammarList && targetSentence) {
                const grammar = `#JSGF V1.0; grammar phrase; public <phrase> = ${targetSentence.replace(/[^\w\s]/gi, '')} ;`;
                const speechRecognitionList = new SpeechGrammarList();
                speechRecognitionList.addFromString(grammar, 1);
                recognitionRef.current.grammars = speechRecognitionList;
            }

            recognitionRef.current.onstart = () => {
                setIsRecording(true);
                setError('');
                setAnalysis(null);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                if (transcriptRef.current && transcriptRef.current.trim().length > 0) {
                    handleAnalysis(targetSentence, transcriptRef.current);
                }
            };

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                transcriptRef.current = transcript;
                setSpokenText(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                if (event.error !== 'no-speech') {
                    setError('Lỗi nhận diện giọng nói: ' + event.error);
                }
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setIsRecording(false);
                }
            };
        } else {
            setError('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
        }

        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, [targetSentence]);

    const startRecording = async () => {
        try {
            const constraints = {
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result.split(',')[1];
                    handleAnalysis(targetSentence, base64Audio);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setError('');
            setAnalysis(null);
            setSpokenText('(Đang ghi âm...)');
        } catch (err) {
            console.error('Microphone access error:', err);
            showError('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setSpokenText('(Đang gửi âm thanh để phân tích...)');
        }
    };

    const handleToggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const handleListen = () => {
        if (!targetSentence) return;
        const utterance = new SpeechSynthesisUtterance(targetSentence);
        utterance.lang = 'en-US';
        const voice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    };

    const handleAnalysis = async (target, audioBase64) => {
        setLoading(true);
        try {
            const response = await fetch('/api/pronunciation/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetSentence: target, audioData: audioBase64 })
            });
            const data = await response.json();
            if (data.success) {
                setAnalysis(data);
                setSessionCount(prev => prev + 1);
                if (data.transcript) setSpokenText(data.transcript);
            } else {
                setError(data.message || 'Phân tích thất bại.');
                setSpokenText('');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi kết nối máy chủ.');
            setSpokenText('');
        } finally {
            setLoading(false);
        }
    };

    const generateNewSentence = async () => {
        setGenerating(true);
        setError('');
        setSpokenText('');
        setAnalysis(null);
        try {
            const response = await fetch(`/api/pronunciation/generate?level=${level}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setTargetSentence(data.sentence);
            } else {
                setError('Không thể tạo câu mới.');
            }
        } catch (e) {
            console.error(e);
            setError('Lỗi kết nối khi tạo câu.');
        } finally {
            setGenerating(false);
        }
    };

    const getScoreClass = (score) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    };

    const getScoreEmoji = (score) => {
        if (score >= 90) return '🌟';
        if (score >= 80) return '🎉';
        if (score >= 60) return '👍';
        if (score >= 40) return '💪';
        return '📚';
    };

    return (
        <div className="pronunciation-page">
            {/* Header */}
            <div className="pron-header">
                <div className="pron-header-left">
                    <h1>🗣️ Luyện Phát Âm AI</h1>
                    <p className="pron-subtitle">Lắng nghe, nhắc lại và để AI sửa lỗi cho bạn</p>
                </div>
                <div className="pron-header-right">
                    {sessionCount > 0 && (
                        <div className="pron-session-badge">
                            <span>🔥</span> {sessionCount} lần luyện
                        </div>
                    )}
                </div>
            </div>

            <div className="pron-main-layout">
                {/* Left Panel: Settings */}
                <div className="pron-settings-panel">
                    <div className="pron-setting-group">
                        <label>📊 Trình độ</label>
                        <div className="pron-level-pills">
                            {LEVELS.map((l) => (
                                <button
                                    key={l.value}
                                    className={`pron-level-pill ${level === l.value ? 'active' : ''}`}
                                    onClick={() => setLevel(l.value)}
                                    style={{ '--pill-color': l.color }}
                                    disabled={generating}
                                >
                                    <span className="pron-pill-val">{l.value}</span>
                                    <span className="pron-pill-label">{l.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pron-setting-group">
                        <label>📖 Hướng dẫn</label>
                        <div className="pron-instructions">
                            <div className="pron-step"><span className="step-num">1</span> Chọn trình độ và tạo câu</div>
                            <div className="pron-step"><span className="step-num">2</span> Nghe mẫu bằng nút 🔊</div>
                            <div className="pron-step"><span className="step-num">3</span> Nhấn 🎤 và đọc to</div>
                            <div className="pron-step"><span className="step-num">4</span> AI phân tích và chấm điểm</div>
                        </div>
                    </div>

                    <button
                        className="pron-generate-btn"
                        onClick={generateNewSentence}
                        disabled={generating}
                    >
                        {generating ? (
                            <><span className="pron-spinner"></span> Đang tạo...</>
                        ) : (
                            '✨ Tạo câu luyện tập'
                        )}
                    </button>
                </div>

                {/* Right Panel: Practice Area */}
                <div className="pron-practice-panel">
                    {!targetSentence ? (
                        <div className="pron-empty-state">
                            <span className="pron-empty-icon">🎙️</span>
                            <h3>Sẵn sàng luyện phát âm?</h3>
                            <p>Chọn trình độ bên trái và nhấn "Tạo câu luyện tập" để bắt đầu.</p>
                        </div>
                    ) : (
                        <>
                            {/* Target Sentence */}
                            <div className="pron-target-card">
                                <div className="pron-target-label">Câu mẫu</div>
                                <h3 className="pron-target-text">"{targetSentence}"</h3>
                                <div className="pron-target-actions">
                                    <button className="pron-icon-btn listen" onClick={handleListen} title="Nghe mẫu">
                                        🔊 <span>Nghe</span>
                                    </button>
                                    <button className="pron-icon-btn refresh" onClick={generateNewSentence} disabled={generating} title="Đổi câu khác">
                                        🔄 <span>Đổi câu</span>
                                    </button>
                                </div>
                            </div>

                            {/* Record Button */}
                            <div className="pron-record-area">
                                <button
                                    className={`pron-record-btn ${isRecording ? 'recording' : ''}`}
                                    onClick={handleToggleRecording}
                                    disabled={loading}
                                >
                                    <span className="pron-record-icon">{isRecording ? '⏹️' : '🎤'}</span>
                                    <span>{isRecording ? 'Dừng & Chấm điểm' : 'Nhấn để nói'}</span>
                                </button>
                                {isRecording && <div className="pron-recording-indicator">Đang lắng nghe...</div>}
                            </div>

                            {/* Spoken Text */}
                            {spokenText && (
                                <div className="pron-spoken-card">
                                    <div className="pron-spoken-label">📝 Bạn đã nói:</div>
                                    <p className="pron-spoken-text">"{spokenText}"</p>
                                </div>
                            )}

                            {/* Loading */}
                            {loading && (
                                <div className="pron-loading">
                                    <span className="pron-spinner"></span>
                                    AI đang phân tích phát âm của bạn...
                                </div>
                            )}

                            {/* Error */}
                            {error && <div className="pron-error">{error}</div>}

                            {/* Analysis Result */}
                            {analysis && (
                                <div className={`pron-analysis ${getScoreClass(analysis.score)}`}>
                                    <div className="pron-score-section">
                                        <div className="pron-score-circle">
                                            <span className="pron-score-emoji">{getScoreEmoji(analysis.score)}</span>
                                            <span className="pron-score-value">{analysis.score}</span>
                                            <span className="pron-score-label">điểm</span>
                                        </div>
                                        <div className="pron-score-message">
                                            {analysis.score >= 80 && <h4>Xuất sắc!</h4>}
                                            {analysis.score >= 60 && analysis.score < 80 && <h4>Khá tốt!</h4>}
                                            {analysis.score >= 40 && analysis.score < 60 && <h4>Cần luyện thêm</h4>}
                                            {analysis.score < 40 && <h4>Cố gắng lên!</h4>}
                                        </div>
                                    </div>

                                    <div className="pron-feedback-section">
                                        <div className="pron-feedback-block">
                                            <h4>💬 Nhận xét của AI</h4>
                                            <p>{analysis.feedback}</p>
                                        </div>

                                        {analysis.mistakes && analysis.mistakes.length > 0 && (
                                            <div className="pron-mistakes-block">
                                                <h4>⚠️ Cần cải thiện</h4>
                                                <div className="pron-mistakes-list">
                                                    {analysis.mistakes.map((m, idx) => (
                                                        <div key={idx} className="pron-mistake-item">
                                                            <div className="mistake-word">
                                                                <strong>{m.word}</strong>
                                                                <span className="mistake-arrow">→</span>
                                                                <em>"{m.soundedLike}"</em>
                                                            </div>
                                                            <p className="mistake-advice">💡 {m.advice}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pron-analysis-actions">
                                        <button className="pron-retry-btn" onClick={handleToggleRecording}>
                                            🔁 Thử lại
                                        </button>
                                        <button className="pron-next-btn" onClick={generateNewSentence}>
                                            ➡️ Câu tiếp
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
