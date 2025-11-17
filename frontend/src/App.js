import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FileManager from './components/FileManager';
import StatsPanel from './components/StatsPanel';
import { getHealth } from './services/api';

function App() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [filesCount, setFilesCount] = useState(0);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'files', 'stats'

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await getHealth();
      setIsHealthy(data.api_configured);
      setFilesCount(data.uploaded_files_count);
    } catch (error) {
      console.error('健康檢查失敗:', error);
      setIsHealthy(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 Gemini RAG Chat</h1>
        <div className="header-info">
          <span className={`status ${isHealthy ? 'online' : 'offline'}`}>
            {isHealthy ? '● 在線' : '● 離線'}
          </span>
          <span className="files-count">📁 {filesCount} 個檔案</span>
          <div className="nav-buttons">
            <button 
              className={`nav-btn ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => setCurrentView('chat')}
            >
              💬 聊天
            </button>
            <button 
              className={`nav-btn ${currentView === 'files' ? 'active' : ''}`}
              onClick={() => setCurrentView('files')}
            >
              📁 檔案
            </button>
            <button 
              className={`nav-btn ${currentView === 'stats' ? 'active' : ''}`}
              onClick={() => setCurrentView('stats')}
            >
              📊 統計
            </button>
          </div>
        </div>
      </header>

      <main className="App-main">
        {currentView === 'chat' && <ChatInterface />}
        {currentView === 'files' && <FileManager onFilesChange={checkHealth} />}
        {currentView === 'stats' && <StatsPanel />}
      </main>

      <footer className="App-footer">
        <p>Powered by Google Gemini with Vector Search & Multi-Model Support</p>
      </footer>
    </div>
  );
}

export default App;
