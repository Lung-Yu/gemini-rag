// WebSocket Context - Real-time Communication Management

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import type { WebSocketContextType, ChatMessage, WebSocketResponse } from '../types';
import { chatWebSocket, type WebSocketStatus } from '../services/websocket';
import { sendMessage as apiSendMessage } from '../services/api';
import { MAX_MESSAGES } from '../constants';

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsConnecting, setWsConnecting] = useState<boolean>(false);
  
  // Use ref to track cleanup
  const cleanupRef = useRef<(() => void)[]>([]);

  // Handle WebSocket status changes
  useEffect(() => {
    const unsubscribeStatus = chatWebSocket.onStatusChange((status: WebSocketStatus) => {
      setWsConnected(status === 'connected');
      setWsConnecting(status === 'connecting');
    });

    cleanupRef.current.push(unsubscribeStatus);
    return unsubscribeStatus;
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribeMessages = chatWebSocket.onMessage((data: WebSocketResponse) => {
      handleWebSocketMessage(data);
    });

    cleanupRef.current.push(unsubscribeMessages);
    return unsubscribeMessages;
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    let isMounted = true;

    const initializeWebSocket = async () => {
      try {
        await chatWebSocket.connect();
        if (isMounted) {
          console.log('WebSocket initialized successfully');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to initialize WebSocket:', error);
        }
      }
    };

    initializeWebSocket();

    return () => {
      isMounted = false;
      // Cleanup all subscriptions
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketResponse) => {
    if (data.type === 'status') {
      console.log('Status:', data.message);
    } 
    else if (data.type === 'stream') {
      // Handle streaming chunk
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        
        // If last message is a bot message and is streaming, append to it
        if (lastMessage && lastMessage.sender === 'bot' && lastMessage.isStreaming) {
          const updatedMessage = {
            ...lastMessage,
            text: lastMessage.text + (data.chunk || ''),
            filesUsed: data.files_used,
            modelUsed: data.model_used,
          };
          return [...prev.slice(0, -1), updatedMessage];
        } else {
          // Create new streaming message
          const streamMessage: ChatMessage = {
            id: Date.now() + 1,
            text: data.chunk || '',
            sender: 'bot',
            timestamp: new Date(),
            isStreaming: true,
            filesUsed: data.files_used,
            modelUsed: data.model_used,
          };
          const newMessages = [...prev, streamMessage];
          return newMessages.length > MAX_MESSAGES 
            ? newMessages.slice(-MAX_MESSAGES) 
            : newMessages;
        }
      });
    }
    else if (data.type === 'complete') {
      // Mark streaming as complete and add metadata
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.isStreaming) {
          const completedMessage = {
            ...lastMessage,
            isStreaming: false,
            success: data.success !== false,
            promptTokens: data.prompt_tokens,
            completionTokens: data.completion_tokens,
            totalTokens: data.total_tokens,
            retrievedFiles: data.retrieved_files || [],
          };
          return [...prev.slice(0, -1), completedMessage];
        }
        return prev;
      });
      setIsLoading(false);
    }
    else if (data.type === 'response') {
      // Fallback for non-streaming response
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: data.message || '',
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
        return newMessages.length > MAX_MESSAGES 
          ? newMessages.slice(-MAX_MESSAGES) 
          : newMessages;
      });
      setIsLoading(false);
    } 
    else if (data.type === 'error') {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: data.message || 'An error occurred',
        sender: 'bot',
        timestamp: new Date(),
        success: false,
        isError: true,
      };

      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        return newMessages.length > MAX_MESSAGES 
          ? newMessages.slice(-MAX_MESSAGES) 
          : newMessages;
      });
      setIsLoading(false);
    }
  }, []);

  // Send message function with fallback
  const handleSendMessage = useCallback(async (
    message: string,
    model: string,
    selectedFiles?: string[] | null,
    systemPrompt?: string | null
  ): Promise<void> => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      model,
      selectedFilesCount: selectedFiles?.length || 0,
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      return newMessages.length > MAX_MESSAGES 
        ? newMessages.slice(-MAX_MESSAGES) 
        : newMessages;
    });
    
    setIsLoading(true);

    try {
      if (chatWebSocket.isConnected()) {
        // Use WebSocket with auto-retrieval parameters
        chatWebSocket.sendMessage(message, model, selectedFiles, systemPrompt, true, 5, 0.6);
      } else {
        // Fallback to HTTP API
        console.log('WebSocket not connected, using HTTP fallback');
        
        const response = await apiSendMessage(message, model, selectedFiles, systemPrompt);
        
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          text: response.response || response.message,
          sender: 'bot',
          timestamp: new Date(),
          success: response.success,
          filesUsed: response.files_used,
          modelUsed: response.model_used,
          promptTokens: response.prompt_tokens,
          completionTokens: response.completion_tokens,
          totalTokens: response.total_tokens,
          isError: !response.success,
        };

        setMessages(prev => {
          const newMessages = [...prev, botMessage];
          return newMessages.length > MAX_MESSAGES 
            ? newMessages.slice(-MAX_MESSAGES) 
            : newMessages;
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: error instanceof Error ? error.message : 'An error occurred',
        sender: 'bot',
        timestamp: new Date(),
        success: false,
        isError: true,
      };

      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        return newMessages.length > MAX_MESSAGES 
          ? newMessages.slice(-MAX_MESSAGES) 
          : newMessages;
      });
      setIsLoading(false);
    }
  }, []);

  // Clear messages function
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value: WebSocketContextType = {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    wsConnected,
    wsConnecting,
    sendMessage: handleSendMessage,
    clearMessages,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}