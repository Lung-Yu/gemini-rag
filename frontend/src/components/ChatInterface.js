import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';
import { sendMessage, getAvailableModels, searchDocuments, listFiles } from '../services/api';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('preferredModel') || 'gemini-1.5-flash'
  );
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState(null);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadModels();
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModels = async () => {
    setModelsLoading(true);
    setModelsError(null);
    
    try {
      const data = await getAvailableModels();
      const models = data.models || [];
      
      if (models.length === 0) {
        throw new Error('無法獲取可用模型列表');
      }
      
      setAvailableModels(models);
      
      // 檢查目前選擇的模型是否還存在
      const currentModelExists = models.some(m => m.model_id === selectedModel);
      if (!currentModelExists && models.length > 0) {
        const newModel = models[0].model_id;
        setSelectedModel(newModel);
        localStorage.setItem('preferredModel', newModel);
        console.log(`模型 ${selectedModel} 不可用，已切換到 ${newModel}`);
      }
      
    } catch (error) {
      console.error('載入模型列表失敗:', error);
      setModelsError(error.message || '載入模型失敗');
      
      // 回退到默認模型
      const fallbackModels = [{
        model_id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (備用)',
        description: '備用模型'
      }];
      setAvailableModels(fallbackModels);
    } finally {
      setModelsLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const data = await listFiles();
      setAvailableFiles(data.files || []);
    } catch (error) {
      console.error('載入檔案列表失敗:', error);
    }
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    localStorage.setItem('preferredModel', model);
  };

  const handleSearchFiles = async () => {
    if (!inputValue.trim()) return;
    
    setIsSearching(true);
    try {
      const data = await searchDocuments(inputValue, 5, 0.7);
      setSearchResults(data.results || []);
      setShowFileSelector(true);
      
      // Auto-select top results
      const topFileNames = data.results.map(r => r.gemini_file_name);
      setSelectedFiles(topFileNames);
    } catch (error) {
      console.error('搜尋檔案失敗:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFileSelection = (fileName) => {
    setSelectedFiles(prev => 
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      model: selectedModel,
      selectedFilesCount: selectedFiles.length,
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = inputValue;
    setInputValue('');
    setIsLoading(true);
    setShowFileSelector(false);

    try {
      const response = await sendMessage(
        queryText,
        selectedModel,
        selectedFiles.length > 0 ? selectedFiles : null
      );
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.response || response.message,
        sender: 'bot',
        timestamp: new Date(),
        success: response.success,
        filesUsed: response.files_used,
        modelUsed: response.model_used,
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Clear file selection after query
      setSelectedFiles([]);
      setSearchResults([]);
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
      {/* Model Selector */}
      <div className="model-selector-bar">
        <div className="model-selector">
          <label>🤖 模型：</label>
          {modelsLoading ? (
            <span className="loading-text">載入中...</span>
          ) : modelsError ? (
            <span className="error-text" title={modelsError}>
              ⚠️ 載入失敗
            </span>
          ) : (
            <select value={selectedModel} onChange={handleModelChange}>
              {availableModels.map(model => (
                <option key={model.model_id} value={model.model_id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedFiles.length > 0 && (
          <div className="selected-files-indicator">
            📁 已選 {selectedFiles.length} 個檔案
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>👋 歡迎使用 Gemini RAG Chat</h2>
            <p>選擇 AI 模型，搜尋相關文件，開始智慧問答。</p>
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
              <div className="message-meta">
                {message.filesUsed && (
                  <span>📁 {message.filesUsed} 個檔案</span>
                )}
                {message.modelUsed && (
                  <span>🤖 {message.modelUsed}</span>
                )}
                {message.selectedFilesCount > 0 && (
                  <span>🎯 選定 {message.selectedFilesCount} 個</span>
                )}
              </div>
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

      {/* File Selector Panel */}
      {showFileSelector && (
        <div className="file-selector-panel">
          <div className="file-selector-header">
            <h3>🔍 相關文件 ({searchResults.length})</h3>
            <button onClick={() => setShowFileSelector(false)} className="close-btn">✕</button>
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
            <button onClick={() => setSelectedFiles([])}>清除選擇</button>
            <button onClick={() => {
              const allFiles = searchResults.map(r => r.gemini_file_name);
              setSelectedFiles(allFiles);
            }}>全選</button>
          </div>
        </div>
      )}

      <div className="input-container">
        <button
          onClick={handleSearchFiles}
          disabled={!inputValue.trim() || isSearching}
          className="search-button"
          title="搜尋相關文件"
        >
          {isSearching ? '⏳' : '🔍'}
        </button>
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
