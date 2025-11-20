// Chat Hook - Manages Chat Logic and State

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UseChatReturn, ModelInfo, SearchResult } from '../types';
import { apiClient } from '../services/api';
import { useLocalStorage } from '../utils/storage';
import { validateSearchQuery, validateSystemPrompt } from '../utils/validation';
import { DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT_ZH, DEFAULT_TOP_K, DEFAULT_SIMILARITY_THRESHOLD } from '../constants';
import { useWebSocket } from '../contexts/WebSocketContext';

export function useChat(): UseChatReturn {
  // Model management
  const { value: selectedModel, setValue: setSelectedModelState } = useLocalStorage('preferredModel', DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // System prompt management
  const { value: systemPrompt, setValue: setSystemPromptState } = useLocalStorage('systemPrompt', DEFAULT_SYSTEM_PROMPT_ZH);

  // Auto-retrieval settings
  const { value: topK, setValue: setTopKState } = useLocalStorage('topK', DEFAULT_TOP_K);
  const { value: similarityThreshold, setValue: setSimilarityThresholdState } = useLocalStorage('similarityThreshold', DEFAULT_SIMILARITY_THRESHOLD);

  // File selection and search
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // WebSocket context
  const { sendMessage } = useWebSocket();

  // Load available models
  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    
    try {
      const data = await apiClient.getAvailableModels();
      const models = data.models || [];
      
      if (models.length === 0) {
        throw new Error('No models available');
      }
      
      setAvailableModels(models);
      
      // Check if current model is still available
      const currentModelExists = models.some(m => m.model_id === selectedModel);
      if (!currentModelExists && models.length > 0) {
        const newModel = models[0].model_id;
        setSelectedModelState(newModel);
        console.log(`Model ${selectedModel} not available, switched to ${newModel}`);
      }
      
    } catch (error) {
      console.error('Failed to load models:', error);
      setModelsError(error instanceof Error ? error.message : 'Failed to load models');
      
      // Fallback to default models
      const fallbackModels: ModelInfo[] = [{
        model_id: DEFAULT_MODEL,
        name: 'Gemini 1.5 Flash (Fallback)',
        description: 'Fallback model'
      }];
      setAvailableModels(fallbackModels);
    } finally {
      setModelsLoading(false);
    }
  }, [selectedModel, setSelectedModelState]);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Set model with validation
  const setSelectedModel = useCallback((model: string) => {
    const modelExists = availableModels.some(m => m.model_id === model);
    if (modelExists || availableModels.length === 0) {
      setSelectedModelState(model);
    } else {
      console.warn(`Model ${model} not available`);
    }
  }, [availableModels, setSelectedModelState]);

  // Set system prompt with validation
  const setSystemPrompt = useCallback((prompt: string) => {
    const validation = validateSystemPrompt(prompt);
    if (validation.warnings?.length) {
      console.warn('System prompt warnings:', validation.warnings);
    }
    setSystemPromptState(prompt);
  }, [setSystemPromptState]);

  // Set top_k
  const setTopK = useCallback((value: number) => {
    const clamped = Math.max(1, Math.min(21, value)); // Allow 21 for unlimited
    setTopKState(clamped);
  }, [setTopKState]);

  // Set similarity threshold
  const setSimilarityThreshold = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setSimilarityThresholdState(clamped);
  }, [setSimilarityThresholdState]);

  // Search files
  const handleSearchFiles = useCallback(async (query: string): Promise<void> => {
    // Validate query
    const validation = validateSearchQuery(query);
    if (!validation.isValid) {
      console.error('Invalid search query:', validation.errors);
      return;
    }

    if (validation.warnings?.length) {
      console.warn('Search query warnings:', validation.warnings);
    }

    setIsSearching(true);
    try {
      const data = await apiClient.searchDocuments({
        query,
        top_k: topK === 21 ? undefined : topK,
        similarity_threshold: similarityThreshold
      });
      
      setSearchResults(data.results || []);
      
      // Auto-select top results
      const topFileNames = data.results.map(r => r.gemini_file_name);
      setSelectedFiles(topFileNames);
      
    } catch (error) {
      console.error('Failed to search files:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [topK, similarityThreshold]);

  // Send message
  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim()) {
      console.warn('Cannot send empty message');
      return;
    }

    try {
      // 完全自動檢索模式 - 不使用手動選擇的檔案
      console.log('AI auto-retrieval mode: backend will search and analyze relevant documents');

      // Send message with auto-retrieval parameters (no manual file selection)
      await sendMessage(
        message,
        selectedModel,
        null, // 永遠不傳遞手動選擇的檔案
        systemPrompt || null,
        topK === 21 ? undefined : topK,
        similarityThreshold
      );
      
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Re-throw to let caller handle
    }
  }, [selectedModel, systemPrompt, topK, similarityThreshold, sendMessage]);

  // Memoized return value for performance
  return useMemo(() => ({
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
    loadModels,
  }), [
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
    searchResults,
    handleSearchFiles,
    isSearching,
    handleSendMessage,
    loadModels,
  ]);
}