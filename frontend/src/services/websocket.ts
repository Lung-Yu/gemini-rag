// Enhanced WebSocket Service with TypeScript and Better Error Handling

import type { WebSocketMessage, WebSocketResponse } from '../types';
import { WS_BASE_URL, MAX_RECONNECT_ATTEMPTS, BASE_RECONNECT_DELAY } from '../constants';
import { sleep } from '../utils';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MessageHandler = (data: WebSocketResponse) => void;

/**
 * Enhanced WebSocket Manager with TypeScript
 */
export class ChatWebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = BASE_RECONNECT_DELAY;
  private shouldReconnect = true;
  private status: WebSocketStatus = 'disconnected';
  private statusHandlers: Set<(status: WebSocketStatus) => void> = new Set();
  private connectionPromise: Promise<void> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongTime = 0;

  constructor(private wsUrl: string = WS_BASE_URL) {}

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(handler: (status: WebSocketStatus) => void): () => void {
    this.statusHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Update status and notify handlers
   */
  private updateStatus(newStatus: WebSocketStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusHandlers.forEach(handler => {
        try {
          handler(newStatus);
        } catch (error) {
          console.error('Error in status handler:', error);
        }
      });
    }
  }

  /**
   * Connect to WebSocket with promise-based API
   */
  connect(): Promise<void> {
    // Return existing connection promise if connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, resolve immediately
    if (this.isConnected()) {
      return Promise.resolve();
    }

    this.connectionPromise = this.doConnect();
    return this.connectionPromise;
  }

  private async doConnect(): Promise<void> {
    try {
      this.updateStatus('connecting');
      this.shouldReconnect = true;

      await this.createWebSocket();
      
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
      this.startHeartbeat();
      
      console.log('✓ WebSocket connected successfully');
    } catch (error) {
      this.updateStatus('error');
      console.error('WebSocket connection failed:', error);
      
      if (this.shouldReconnect) {
        await this.attemptReconnect();
      }
      
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  private createWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        const connectTimeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.lastPongTime = Date.now();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Handle heartbeat pong
            if (event.data === 'pong') {
              this.lastPongTime = Date.now();
              return;
            }

            const data: WebSocketResponse = JSON.parse(event.data);
            this.notifyMessageHandlers(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          this.stopHeartbeat();
          
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          
          if (this.shouldReconnect && !event.wasClean) {
            this.updateStatus('connecting');
            this.attemptReconnect().catch(error => {
              console.error('Reconnection failed:', error);
              this.updateStatus('error');
            });
          } else {
            this.updateStatus('disconnected');
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.updateStatus('error');
      this.shouldReconnect = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    await sleep(delay);
    
    if (this.shouldReconnect) {
      try {
        await this.doConnect();
      } catch (error) {
        // Error handling is done in doConnect
      }
    }
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Max 30 seconds
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(baseDelay + jitter, maxDelay);
  }

  /**
   * Start heartbeat to detect connection issues
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Check if we received pong recently
        const now = Date.now();
        if (now - this.lastPongTime > 35000) { // 35 seconds timeout
          console.warn('Heartbeat timeout, reconnecting...');
          this.reconnect();
          return;
        }
        
        // Send ping
        try {
          this.ws?.send('ping');
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.reconnect();
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(
    message: string,
    model: string,
    selectedFiles?: string[] | null,
    systemPrompt?: string | null,
    enableAutoRetrieval: boolean = true,
    topK: number = 5,
    similarityThreshold: number = 0.6
  ): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }

    const data: WebSocketMessage = {
      message,
      model,
      selected_files: selectedFiles || null,
      system_prompt: systemPrompt || null,
      enable_auto_retrieval: enableAutoRetrieval,
      top_k: topK,
      similarity_threshold: similarityThreshold
    };

    try {
      this.ws!.send(JSON.stringify(data));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Add message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private notifyMessageHandlers(data: WebSocketResponse): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Check if WebSocket is connecting
   */
  isConnecting(): boolean {
    return this.status === 'connecting';
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.disconnect(false);
    await sleep(1000); // Brief delay before reconnecting
    return this.connect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(permanent: boolean = true): void {
    if (permanent) {
      this.shouldReconnect = false;
    }
    
    this.stopHeartbeat();
    this.connectionPromise = null;
    
    if (this.ws) {
      // Clean close
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    if (permanent) {
      this.updateStatus('disconnected');
      this.messageHandlers.clear();
      this.statusHandlers.clear();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    wsUrl?: string;
  }): void {
    if (options.maxReconnectAttempts !== undefined) {
      this.maxReconnectAttempts = options.maxReconnectAttempts;
    }
    
    if (options.reconnectDelay !== undefined) {
      this.reconnectDelay = options.reconnectDelay;
    }
    
    if (options.wsUrl !== undefined && options.wsUrl !== this.wsUrl) {
      const wasConnected = this.isConnected();
      this.wsUrl = options.wsUrl;
      
      if (wasConnected) {
        // Reconnect with new URL
        this.reconnect();
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    status: WebSocketStatus;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    lastPongTime: number;
    wsUrl: string;
  } {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastPongTime: this.lastPongTime,
      wsUrl: this.wsUrl
    };
  }
}

// Create and export singleton instance
export const chatWebSocket = new ChatWebSocketManager();

// Export for backward compatibility
export default chatWebSocket;