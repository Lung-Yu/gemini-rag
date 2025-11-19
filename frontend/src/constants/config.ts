// Application Configuration Constants with TypeScript

// Message Settings
export const MAX_MESSAGES = 20;
export const MESSAGE_FADE_DURATION = 3000;

// Pagination Settings
export const DEFAULT_PAGE_SIZE = 20;
export const HISTORY_PAGE_SIZE = 20;

// Search Settings
export const DEFAULT_TOP_K = 5;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.6;  // 降低閾值以提高召回率

// WebSocket Settings
export const MAX_RECONNECT_ATTEMPTS = 5;
export const BASE_RECONNECT_DELAY = 1000;

// Text Truncation
export const QUERY_PREVIEW_LENGTH = 80;
export const CONTENT_PREVIEW_LENGTH = 200;

// File Upload
export const ACCEPTED_FILE_TYPES = '.txt,.pdf,.doc,.docx';
export const MAX_FILE_SIZE = 10485760; // 10MB (10 * 1024 * 1024)

// Default Models
export const DEFAULT_MODEL = 'gemini-1.5-flash';
export const FALLBACK_MODEL = 'gemini-1.5-flash';

// Default System Prompts
export const DEFAULT_SYSTEM_PROMPT_ZH = '基於提供的文件內容，請回答以下問題：\n\n{query}\n\n如果文件中沒有相關信息，請明確說明並提供一般性的回答。';
export const DEFAULT_SYSTEM_PROMPT_EN = 'Based on the provided document content, please answer the following question:\n\n{query}\n\nIf there is no relevant information in the documents, please clearly state that and provide a general answer.';

// Example Questions
export const EXAMPLE_QUESTIONS = [
  '誰有 CISSP 證照？',
  '列出所有人的年齡',
  '總共有多少人？'
];

// LocalStorage Keys
export const STORAGE_KEYS = {
  PREFERRED_MODEL: 'preferredModel',
  SYSTEM_PROMPT: 'systemPrompt',
};

// API Configuration
export const API_BASE_URL: string = (import.meta?.env?.VITE_API_URL || (process.env as any)?.REACT_APP_API_URL || 'http://localhost:8000');
export const WS_BASE_URL: string = (import.meta?.env?.VITE_WS_URL || (process.env as any)?.REACT_APP_WS_URL || 'ws://localhost:8000/api/chat/ws');
