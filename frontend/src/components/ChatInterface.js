import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';
import { sendMessage } from '../services/api';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessage(inputValue);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.response || response.message,
        sender: 'bot',
        timestamp: new Date(),
        success: response.success,
        filesUsed: response.files_used,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: error.response?.data?.detail || error.message || '發生錯誤，請稍後再試',
        sender: 'bot',
        timestamp: new Date(),
        success: false,
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>👋 歡迎使用 Gemini RAG Chat</h2>
            <p>請輸入您的問題，我會根據上傳的檔案內容為您解答。</p>
            <div className="example-questions">
              <p>範例問題：</p>
              <ul>
                <li>誰有 CISSP 證照？</li>
                <li>列出所有人的年齡</li>
                <li>總共有多少人？</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {message.sender === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              {message.filesUsed && (
                <div className="message-meta">
                  📁 使用了 {message.filesUsed} 個檔案
                </div>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message bot loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
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

      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入您的問題..."
          rows="1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
