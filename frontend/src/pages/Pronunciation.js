import React, { useState, useRef, useEffect } from 'react';
import './Pronunciation.css';
import { useToast } from '../context/ToastContext';
import { pronunciationAPI } from '../services/api';
import HangingSign from '../components/HangingSign';

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
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [voices, setVoices] = useState([]);
    const [level, setLevel] = useState('A1');
    const [generating, setGenerating] = useState(false);
    const [speechRate, setSpeechRate] = useState(1);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const { error: showError } = useToast();

    useEffect(() => {
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, [targetSentence]);

    // Removed unused SpeechRecognition logic that was causing confusion and potential conflicts
    // The app relies on MediaRecorder for sending audio to backend

    const startRecording = async () => {
        try {
            // Simplify constraints to avoid 'OverconstrainedError' on mobile
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Better mimeType detection
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // iOS Safari 14.5+
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg'; // Firefox
            }

            // Create recorder with flexible options
            const options = { mimeType };
            // audioBitsPerSecond is optional, letting browser decide is safer

            mediaRecorderRef.current = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result.split(',')[1];
                    handleAnalysis(targetSentence, base64Audio);
                };

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setError('');
            setAnalysis(null);
        } catch (err) {
            console.error('Microphone access error:', err);
            let msg = 'Không thể truy cập microphone.';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Bạn đã từ chối quyền truy cập Microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'Không tìm thấy microphone trên thiết bị của bạn.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                msg = 'Microphone đang được sử dụng bởi ứng dụng khác.';
            } else if (err.name === 'OverconstrainedError') {
                msg = 'Thiết bị không hỗ trợ định dạng âm thanh yêu cầu.';
            } else if (err.name === 'TypeError' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                msg = 'Trình duyệt yêu cầu kết nối HTTPS để sử dụng Microphone.';
            }

            showError(msg);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleToggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const handleListen = () => {
        if (!targetSentence) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(targetSentence);
        utterance.lang = 'en-US';
        utterance.rate = speechRate;
        const voice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    };

    const handleAnalysis = async (target, audioBase64) => {
        setLoading(true);
        try {
            const response = await pronunciationAPI.analyze({ targetSentence: target, audioData: audioBase64 });
            const data = response.data;
            if (data.success) {
                setAnalysis(data);
            } else {
                setError(data.message || 'Phân tích thất bại.');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi kết nối máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    const generateNewSentence = async () => {
        setGenerating(true);
        setError('');
        setAnalysis(null);
        try {
            const response = await pronunciationAPI.generate(level);
            const data = response.data;
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
            <HangingSign className="pron-header">
                <h1 style={{ margin: '8px', fontSize: '1.5rem' }}>Luyện Phát Âm</h1>
            </HangingSign>

            <div className={`pron-container ${analysis ? 'has-feedback' : ''}`}>
                <div className="pron-top-row">
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
                                    <div className="pron-speed-selector">
                                        <span className="pron-speed-label">Tốc độ:</span>
                                        {[0.5, 0.75, 1, 1.25].map(rate => (
                                            <button
                                                key={rate}
                                                className={`pron-speed-btn ${speechRate === rate ? 'active' : ''}`}
                                                onClick={() => setSpeechRate(rate)}
                                            >
                                                {rate}x
                                            </button>
                                        ))}
                                    </div>
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

                            {/* Loading / Thinking */}
                            {loading && (
                                <div className="pron-loading">
                                    <div className="pron-loading-icon">
                                        <span className="pron-thinking-dot"></span>
                                        <span className="pron-thinking-dot"></span>
                                        <span className="pron-thinking-dot"></span>
                                    </div>
                                    <div className="pron-loading-text">
                                        <h4> AI đang phân tích phát âm...</h4>
                                        <p>Đang so sánh giọng đọc với câu mẫu, vui lòng đợi vài giây.</p>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && <div className="pron-error">{error}</div>}

                        </>
                    )}
                </div>
            </div>

            {/* ====== Feedback Bottom Row ====== */}
            {analysis && (
                <div className="feedback-bottom-row bounce-in">
                    <div className="feedback-left-col">
                        <div className={`pron-score-container ${getScoreClass(analysis.score)}`}>
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
                        
                        {analysis.overview && (
                            <div className="pron-feedback-block" style={{marginTop: '16px'}}>
                                <h4>📋 Tổng quan</h4>
                                <p>{analysis.overview}</p>
                            </div>
                        )}
                        
                        <div className="feedback-actions" style={{marginTop: 'auto', paddingTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.1)'}}>
                            <button className="try-again-btn" onClick={handleToggleRecording}>
                                🔁 Thử lại
                            </button>
                            <button className="next-sentence-btn" onClick={generateNewSentence}>
                                ➡️ Câu tiếp
                            </button>
                        </div>
                    </div>

                    <div className="feedback-right-col feedback-details">
                        <div className="pron-feedback-section">
                            {analysis.mistakes && (
                                <div className="pron-feedback-block pron-mistakes-block">
                                    <h4>⚠️ Các lỗi phát âm quan trọng</h4>
                                    <p>{analysis.mistakes}</p>
                                </div>
                            )}

                            {analysis.practice && (
                                <div className="pron-feedback-block pron-practice-block">
                                    <h4>🎯 Từ/cụm nên luyện thêm</h4>
                                    <p>{analysis.practice}</p>
                                </div>
                            )}

                            {analysis.homework && (
                                <div className="pron-feedback-block pron-homework-block">
                                    <h4>📝 Bài tập gợi ý</h4>
                                    <p>{analysis.homework}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
