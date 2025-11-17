class ChatWebSocket {
  constructor() {
    this.ws = null;
    this.messageHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
  }

  connect() {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/api/chat/ws';
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✓ WebSocket 連接成功');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('處理 WebSocket 訊息錯誤:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket 錯誤:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket 連接已關閉');
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`嘗試重新連接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('重新連接失敗:', error);
        });
      }, delay);
    } else {
      console.error('達到最大重連次數，請刷新頁面重試');
    }
  }

  sendMessage(message, model, selectedFiles) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = {
        message,
        model,
        selected_files: selectedFiles
      };
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket 未連接');
    }
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers = [];
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocket();
export default chatWebSocket;
