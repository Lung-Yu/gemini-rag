// Format Utilities for Display and Processing

/**
 * Date formatting utilities
 */
export class DateFormatter {
  /**
   * Format date to locale string with options
   */
  static toLocaleDateTimeString(date: Date | string, locale: string = 'zh-TW'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  /**
   * Format date to time only
   */
  static toTimeString(date: Date | string, locale: string = 'zh-TW'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Time';
    }
    
    return dateObj.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  /**
   * Get relative time string (e.g., "2 minutes ago")
   */
  static getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return '剛才';
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    if (diffHour < 24) return `${diffHour} 小時前`;
    if (diffDay < 7) return `${diffDay} 天前`;
    
    return DateFormatter.toLocaleDateTimeString(dateObj);
  }
}

/**
 * Number formatting utilities
 */
export class NumberFormatter {
  /**
   * Format number with locale-specific thousands separator
   */
  static toLocaleString(num: number, locale: string = 'zh-TW'): string {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    
    return num.toLocaleString(locale);
  }
  
  /**
   * Format file size in bytes to human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  /**
   * Format percentage with specified decimal places
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0%';
    }
    
    return value.toFixed(decimals) + '%';
  }
  
  /**
   * Format large numbers with K, M, B suffixes
   */
  static formatLargeNumber(num: number): string {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
  }
}

/**
 * File size formatting utilities (alias for backward compatibility)
 */
export class FileSizeFormatter {
  /**
   * Format bytes to human readable format
   */
  static format(bytes: number): string {
    return NumberFormatter.formatFileSize(bytes);
  }
}

/**
 * Text formatting utilities
 */
export class TextFormatter {
  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
  
  /**
   * Capitalize first letter of each word
   */
  static toTitleCase(text: string): string {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Convert to kebab-case
   */
  static toKebabCase(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, '-')
      .replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
      .replace(/^-/, '')
      .toLowerCase();
  }
  
  /**
   * Extract text preview from longer content
   */
  static getPreview(text: string, maxLength: number = 150): string {
    if (!text || text.length <= maxLength) return text;
    
    // Try to break at sentence end
    const sentences = text.split(/[.!?]+/);
    let preview = '';
    
    for (const sentence of sentences) {
      if (preview.length + sentence.length <= maxLength) {
        preview += sentence + '.';
      } else {
        break;
      }
    }
    
    // If we couldn't fit any complete sentence, just truncate
    if (preview.length === 0) {
      preview = TextFormatter.truncate(text, maxLength);
    }
    
    return preview.trim();
  }
  
  /**
   * Highlight search terms in text
   */
  static highlightText(text: string, searchTerm: string): string {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * Count words in text
   */
  static wordCount(text: string): number {
    if (!text) return 0;
    
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Estimate reading time (average 200 words per minute)
   */
  static estimateReadingTime(text: string, wordsPerMinute: number = 200): string {
    const words = TextFormatter.wordCount(text);
    const minutes = Math.ceil(words / wordsPerMinute);
    
    if (minutes < 1) return '少於 1 分鐘';
    if (minutes === 1) return '1 分鐘';
    return `${minutes} 分鐘`;
  }
}

/**
 * Token formatting utilities
 */
export class TokenFormatter {
  /**
   * Format token count with proper units
   */
  static formatTokenCount(tokens: number | null | undefined): string {
    if (tokens === null || tokens === undefined) return '-';
    if (typeof tokens !== 'number') return '-';
    
    return NumberFormatter.toLocaleString(tokens);
  }
  
  /**
   * Calculate and format token usage percentage
   */
  static formatTokenUsage(used: number, total: number): string {
    if (!used || !total || total === 0) return '0%';
    
    const percentage = (used / total) * 100;
    return NumberFormatter.formatPercentage(percentage, 1);
  }
  
  /**
   * Estimate cost from tokens (example pricing)
   */
  static estimateCost(tokens: number, costPer1kTokens: number = 0.002): string {
    if (!tokens || !costPer1kTokens) return '$0.00';
    
    const cost = (tokens / 1000) * costPer1kTokens;
    return `$${cost.toFixed(4)}`;
  }
}

/**
 * Model name formatting utilities
 */
export class ModelFormatter {
  /**
   * Get display name for model
   */
  static getDisplayName(modelId: string): string {
    const modelNames: Record<string, string> = {
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    };
    
    return modelNames[modelId] || modelId;
  }
  
  /**
   * Get model category/provider
   */
  static getProvider(modelId: string): string {
    if (modelId.startsWith('gemini')) return 'Google';
    if (modelId.startsWith('gpt')) return 'OpenAI';
    if (modelId.startsWith('claude')) return 'Anthropic';
    
    return 'Unknown';
  }
}

/**
 * Status formatting utilities
 */
export class StatusFormatter {
  /**
   * Get status display text and color
   */
  static getStatusInfo(success: boolean): { text: string; color: string; icon: string } {
    return success 
      ? { text: '成功', color: 'success', icon: 'FiCheckCircle' }
      : { text: '失敗', color: 'error', icon: 'FiAlertCircle' };
  }
  
  /**
   * Get connection status display
   */
  static getConnectionStatus(connected: boolean, connecting: boolean): { text: string; color: string } {
    if (connecting) return { text: '連接中...', color: 'warning' };
    if (connected) return { text: '即時連接', color: 'success' };
    return { text: '標準模式', color: 'info' };
  }
}

/**
 * URL and API formatting utilities
 */
export class UrlFormatter {
  /**
   * Build API URL with base path
   */
  static buildApiUrl(endpoint: string, baseUrl?: string): string {
    const base = baseUrl || 'http://localhost:8000';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base.replace(/\/$/, '')}${cleanEndpoint}`;
  }
  
  /**
   * Build WebSocket URL
   */
  static buildWsUrl(endpoint: string, baseUrl?: string): string {
    const base = baseUrl || 'ws://localhost:8000';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base.replace(/\/$/, '')}${cleanEndpoint}`;
  }
  
  /**
   * Extract filename from URL or path
   */
  static extractFilename(path: string): string {
    if (!path) return '';
    
    return path.split('/').pop() || path.split('\\').pop() || '';
  }
}