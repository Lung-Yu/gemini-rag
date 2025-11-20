// Enhanced Chat Interface Component with TypeScript and Hooks

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FiSettings, FiX, FiSave, FiAlertTriangle, FiTrash2, 
  FiLoader, FiFolder, FiSmile, FiUser, FiTarget, FiClipboard, 
  FiSearch, FiSend, FiCheckCircle, FiAlertCircle, FiZap
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

import { useChat } from '../hooks/useChat';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button, Card, LoadingSpinner, EmptyState } from './common';
import { EXAMPLE_QUESTIONS, DEFAULT_SYSTEM_PROMPT_ZH, DEFAULT_SYSTEM_PROMPT_EN } from '../constants';
import { DateFormatter } from '../utils/formatters';
import type { ChatMessage } from '../types';

import './ChatInterface.css';

export function ChatInterface() {
  // Hooks
  const {
    selectedModel,
    setSelectedModel,
    availableModels,
    modelsLoading,
    modelsError,
    systemPrompt,
    setSystemPrompt,
    topK,
    setTopK,
    similarityThreshold,
    setSimilarityThreshold,
    selectedFiles,
    setSelectedFiles,
    searchResults,
    handleSearchFiles,
    isSearching,
    handleSendMessage,
  } = useChat();

  const { messages, isLoading, wsConnected, wsConnecting, clearMessages } = useWebSocket();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [tempTopK, setTempTopK] = useState(topK);
  const [tempSimilarityThreshold, setTempSimilarityThreshold] = useState(similarityThreshold);
  const [showFilesForMessage, setShowFilesForMessage] = useState<number | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Update temp system prompt when systemPrompt changes
  useEffect(() => {
    setTempSystemPrompt(systemPrompt);
  }, [systemPrompt]);

  // Update temp topK when topK changes
  useEffect(() => {
    setTempTopK(topK);
  }, [topK]);

  // Update temp similarityThreshold when similarityThreshold changes
  useEffect(() => {
    setTempSimilarityThreshold(similarityThreshold);
  }, [similarityThreshold]);

  // Handle model change
  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  }, [setSelectedModel]);

  // Save system prompt
  const handleSaveSystemPrompt = useCallback(() => {
    setSystemPrompt(tempSystemPrompt);
    setTopK(tempTopK);
    setSimilarityThreshold(tempSimilarityThreshold);
    setShowSettings(false);
  }, [tempSystemPrompt, tempTopK, tempSimilarityThreshold, setSystemPrompt, setTopK, setSimilarityThreshold]);

  // Reset to default system prompt
  const handleResetSystemPrompt = useCallback(() => {
    setTempSystemPrompt(DEFAULT_SYSTEM_PROMPT_ZH);
  }, []);

  // Use English template
  const handleUseEnglishTemplate = useCallback(() => {
    setTempSystemPrompt(DEFAULT_SYSTEM_PROMPT_EN);
  }, []);

  // Search files
  const handleSearch = useCallback(async () => {
    if (!inputValue.trim() || isSearching) return;
    
    await handleSearchFiles(inputValue.trim());
    setShowFileSelector(true);
  }, [inputValue, isSearching, handleSearchFiles]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  }, [setSelectedFiles]);

  // Clear chat
  const handleClearChat = useCallback(() => {
    if (window.confirm('確定要清空所有對話嗎？')) {
      clearMessages();
      setInputValue('');
      setSelectedFiles([]);
      setShowFileSelector(false);
    }
  }, [clearMessages, setSelectedFiles]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setShowFileSelector(false);

    try {
      await handleSendMessage(messageText);
      // handleSendMessage 會自動清空 selectedFiles
    } catch (error) {
      console.error('Failed to send message:', error);
      // Error is handled in the hook and context
    }
  }, [inputValue, isLoading, handleSendMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle example question click
  const handleExampleClick = useCallback((question: string) => {
    setInputValue(question);
    textareaRef.current?.focus();
  }, []);

  // Memoized connection status
  const connectionStatus = useMemo(() => {
    if (wsConnecting) return { text: '連接中...', color: 'warning', icon: FiLoader };
    if (wsConnected) return { text: '即時連接', color: 'success', icon: FiCheckCircle };
    return { text: '標準模式', color: 'info', icon: FiAlertCircle };
  }, [wsConnected, wsConnecting]);

  // Memoized message list
  const messageList = useMemo(() => (
    messages.map((message: ChatMessage) => (
      <div
        key={message.id}
        className={`message ${message.sender} ${message.isError ? 'error' : ''} ${message.isStreaming ? 'streaming' : ''}`}
      >
        <div className="message-avatar">
          {message.sender === 'user' ? <FiUser /> : <FaRobot />}
        </div>
        <div className="message-content">
          <div className="message-text">
            {message.text}
            {message.isStreaming && <span className="streaming-cursor">▋</span>}
          </div>
          <div className="message-meta">
            {message.filesUsed && message.filesUsed > 0 && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <span 
                  className={`files-indicator ${message.retrievedFiles && message.retrievedFiles.length > 0 ? 'clickable' : ''}`}
                  onClick={() => {
                    if (message.retrievedFiles && message.retrievedFiles.length > 0) {
                      setShowFilesForMessage(showFilesForMessage === message.id ? null : message.id);
                    }
                  }}
                  title={message.retrievedFiles && message.retrievedFiles.length > 0 ? '點擊查看使用的文件' : ''}
                >
                  <FiFolder /> {message.filesUsed} 個檔案
                </span>
                {/* Retrieved Files Popup */}
                {showFilesForMessage === message.id && message.retrievedFiles && message.retrievedFiles.length > 0 && (
                  <div className="retrieved-files-popup">
                    <div className="retrieved-files-header">
                      <span>使用的文件 ({message.retrievedFiles.length})</span>
                      <button onClick={() => setShowFilesForMessage(null)} className="close-popup-btn">
                        <FiX />
                      </button>
                    </div>
                    <div className="retrieved-files-list">
                      {message.retrievedFiles.map((file, index) => (
                        <div key={index} className="retrieved-file-item">
                          <div className="file-name">
                            <FiFolder /> {file.display_name}
                          </div>
                          <div className="file-score">
                            相似度: {(file.similarity_score * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {message.modelUsed && (
              <span><FaRobot /> {message.modelUsed}</span>
            )}
            {message.selectedFilesCount && message.selectedFilesCount > 0 && (
              <span><FiTarget /> 選定 {message.selectedFilesCount} 個</span>
            )}
            {message.promptTokens !== undefined && message.completionTokens !== undefined && (
              <span>
                <FiClipboard /> 輸入: {message.promptTokens} | 輸出: {message.completionTokens} tokens
              </span>
            )}
            {message.isStreaming && (
              <span className="streaming-indicator">
                <FiLoader className="spinner" /> 生成中...
              </span>
            )}
          </div>
          <div className="message-time">
            {DateFormatter.toTimeString(message.timestamp)}
          </div>
        </div>
      </div>
    ))
  ), [messages, showFilesForMessage]);

  return (
    <div className="chat-interface">
      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay">
          <Card className="settings-panel">
            <div className="settings-header">
              <h3><FiSettings /> 系統提示詞設定</h3>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowSettings(false)}
                aria-label="關閉設定"
              >
                <FiX />
              </Button>
            </div>
            <div className="settings-content">
              <div className="form-group">
                <label className="form-label">系統提示詞：</label>
                <p className="setting-description">
                  自訂 AI 的行為模式。使用 <code>{'{query}'}</code> 作為問題佔位符。
                </p>
                <textarea
                  value={tempSystemPrompt}
                  onChange={(e) => setTempSystemPrompt(e.target.value)}
                  rows={8}
                  className="form-textarea"
                  placeholder="輸入系統提示詞..."
                />
                <div className="char-counter">
                  {tempSystemPrompt.length} 字元
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">自動檢索設定：</label>
                <p className="setting-description">
                  調整 AI 自動檢索相關文件的參數。降低相似度閾值可以檢索更多文件。
                </p>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label className="setting-label">
                      檢索文件數量 (Top K)：
                      <span className="setting-value">{tempTopK === 21 ? '無上限' : tempTopK}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="21"
                      step="1"
                      value={tempTopK}
                      onChange={(e) => setTempTopK(Number(e.target.value))}
                      className="range-slider"
                    />
                    <div className="range-labels">
                      <span>1</span>
                      <span>無上限</span>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">
                      相似度閾值：
                      <span className="setting-value">{Math.round(tempSimilarityThreshold * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(tempSimilarityThreshold * 100)}
                      onChange={(e) => setTempSimilarityThreshold(Number(e.target.value) / 100)}
                      className="range-slider"
                    />
                    <div className="range-labels">
                      <span>0% (寬鬆)</span>
                      <span>100% (嚴格)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="settings-actions">
                <Button variant="secondary" onClick={handleResetSystemPrompt}>
                  重置為預設（中文）
                </Button>
                <Button variant="secondary" onClick={handleUseEnglishTemplate}>
                  使用英文範本
                </Button>
                <Button variant="primary" onClick={handleSaveSystemPrompt}>
                  <FiSave /> 儲存設定
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Model Selector Bar */}
      <div className="model-selector-bar">
        <div className="model-selector">
          <label><FaRobot /> 模型：</label>
          {modelsLoading ? (
            <LoadingSpinner size="small" />
          ) : modelsError ? (
            <span className="error-text" title={modelsError}>
              <FiAlertTriangle /> 載入失敗
            </span>
          ) : (
            <select 
              value={selectedModel} 
              onChange={handleModelChange}
              className="form-select"
            >
              {availableModels.map(model => (
                <option key={model.model_id} value={model.model_id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            setTempSystemPrompt(systemPrompt);
            setTempTopK(topK);
            setTempSimilarityThreshold(similarityThreshold);
            setShowSettings(true);
          }}
          title="系統提示詞設定"
        >
          <FiSettings />
        </Button>
        
        <Button
          variant="danger"
          size="small"
          onClick={handleClearChat}
          disabled={messages.length === 0}
          title="清空對話"
        >
          <FiTrash2 /> 清空
        </Button>
        
        <div className="ws-status">
          <connectionStatus.icon className={connectionStatus.icon === FiLoader ? 'spinner' : ''} />
          <span className={connectionStatus.color}>{connectionStatus.text}</span>
        </div>

        {selectedFiles.length > 0 && (
          <div className="selected-files-indicator">
            <FiFolder /> 已選 {selectedFiles.length} 個檔案
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="messages-container custom-scrollbar">
        {messages.length === 0 ? (
          <EmptyState
            icon={<FiSmile />}
            title="歡迎使用 Gemini RAG Chat"
            description="選擇 AI 模型，搜尋相關文件，開始智慧問答。"
            action={
              <div className="example-questions">
                <p>範例問題：</p>
                <ul>
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <li 
                      key={question} 
                      className="example-question"
                      onClick={() => handleExampleClick(question)}
                    >
                      <FiZap className="example-icon" />
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />
        ) : (
          messageList
        )}

        {isLoading && (
          <div className="message bot loading">
            <div className="message-avatar">
              <FaRobot />
            </div>
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

      {/* File Selector Panel */}
      {showFileSelector && (
        <div className="file-selector-panel">
          <Card>
            <div className="file-selector-header">
              <h3><FiSearch /> 相關文件 ({searchResults.length})</h3>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowFileSelector(false)}
                aria-label="關閉檔案列表"
              >
                <FiX />
              </Button>
            </div>
            <div className="file-selector-list">
              {searchResults.map(result => (
                <div key={result.document_id} className="file-selector-item">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(result.gemini_file_name)}
                    onChange={() => toggleFileSelection(result.gemini_file_name)}
                  />
                  <div className="file-info">
                    <div className="file-name">{result.display_name}</div>
                    <div className="file-preview">{result.content_preview}</div>
                    <div className="similarity-score">
                      相似度: {(result.similarity_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="file-selector-actions">
              <Button variant="secondary" onClick={() => setSelectedFiles([])}>
                清除選擇
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  const allFiles = searchResults.map(r => r.gemini_file_name);
                  setSelectedFiles(allFiles);
                }}
              >
                全選
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Files Indicator */}
      {selectedFiles.length > 0 && (
        <div className="selected-files-indicator">
          <div className="selected-files-badge">
            <FiFolder />
            <span>已選擇 {selectedFiles.length} 個文件</span>
            <button
              className="clear-selection-btn"
              onClick={() => setSelectedFiles([])}
              title="清除選擇"
            >
              <FiX />
            </button>
          </div>
          <div className="selected-files-list">
            {searchResults
              .filter(r => selectedFiles.includes(r.gemini_file_name))
              .map(r => (
                <span key={r.gemini_file_name} className="selected-file-tag">
                  {r.display_name}
                  <button
                    onClick={() => toggleFileSelection(r.gemini_file_name)}
                    className="remove-file-btn"
                  >
                    <FiX />
                  </button>
                </span>
              ))
            }
          </div>
        </div>
      )}

      {selectedFiles.length === 0 && (
        <div className="auto-retrieval-hint">
          <FiZap />
          <span>AI 檢索模式：系統將自動檢索相關文件</span>
        </div>
      )}

      {/* Input Container */}
      <div className="input-container">
        <Button
          variant="secondary"
          onClick={handleSearch}
          disabled={!inputValue.trim() || isSearching}
          title="搜尋相關文件"
          aria-label="搜尋相關文件"
        >
          {isSearching ? <FiLoader className="spinner" /> : <FiSearch />}
        </Button>
        
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入您的問題..."
          rows={1}
          disabled={isLoading}
          className="form-textarea"
        />
        
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          loading={isLoading}
          aria-label="送出訊息"
        >
          {!isLoading && <FiSend />}
        </Button>
      </div>
    </div>
  );
}