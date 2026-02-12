import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './Roleplay.css';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/common/ConfirmModal';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { chatbotAPI } from '../services/api';

export default function Roleplay() {
    const [step, setStep] = useState('selection'); // selection, chat, report
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [customInput, setCustomInput] = useState({ title: '', role: '', desc: '' });
    const messagesEndRef = useRef(null);
    // Removed recognitionRef as it's handled in hook
    const { error: showError, warning: showWarning } = useToast();
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    // Use custom speech hook
    const handleTranscript = useCallback((text) => {
        setInput(prev => (prev ? prev + ' ' : '') + text);
    }, []);

    const { isListening, toggleListening: handleMicClick } = useSpeechRecognition(handleTranscript);


    const scenarios = [
        { title: "Job Interview", role: "Interviewer", icon: "👔", desc: "Practice answering common interview questions for a software engineer position." },
        { title: "Ordering Food", role: "Waiter", icon: "🍽️", desc: "Order a meal at a fancy restaurant. Ask about the menu and specials." },
        { title: "Train Ticket", role: "Ticket Officer", icon: "🚆", desc: "Buy a ticket for your travel. Ask about schedules and prices." },
        { title: "Doctor Visit", role: "Doctor", icon: "🩺", desc: "Describe your symptoms and get medical advice." },
        { title: "Hotel Check-in", role: "Receptionist", icon: "🏨", desc: "Check into your hotel, ask about amenities and breakfast." },
        { title: "Directions", role: "Local Stranger", icon: "🗺️", desc: "Ask for directions to the nearest subway station." },
        { title: "Tech Support", role: "Support Agent", icon: "💻", desc: "Troubleshoot a technical issue with your computer or internet." },
        { title: "Coffee Shop", role: "Barista", icon: "☕", desc: "Order a specific coffee with customizations." },
        { title: "Gym Membership", role: "Receptionist", icon: "💪", desc: "Inquire about membership plans and gym facilities." },
        { title: "Hair Salon", role: "Stylist", icon: "💇", desc: "Book an appointment and describe the haircut you want." },
        { title: "New Neighbor", role: "Neighbor", icon: "👋", desc: "Introduce yourself to a new neighbor and make small talk." },
        { title: "Returning Item", role: "Store Clerk", icon: "🛍️", desc: "Return a defective item and ask for a refund." },
        { title: "Custom Scenario", role: "Custom", icon: "✨", desc: "Create your own unique roleplay scenario." },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSelectScenario = async (scenario) => {
        if (scenario.role === 'Custom') {
            setCustomInput({ title: '', role: '', desc: '' });
            setShowModal(true);
            return;
        }
        startScenario(scenario);
    };

    const handleEditScenario = (e, scenario) => {
        e.stopPropagation(); // Prevent card click
        setCustomInput({
            title: scenario.title,
            role: scenario.role,
            desc: scenario.desc
        });
        setShowModal(true);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customInput.title || !customInput.role || !customInput.desc) return;

        setShowModal(false);
        startScenario({
            title: customInput.title,
            role: customInput.role,
            desc: customInput.desc
        });
    };

    const startScenario = async (scenario) => {
        setLoading(true);
        setSelectedScenario(scenario);

        try {
            const response = await fetch('/api/roleplay/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    scenario: scenario.title,
                    role: scenario.role
                })
            });

            const data = await response.json();
            if (data.success) {
                setSessionId(data.sessionId);
                setMessages(data.messages); // Should contain the initial AI greeting
                setStep('chat');
            } else {
                showError("Không thể bắt đầu phiên: " + data.message);
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi khi bắt đầu phiên hời thoại");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const content = input;
        const userMessage = { role: 'user', content: content };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const body = {
                sessionId,
                message: content
            };

            const response = await fetch('/api/roleplay/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };



    const handleEndSession = () => {
        setShowEndConfirm(true);
    };

    const executeEndSession = async () => {
        setShowEndConfirm(false);

        setLoading(true);
        try {
            const response = await fetch('/api/roleplay/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ sessionId })
            });

            const data = await response.json();
            if (data.success) {
                setReport(data.report);
                setStep('report');
            }
        } catch (error) {
            console.error(error);
            showError("Không thể tạo báo cáo");
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async (index, text) => {
        // 1. Check if already translated
        if (messages[index].translation) return;

        // 2. Optimistic update or loading state could go here
        // For now, let's just fetch
        try {
            const response = await chatbotAPI.translate(text);
            const data = response.data;

            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[index] = { ...newMsgs[index], translation: data.response };
                return newMsgs;
            });

        } catch (error) {
            console.error("Translation failed", error);
            showError("Dịch thất bại");
        }
    };

    const handleReset = () => {
        setStep('selection');
        setSelectedScenario(null);
        setMessages([]);
        setReport(null);
        setSessionId(null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            <div className={`roleplay-page ${step === 'chat' ? 'chat-mode' : ''}`}>
                {step === 'selection' && (
                    <>
                        <h1>🎭 Roleplay Scenarios</h1>
                        <p className="subtitle">Select a scenario to practice real-life conversations</p>
                        <div className="scenarios-grid">
                            {scenarios.map((s, idx) => (
                                <div key={idx} className={`scenario-card ${s.role === 'Custom' ? 'custom-card' : ''}`} onClick={() => handleSelectScenario(s)}>
                                    {s.role !== 'Custom' && (
                                        <button
                                            className="edit-btn-card"
                                            title="Edit Scenario Prompt"
                                            onClick={(e) => handleEditScenario(e, s)}
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    <div className="scenario-icon">{s.icon}</div>
                                    <div className="scenario-title">{s.title}</div>
                                    <div className="scenario-desc">{s.desc}</div>
                                    <div className="scenario-badge">Role: {s.role}</div>
                                </div>
                            ))}
                        </div>
                        {loading && <div className="loader overlay">Starting...</div>}
                    </>
                )}

                {showModal && (
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="✨ Customize Scenario">
                        <form onSubmit={handleCustomSubmit}>
                            <div className="form-group">
                                <label>Scenario Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Salary Negotiation"
                                    value={customInput.title}
                                    onChange={(e) => setCustomInput({ ...customInput, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>AI Role</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Boss"
                                    value={customInput.role}
                                    onChange={(e) => setCustomInput({ ...customInput, role: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description / Context</label>
                                <textarea
                                    rows="3"
                                    placeholder="e.g. Try to negotiate a higher salary for your new job offer."
                                    value={customInput.desc}
                                    onChange={(e) => setCustomInput({ ...customInput, desc: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="start-btn">Start Roleplay</button>
                            </div>
                        </form>
                    </Modal>
                )}

                {step === 'chat' && (
                    <div className="roleplay-container">
                        <div className="chat-header">
                            <div className="chat-info">
                                <h3>{selectedScenario?.title}</h3>
                                <span>Talking to: {selectedScenario?.role}</span>
                            </div>
                            <button className="end-btn" onClick={handleEndSession} disabled={loading}>
                                🛑 End & Report
                            </button>
                        </div>

                        <div className="roleplay-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message-row ${msg.role}`}>
                                    {msg.role !== 'user' && <div className="avatar">🤖</div>}

                                    <div className="message-group">
                                        <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>

                                            {msg.translation && (
                                                <div className="translation-bubble">
                                                    <small>🇻🇳 {msg.translation}</small>
                                                </div>
                                            )}
                                        </div>

                                        {msg.role !== 'user' && !msg.translation && (
                                            <div className="message-actions">
                                                <button
                                                    className="action-btn"
                                                    onClick={() => handleTranslate(idx, msg.content)}
                                                    title="Translate to Vietnamese"
                                                >
                                                    🌐
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="message-row assistant">
                                    <div className="avatar">🤖</div>
                                    <div className="message-bubble assistant">
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-area">
                            <div className="input-tools">
                                <button className="tool-btn">📷</button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <button
                                    type="button"
                                    className={`tool-btn ${isListening ? 'recording' : ''}`}
                                    onClick={handleMicClick}
                                    title={isListening ? "Stop Listening" : "Speak to Type"}
                                    style={{ marginRight: '8px' }}
                                >
                                    {isListening ? '🟥' : '🎤'}
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={isListening ? "Listening..." : "Type your response..."}
                                    disabled={loading}
                                    style={{ paddingLeft: '10px' }}
                                />
                                <button type="submit" disabled={loading || !input.trim()} className="send-btn">
                                    ➤
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {step === 'report' && report && (
                    <div className="report-container">
                        <div className="report-header">
                            <div className="score-circle" style={{ '--score-percent': `${report.naturalness * 10}%` }}>
                                <div className="score-value">{report.naturalness}<span style={{ fontSize: '1.5rem' }}>/10</span></div>
                            </div>
                            <div className="score-label">Naturalness Score</div>

                            {report.overall_comment && (
                                <div className="comment-box">
                                    "{report.overall_comment}"
                                </div>
                            )}
                        </div>

                        <div className="report-grid">
                            <div className="report-card">
                                <h3>🚨 Grammar Corrections</h3>
                                {report.grammar_errors?.length > 0 ? (
                                    report.grammar_errors.map((item, idx) => (
                                        <div key={idx} className="mistake-item">
                                            <div>
                                                <span className="original-text">{item.original}</span>
                                                <span className="corrected-text">{item.correction}</span>
                                            </div>
                                            {item.explanation && <span className="explanation">{item.explanation}</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p>Great job! No major grammar errors detected.</p>
                                )}
                            </div>

                            <div className="report-card">
                                <h3>✨ Vocabulary Suggestions</h3>
                                {report.vocabulary_suggestions?.length > 0 ? (
                                    report.vocabulary_suggestions.map((item, idx) => (
                                        <div key={idx} className="suggestion-item">
                                            <span className="vocab-word">Original: {item.original}</span>
                                            <span className="vocab-better">Better: {item.better_word}</span>
                                            {item.context && <span className="explanation">Why: {item.context}</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p>Your vocabulary usage was appropriate.</p>
                                )}
                            </div>
                        </div>

                        <button className="back-btn" onClick={handleReset}>
                            Choose Another Scenario
                        </button>
                    </div>
                )}
            </div>
            <ConfirmModal
                isOpen={showEndConfirm}
                onClose={() => setShowEndConfirm(false)}
                onConfirm={executeEndSession}
                title="Kết thúc hội thoại"
                message="Bạn có chắc muốn kết thúc cuộc hội thoại và tạo báo cáo?"
                confirmText="Kết thúc"
                cancelText="Tiếp tục"
                variant="warning"
            />
        </>
    );
}
