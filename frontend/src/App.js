import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FileManager from './components/FileManager';
import StatsPanel from './components/StatsPanel';
import QueryHistory from './components/QueryHistory';
import { getHealth } from './services/api';
import chatWebSocket from './services/websocket';

// TabPanel component
function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ 
        height: '100%', 
        width: '100%',
        display: value === index ? 'flex' : 'none' 
      }}
    >
      {children}
    </div>
  );
}

function App() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [filesCount, setFilesCount] = useState(0);
  const [tabValue, setTabValue] = useState(0); // 0: chat, 1: files, 2: stats, 3: history
  
  // Chat state lifted to App level
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsConnecting, setWsConnecting] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  // Initialize WebSocket at App level
  useEffect(() => {
    const initWebSocket = async () => {
      setWsConnecting(true);
      try {
        await chatWebSocket.connect();
        setWsConnected(true);
        
        // Set up message handler
        const messageHandler = (data) => {
          if (data.type === 'status') {
            console.log('狀態:', data.message);
          } else if (data.type === 'response') {
            const botMessage = {
              id: Date.now() + 1,
              text: data.message,
              sender: 'bot',
              timestamp: new Date(),
              success: data.success,
              filesUsed: data.files_used,
              modelUsed: data.model_used,
              promptTokens: data.prompt_tokens,
              completionTokens: data.completion_tokens,
              totalTokens: data.total_tokens,
              isError: !data.success,
            };
            setMessages(prev => {
              const newMessages = [...prev, botMessage];
              // Limit to 20 messages
              if (newMessages.length > 20) {
                return newMessages.slice(-20);
              }
              return newMessages;
            });
            setIsLoading(false);
          } else if (data.type === 'error') {
            const errorMessage = {
              id: Date.now() + 1,
              text: data.message,
              sender: 'bot',
              timestamp: new Date(),
              success: false,
              isError: true,
            };
            setMessages(prev => {
              const newMessages = [...prev, errorMessage];
              if (newMessages.length > 20) {
                return newMessages.slice(-20);
              }
              return newMessages;
            });
            setIsLoading(false);
          }
        };
        
        chatWebSocket.onMessage(messageHandler);
        
      } catch (error) {
        console.error('WebSocket 連接失敗:', error);
        setWsConnected(false);
      } finally {
        setWsConnecting(false);
      }
    };
    
    initWebSocket();
    
    // Cleanup on unmount only
    return () => {
      chatWebSocket.disconnect();
    };
  }, []); // Empty dependency array - run once on mount

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

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
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
          <div className="nav-buttons" role="tablist">
            <button 
              className={`nav-btn ${tabValue === 0 ? 'active' : ''}`}
              onClick={() => handleTabChange(0)}
              role="tab"
              aria-selected={tabValue === 0}
              aria-controls="tabpanel-0"
              id="tab-0"
            >
              💬 聊天
              {isLoading && tabValue !== 0 && <span className="loading-badge">●</span>}
            </button>
            <button 
              className={`nav-btn ${tabValue === 1 ? 'active' : ''}`}
              onClick={() => handleTabChange(1)}
              role="tab"
              aria-selected={tabValue === 1}
              aria-controls="tabpanel-1"
              id="tab-1"
            >
              📁 檔案
            </button>
            <button 
              className={`nav-btn ${tabValue === 2 ? 'active' : ''}`}
              onClick={() => handleTabChange(2)}
              role="tab"
              aria-selected={tabValue === 2}
              aria-controls="tabpanel-2"
              id="tab-2"
            >
              📊 統計
            </button>
            <button 
              className={`nav-btn ${tabValue === 3 ? 'active' : ''}`}
              onClick={() => handleTabChange(3)}
              role="tab"
              aria-selected={tabValue === 3}
              aria-controls="tabpanel-3"
              id="tab-3"
            >
              📜 歷史
            </button>
          </div>
        </div>
      </header>

      <main className="App-main">
        <TabPanel value={tabValue} index={0}>
          <ChatInterface 
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            wsConnected={wsConnected}
            wsConnecting={wsConnecting}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <FileManager onFilesChange={checkHealth} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <StatsPanel />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <QueryHistory />
        </TabPanel>
      </main>

      <footer className="App-footer">
        <p>Powered by Google Gemini with Vector Search & Multi-Model Support</p>
      </footer>
    </div>
  );
}

export default App;
