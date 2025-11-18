// Enhanced API Service with TypeScript, Caching, and Error Handling

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type {
  HealthResponse,
  ChatRequest,
  ChatResponse,
  ModelsResponse,
  FilesResponse,
  UploadResponse,
  SearchRequest,
  SearchResponse,
  Statistics,
  HistoryRequest,
  HistoryResponse,
  ApiError
} from '../types';
import { API_BASE_URL } from '../constants';
import { retryWithBackoff } from '../utils';

/**
 * API Cache Manager
 */
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMs: number = 300000): void { // 5 min default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Enhanced API Client
 */
class ApiClient {
  private client: AxiosInstance;
  private cache = new ApiCache();
  private requestControllers = new Map<string, AbortController>();

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    
    // Cleanup cache every 10 minutes
    setInterval(() => this.cache.cleanup(), 600000);
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => Promise.reject(this.handleError(error))
    );
  }

  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
      details: error.response?.data
    };

    if (error.code === 'ECONNABORTED') {
      apiError.message = 'Request timeout - please try again';
    } else if (error.code === 'ERR_NETWORK') {
      apiError.message = 'Network error - check your connection';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      if (status >= 400 && status < 500) {
        apiError.message = data?.detail || data?.message || 'Client error';
      } else if (status >= 500) {
        apiError.message = 'Server error - please try again later';
      }
    } else if (error.request) {
      apiError.message = 'No response from server - please check your connection';
    }

    console.error('API Error:', apiError);
    return apiError;
  }

  private async makeRequest<T>(
    config: AxiosRequestConfig,
    cacheKey?: string,
    cacheTtl?: number
  ): Promise<T> {
    // Check cache first
    if (cacheKey && config.method?.toLowerCase() === 'get') {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Setup request cancellation
    const requestId = `${config.method}-${config.url}-${Date.now()}`;
    const controller = new AbortController();
    this.requestControllers.set(requestId, controller);
    
    config.signal = controller.signal;

    try {
      const response = await this.client.request<T>(config);
      
      // Cache successful GET responses
      if (cacheKey && config.method?.toLowerCase() === 'get' && cacheTtl) {
        this.cache.set(cacheKey, response.data, cacheTtl);
      }
      
      return response.data;
    } finally {
      this.requestControllers.delete(requestId);
    }
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    for (const controller of this.requestControllers.values()) {
      controller.abort();
    }
    this.requestControllers.clear();
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>(
      { method: 'get', url: '/' },
      'health',
      60000 // Cache for 1 minute
    );
  }

  // Chat endpoints
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return retryWithBackoff(
      () => this.makeRequest<ChatResponse>({
        method: 'post',
        url: '/api/chat',
        data: request
      }),
      3, // 3 retries
      1000 // 1 second base delay
    );
  }

  async getAvailableModels(): Promise<ModelsResponse> {
    return this.makeRequest<ModelsResponse>(
      { method: 'get', url: '/api/chat/models' },
      'models',
      600000 // Cache for 10 minutes
    );
  }

  // File management
  async listFiles(): Promise<FilesResponse> {
    return this.makeRequest<FilesResponse>(
      { method: 'get', url: '/api/files' },
      'files',
      30000 // Cache for 30 seconds
    );
  }

  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Clear files cache on successful upload
    this.cache.delete('files');
    this.cache.delete('health');

    return this.makeRequest<UploadResponse>({
      method: 'post',
      url: '/api/files/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      }
    });
  }

  async deleteFile(fileName: string): Promise<{ success: boolean; message: string }> {
    // Clear relevant caches
    this.cache.delete('files');
    this.cache.delete('health');
    
    return this.makeRequest({
      method: 'delete',
      url: `/api/files/${encodeURIComponent(fileName)}`
    });
  }

  async clearAllFiles(): Promise<{ success: boolean; message: string }> {
    // Clear relevant caches
    this.cache.delete('files');
    this.cache.delete('health');
    this.cache.delete('stats');
    
    return this.makeRequest({
      method: 'delete',
      url: '/api/files'
    });
  }

  async syncFiles(): Promise<{ success: boolean; message: string; synced: number; skipped: number; errors: number; total: number }> {
    // Clear relevant caches
    this.cache.delete('files');
    this.cache.delete('health');
    this.cache.delete('stats');
    
    return this.makeRequest({
      method: 'post',
      url: '/api/files/sync'
    });
  }

  // Search
  async searchDocuments(request: SearchRequest): Promise<SearchResponse> {
    return this.makeRequest<SearchResponse>({
      method: 'post',
      url: '/api/search',
      data: request
    });
  }

  // Statistics
  async getStatistics(): Promise<Statistics> {
    return this.makeRequest<Statistics>(
      { method: 'get', url: '/api/stats' },
      'stats',
      60000 // Cache for 1 minute
    );
  }

  // Query History
  async getQueryHistory(request: HistoryRequest = {}): Promise<HistoryResponse> {
    const params = new URLSearchParams();
    if (request.page) params.append('page', request.page.toString());
    if (request.page_size) params.append('page_size', request.page_size.toString());
    if (request.order) params.append('order', request.order);
    
    const cacheKey = `history-${params.toString()}`;
    
    return this.makeRequest<HistoryResponse>(
      { 
        method: 'get', 
        url: '/api/stats/history',
        params: request 
      },
      cacheKey,
      30000 // Cache for 30 seconds
    );
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.clearCache();
      return;
    }

    // Delete cache entries matching pattern
    for (const key of Array.from(this.cache['cache'].keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience (maintains backward compatibility)
export const getHealth = () => apiClient.getHealth();
export const sendMessage = (message: string, model?: string, selectedFiles?: string[] | null, systemPrompt?: string | null) => 
  apiClient.sendMessage({ message, model, selected_files: selectedFiles || null, system_prompt: systemPrompt || null });
export const getAvailableModels = () => apiClient.getAvailableModels();
export const listFiles = () => apiClient.listFiles();
export const uploadFile = (file: File, onProgress?: (progress: number) => void) => apiClient.uploadFile(file, onProgress);
export const deleteFile = (fileName: string) => apiClient.deleteFile(fileName);
export const clearAllFiles = () => apiClient.clearAllFiles();
export const syncFiles = () => apiClient.syncFiles();
export const searchDocuments = (query: string, topK: number = 5, similarityThreshold: number = 0.7) => 
  apiClient.searchDocuments({ query, top_k: topK, similarity_threshold: similarityThreshold });
export const getStatistics = () => apiClient.getStatistics();
export const getQueryHistory = (page: number = 1, pageSize: number = 50, order: 'asc' | 'desc' = 'desc') => 
  apiClient.getQueryHistory({ page, page_size: pageSize, order });

// Export API client for direct access
export default apiClient;