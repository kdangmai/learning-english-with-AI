import React, { useState, useRef, useEffect } from 'react';
import './Pronunciation.css';

export default function Pronunciation() {
    const [targetSentence, setTargetSentence] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [spokenText, setSpokenText] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [voices, setVoices] = useState([]);
    const [level, setLevel] = useState('A1');
    const [generating, setGenerating] = useState(false);

    const recognitionRef = useRef(null);
    const transcriptRef = useRef("");

    useEffect(() => {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;

            recognitionRef.current = new SpeechRecognition();
            // Continuous mode to prevent cutting off
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            // Improve accuracy by providing the target sentence as a "hint" (Grammar)
            if (SpeechGrammarList && targetSentence) {
                const grammar = `#JSGF V1.0; grammar phrase; public <phrase> = ${targetSentence.replace(/[^\w\s]/gi, '')} ;`;
                const speechRecognitionList = new SpeechGrammarList();
                speechRecognitionList.addFromString(grammar, 1);
                recognitionRef.current.grammars = speechRecognitionList;
            }

            recognitionRef.current.onstart = () => {
                setIsRecording(true);
                setError("");
                setAnalysis(null);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                // Only analyze if there is text
                if (transcriptRef.current && transcriptRef.current.trim().length > 0) {
                    handleAnalysis(targetSentence, transcriptRef.current);
                }
            };

            recognitionRef.current.onresult = (event) => {
                // Combine all final results and current interim
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                transcriptRef.current = transcript;
                setSpokenText(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                if (event.error !== 'no-speech') {
                    // Ignore no-speech errors which happen if user pauses too long
                    setError("Lỗi nhận diện giọng nói: " + event.error);
                }
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setIsRecording(false);
                }
            };
        } else {
            setError("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
        }

        // Load voices
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, [targetSentence]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const constraints = {
                audio: {
                    sampleRate: 16000, // Gemini prefers 16kHz or 24kHz
                    channelCount: 1,   // Mono
                    manual: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 }); // Increase/Set bitrate
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome/Firefox default
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
                    handleAnalysis(targetSentence, base64Audio);
                };

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setError("");
            setAnalysis(null);
            setSpokenText("(Đang gửi âm thanh để phân tích...)");
        } catch (err) {
            console.error("Microphone access error:", err);
            setError("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleListen = () => {
        if (!targetSentence) return;
        const utterance = new SpeechSynthesisUtterance(targetSentence);
        utterance.lang = 'en-US';
        // Prefer Google US English if available
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
                if (data.transcript) {
                    setSpokenText(data.transcript);
                }
            } else {
                setError(data.message || "Phân tích thất bại.");
                setSpokenText("");
            }
        } catch (err) {
            console.error(err);
            setError("Lỗi kết nối máy chủ.");
            setSpokenText("");
        } finally {
            setLoading(false);
        }
    };

    const generateNewSentence = async () => {
        setGenerating(true);
        setError("");

        try {
            const response = await fetch(`/api/pronunciation/generate?level=${level}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setTargetSentence(data.sentence);
                setSpokenText("");
                setAnalysis(null);
            } else {
                setError("Không thể tạo câu mới.");
            }
        } catch (e) {
            console.error(e);
            setError("Lỗi kết nối khi tạo câu.");
        } finally {
            setGenerating(false);
        }
    };

    // Removed useEffect for auto-generation on load

    return (
        <div className="pronunciation-page">
            <div className="pronunciation-card">
                <h2>🗣️ Luyện Phát Âm AI</h2>
                <p className="subtitle">Lắng nghe, nhắc lại và để AI sửa lỗi cho bạn.</p>

                <div className="controls-row">
                    <label>Trình độ:</label>
                    <select value={level} onChange={(e) => setLevel(e.target.value)} disabled={generating}>
                        <option value="A1">A1 (Cơ bản)</option>
                        <option value="A2">A2 (Sơ cấp)</option>
                        <option value="B1">B1 (Trung cấp)</option>
                        <option value="B2">B2 (Cao trung cấp)</option>
                        <option value="C1">C1 (Cao cấp)</option>
                        <option value="C2">C2 (Thành thạo)</option>
                    </select>
                </div>

                {!targetSentence ? (
                    <div className="start-section" style={{ textAlign: 'center', margin: '40px 0' }}>
                        <button
                            className="start-btn"
                            onClick={generateNewSentence}
                            disabled={generating}
                            style={{
                                padding: '15px 30px',
                                fontSize: '1.1rem',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            {generating ? 'Dang tạo...' : '✨ Tạo câu luyện tập'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="target-section">
                            <h3 className="target-text">"{targetSentence}"</h3>
                            <button className="icon-btn" onClick={handleListen} title="Nghe mẫu">
                                🔊
                            </button>
                            <button className="icon-btn refresh" onClick={generateNewSentence} title="Đổi câu khác" disabled={generating}>
                                {generating ? '⏳' : '🔄'}
                            </button>
                        </div>

                        <div className="action-section">
                            <button
                                className={`record-btn ${isRecording ? 'recording' : ''}`}
                                onClick={handleToggleRecording}
                                disabled={loading}
                            >
                                {isRecording ? '⏹️ Dừng & Chấm điểm' : '🎤 Nhấn để nói'}
                            </button>
                        </div>
                    </>
                )}

                {spokenText && (
                    <div className="result-section">
                        <h4>Bạn đã nói:</h4>
                        <p className="spoken-text">"{spokenText}"</p>
                    </div>
                )}

                {loading && <div className="loader-mini">AI đang phân tích...</div>}
                {error && <div className="error-msg">{error}</div>}

                {analysis && (
                    <div className={`analysis-result ${analysis.score >= 80 ? 'good' : 'bad'}`}>
                        <div className="score-circle">
                            <span className="score-val">{analysis.score}</span>
                            <span className="score-label">Điểm</span>
                        </div>

                        <div className="feedback-content">
                            <h4>Nhận xét của AI:</h4>
                            <p>{analysis.feedback}</p>

                            {analysis.mistakes && analysis.mistakes.length > 0 && (
                                <div className="mistakes-list">
                                    <h5>⚠️ Cần cải thiện:</h5>
                                    <ul>
                                        {analysis.mistakes.map((m, idx) => (
                                            <li key={idx}>
                                                <strong>{m.word}</strong> nghe giống <em>"{m.soundedLike}"</em>
                                                <br />
                                                <span className="advice">💡 {m.advice}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
