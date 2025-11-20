// Core TypeScript Interfaces and Types for RAG Frontend

// Message Types
export interface RetrievedFileInfo {
  gemini_file_name: string;
  display_name: string;
  similarity_score: number;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  success?: boolean;
  isError?: boolean;
  filesUsed?: number;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  selectedFilesCount?: number;
  model?: string;
  isStreaming?: boolean;  // New: indicates message is still being streamed
  retrievedFiles?: RetrievedFileInfo[];  // New: list of retrieved files with scores
}

// API Response Types
export interface HealthResponse {
  api_configured: boolean;
  uploaded_files_count: number;
}

export interface ChatRequest {
  message: string;
  model?: string;
  selected_files?: string[] | null;
  system_prompt?: string | null;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  response?: string;
  files_used?: number;
  model_used?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  error_type?: string;
}

export interface ModelInfo {
  model_id: string;
  name: string;
  description: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

// File Types
export interface FileInfo {
  name: string;
  display_name: string;
  state: string;
  size?: number;
  size_bytes?: number;
  created_at?: string;
  create_time?: string;
  uri?: string;
}

export interface FilesResponse {
  files: FileInfo[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file_name?: string;
}

// Search Types
export interface SearchResult {
  document_id: string;
  gemini_file_name: string;
  display_name: string;
  content_preview: string;
  similarity_score: number;
}

export interface SearchRequest {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

// History Types
export interface HistoryItem {
  id: number;
  query: string;
  response: string;
  model_used: string;
  files_used: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  response_length: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface HistoryRequest {
  page?: number;
  page_size?: number;
  order?: 'asc' | 'desc';
}

export interface HistoryResponse {
  history: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

// Statistics Types
export interface Statistics {
  total_queries: number;
  successful_queries: number;
  success_rate: number;
  avg_files_used: number;
  total_tokens_used: number | null;
  avg_tokens_per_query: number | null;
  model_usage: Record<string, number>;
}

// WebSocket Types
export interface WebSocketMessage {
  message: string;
  model: string;
  selected_files: string[] | null;
  system_prompt: string | null;
  enable_auto_retrieval?: boolean;
  top_k?: number;
  similarity_threshold?: number;
}

export interface WebSocketResponse {
  type: 'status' | 'response' | 'error' | 'stream' | 'complete';
  message?: string;
  chunk?: string;  // For streaming chunks
  success?: boolean;
  model_used?: string;
  files_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  full_response?: string;  // For complete event
  retrieved_files?: RetrievedFileInfo[];  // For complete event - list of retrieved files
}

// Context Types
export interface AppContextType {
  isHealthy: boolean;
  setIsHealthy: (healthy: boolean) => void;
  filesCount: number;
  setFilesCount: (count: number) => void;
  currentTab: number;
  setCurrentTab: (tab: number) => void;
  refreshHealth: () => Promise<void>;
}

export interface WebSocketContextType {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  wsConnected: boolean;
  wsConnecting: boolean;
  sendMessage: (message: string, model: string, selectedFiles?: string[] | null, systemPrompt?: string | null, topK?: number, similarityThreshold?: number) => Promise<void>;
  clearMessages: () => void;
}

// Component Props Types
export interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  'aria-label'?: string;
  title?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  title?: string;
}

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

// Hook Return Types
export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

export interface UseChatReturn {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: ModelInfo[];
  modelsLoading: boolean;
  modelsError: string | null;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  topK: number;
  setTopK: (value: number) => void;
  similarityThreshold: number;
  setSimilarityThreshold: (value: number) => void;
  selectedFiles: string[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  searchResults: SearchResult[];
  handleSearchFiles: (query: string) => Promise<void>;
  isSearching: boolean;
  handleSendMessage: (message: string) => Promise<void>;
  loadModels: () => Promise<void>;
}

export interface UseFileManagerReturn {
  files: FileInfo[];
  isLoading: boolean;
  uploadProgress: string | null;
  message: { text: string; type: 'success' | 'error' } | null;
  handleUpload: (file: File) => Promise<void>;
  handleMultipleUpload: (files: File[]) => Promise<void>;
  handleDelete: (fileName: string) => Promise<void>;
  handleClearAll: () => Promise<void>;
  handleSync: () => Promise<void>;
  loadFiles: () => Promise<void>;
  handleDrop: (e: React.DragEvent<HTMLElement>) => Promise<void>;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  triggerFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  fileStats: {
    totalFiles: number;
    totalSize: number;
    processingFiles: number;
    readyFiles: number;
    errorFiles: number;
  };
}

export interface UseQueryHistoryReturn {
  history: HistoryItem[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
  error: string | null;
  setCurrentPage: (page: number) => void;
  loadHistory: () => Promise<void>;
  goToFirstPage: () => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  goToLastPage: () => void;
  pageStats: {
    recordsOnCurrentPage: number;
    totalTokensOnPage: number;
    successfulOnPage: number;
    successRate: number;
  };
  overallStats: {
    totalRecords: number;
    currentPageRange: {
      start: number;
      end: number;
    };
  };
  refreshHistory: () => Promise<void>;
  searchHistory: (searchTerm: string) => HistoryItem[];
  exportHistory: () => string;
}

export interface UseStatsReturn {
  stats: Statistics | null;
  enhancedStats: any;
  formattedStats: any;
  statsSummary: string[] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  loadStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  exportStats: () => string;
}

// Utility Types
export type MessageType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  id: string;
  text: string;
  type: MessageType;
  duration?: number;
}

// Error Types
export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

// Tab Types
export type TabIndex = 0 | 1 | 2 | 3;

// Environment Variables Types
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      VITE_WS_URL?: string;
      [key: string]: any;
    };
  }
}