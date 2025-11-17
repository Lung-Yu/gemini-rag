// App Context - Global Application State Management

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AppContextType, TabIndex } from '../types';
import { apiClient } from '../services/api';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [filesCount, setFilesCount] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<TabIndex>(0);

  // Health check with error handling
  const refreshHealth = useCallback(async () => {
    try {
      const data = await apiClient.getHealth();
      setIsHealthy(data.api_configured);
      setFilesCount(data.uploaded_files_count);
    } catch (error) {
      console.error('Health check failed:', error);
      setIsHealthy(false);
      setFilesCount(0);
    }
  }, []);

  // Initial health check
  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  // Tab change handler with validation
  const handleSetCurrentTab = useCallback((tab: number) => {
    if (tab >= 0 && tab <= 3) {
      setCurrentTab(tab as TabIndex);
    }
  }, []);

  const value: AppContextType = {
    isHealthy,
    setIsHealthy,
    filesCount,
    setFilesCount,
    currentTab,
    setCurrentTab: handleSetCurrentTab,
    refreshHealth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}