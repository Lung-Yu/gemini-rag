import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FileManager from './components/FileManager';
import { getHealth } from './services/api';

function App() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [filesCount, setFilesCount] = useState(0);
  const [showFiles, setShowFiles] = useState(false);

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
          <button 
            className="toggle-files-btn"
            onClick={() => setShowFiles(!showFiles)}
          >
            {showFiles ? '隱藏檔案' : '管理檔案'}
          </button>
        </div>
      </header>

      <main className="App-main">
        {showFiles ? (
          <FileManager onFilesChange={checkHealth} />
        ) : (
          <ChatInterface />
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by Google Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
}

export default App;
