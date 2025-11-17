// Enhanced Main App Component with TypeScript and Modern Architecture

import React, { useState, useCallback, useEffect } from 'react';
import { 
  FiMessageCircle, FiFolder, FiClock, FiBarChart,
  FiSun, FiMoon, FiMenu, FiX 
} from 'react-icons/fi';

// Context Providers
import { AppProvider } from './contexts/AppContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Components
import { ChatInterface } from './components/ChatInterface';
import { FileManager } from './components/FileManager';
import { QueryHistory } from './components/QueryHistory';
import { StatsPanel } from './components/StatsPanel';
import { ErrorBoundary } from './components/common';

// Styles
import './App.css';

type Tab = 'chat' | 'files' | 'history' | 'stats';

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  {
    id: 'chat',
    label: '聊天',
    icon: FiMessageCircle as React.ElementType,
    component: ChatInterface
  },
  {
    id: 'files',
    label: '檔案管理',
    icon: FiFolder as React.ElementType,
    component: FileManager
  },
  {
    id: 'history',
    label: '查詢記錄',
    icon: FiClock as React.ElementType,
    component: QueryHistory
  },
  {
    id: 'stats',
    label: '統計資料',
    icon: FiBarChart as React.ElementType,
    component: StatsPanel
  }
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Handle theme toggle
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  // Handle tab change
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // Close sidebar on mobile when tab changes
  }, []);

  // Get active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ChatInterface;

  return (
    <div className="app">
      {/* Message Banner will be handled by AppContext */}

      {/* Mobile Header */}
      <header className="mobile-header">
        <button 
          className="mobile-menu-button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="切換選單"
        >
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        
        <div className="mobile-title">
          <h1>Gemini RAG Chat</h1>
          <span className="current-tab">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </span>
        </div>
        
        <button 
          className="theme-toggle mobile"
          onClick={toggleTheme}
          aria-label={`切換到${theme === 'light' ? '深色' : '淺色'}主題`}
        >
          {theme === 'light' ? <FiMoon /> : <FiSun />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-content">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="app-logo">
              <div className="logo-icon">🤖</div>
              <div className="logo-text">
                <h1>Gemini RAG</h1>
                <p>智慧問答系統</p>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul className="nav-list">
              {tabs.map(tab => (
                <li key={tab.id} className="nav-item">
                  <button
                    className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    aria-label={`切換到${tab.label}`}
                  >
                    <span className="nav-icon"><tab.icon /></span>
                    <span className="nav-label">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button 
              className="theme-toggle desktop"
              onClick={toggleTheme}
              aria-label={`切換到${theme === 'light' ? '深色' : '淺色'}主題`}
            >
              {theme === 'light' ? <FiMoon /> : <FiSun />}
              <span>{theme === 'light' ? '深色模式' : '淺色模式'}</span>
            </button>
            
            <div className="app-info">
              <p>© 2024 Gemini RAG Chat</p>
              <p>版本 2.0.0</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <ErrorBoundary>
            <ActiveComponent />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;