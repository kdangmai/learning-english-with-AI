import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';
import ConfirmModal from '../components/common/ConfirmModal';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { chatbotAPI } from '../services/api';

export function Chatbot() {
  // --- History Feature State ---
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false); // Mobile toggle

  // --- Chat State ---
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI tutor. I can help you with grammar, vocabulary, or answer any English questions. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // sessionId
  const messagesEndRef = useRef(null);

  // Use custom speech hook
  const handleTranscript = useCallback((text) => {
    setInput(prev => (prev ? prev + ' ' : '') + text);
  }, []);

  const { isListening, toggleListening: handleMicClick } = useSpeechRecognition(handleTranscript);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Exclude roleplay sessions from general chatbot history
      const response = await chatbotAPI.getHistory({ limit: 20, excludeTopic: 'roleplay' });
      const data = response.data;
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      setLoading(true);
      const response = await chatbotAPI.getSessionHistory(sessionId);
      const data = response.data;
      if (data.success && data.session) {
        setMessages(data.messages || []);
        setCurrentSessionId(sessionId);
        setShowHistory(false); // Close sidebar on mobile
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I am your AI tutor. I can help you with grammar, vocabulary, or answer any English questions. How can I help you today?'
    }]);
    setCurrentSessionId(null);
    setShowHistory(false);
  };

  // Override handleSendMessage to include sessionId if exists, or create new one implicitly?
  // backend currently looks for sessionId in body.
  // If no sessionId, it creates a new one. use that response to set sessionId.

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;
    const userMessage = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatbotAPI.sendMessage({
        message: currentInput,
        sessionId: currentSessionId
      });

      const data = response.data;

      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId);
        fetchHistory();
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update session list if needed (optional optimization)
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ... (keep existing helper functions like translate, keypress) ...
  // Re-insert handleTranslate and handleKeyPress here if needed or just replace the component layout

  const handleTranslate = async (index, text) => {
    if (messages[index].translation) return;
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
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    setConfirmDelete(sessionId);
  };

  const executeDeleteSession = async () => {
    const sessionId = confirmDelete;
    setConfirmDelete(null);
    try {
      await chatbotAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };


  return (
    <>
      <div className="chatbot-page">
        {/* Sidebar Overlay for Mobile */}
        {showHistory && (
          <div className="sidebar-overlay" onClick={() => setShowHistory(false)}></div>
        )}

        {/* History Sidebar */}
        <div className={`history-sidebar ${showHistory ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Lịch sử Chat</h3>
            <button className="new-chat-btn" onClick={handleNewChat} title="Cuộc trò chuyện mới">
              +
            </button>
          </div>
          <div className="session-list">
            {sessions.map(session => (
              <div
                key={session._id}
                className={`session-item ${currentSessionId === session._id ? 'active' : ''}`}
                onClick={() => loadSession(session._id)}
              >
                <div className="session-info">
                  <div className="session-topic">
                    {session.messages?.[0]?.content?.substring(0, 30) || 'Cuộc trò chuyện mới'}...
                  </div>
                  <div className="session-date">
                    {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="delete-session-btn"
                  onClick={(e) => handleDeleteSession(e, session._id)}
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
            ))}
            {sessions.length === 0 && <div className="empty-history">Chưa có lịch sử</div>}
          </div>
        </div>

        <div className="chatbot-container">
          <div className="chatbot-header-bar">
            <button className="menu-btn" onClick={() => setShowHistory(!showHistory)}>
              ☰
            </button>
            <div className="avatar-header">🤖</div>
            <div className="header-info">
              <h2>AI Tutor</h2>
              <span className="status-dot">Online</span>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role}`}>
                {msg.role === 'assistant' && <div className="avatar">🤖</div>}
                <div className="message-group">
                  <div className={`message-bubble ${msg.role}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.translation && (
                      <div className="translation-bubble">
                        <small>🇻🇳 {msg.translation}</small>
                      </div>
                    )}
                  </div>
                  {msg.role === 'assistant' && !msg.translation && (
                    <div className="message-actions">
                      <button className="action-btn" onClick={() => handleTranslate(idx, msg.content)} title="Dịch sang tiếng Việt">
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
                  <div className="typing-indicator"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
              <button
                type="button"
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={handleMicClick}
                disabled={loading}
                title={isListening ? "Stop Listening" : "Speak to Type"}
                style={{ marginRight: '5px' }}
              >
                {isListening ? '🟥' : '🎤'}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={isListening ? "Listening..." : "Nhập tin nhắn..."}
                disabled={loading}
                style={{ paddingLeft: '10px' }}
              />
              <button type="submit" disabled={loading || !input.trim()} className="send-btn">
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDeleteSession}
        title="Xóa cuộc trò chuyện"
        message="Bạn có chắc muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </>
  );
}

export default Chatbot;
