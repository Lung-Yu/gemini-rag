// LocalStorage Utility with TypeScript Support and Validation

import { useState, useEffect, useCallback } from 'react';
import type { UseLocalStorageReturn } from '../types';

/**
 * Type-safe localStorage wrapper with error handling
 */
export class StorageManager {
  private static validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Storage key must be a non-empty string');
    }
  }

  private static validateValue<T>(value: T): void {
    if (value === undefined) {
      throw new Error('Cannot store undefined values');
    }
  }

  /**
   * Get item from localStorage with type safety
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      this.validateKey(key);
      
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }

      // Try to parse JSON, fallback to string if it fails
      try {
        return JSON.parse(item) as T;
      } catch {
        // If parsing fails, return as string (assuming T extends string)
        return item as unknown as T;
      }
    } catch (error) {
      console.warn(`Error reading from localStorage (key: ${key}):`, error);
      return defaultValue ?? null;
    }
  }

  /**
   * Set item in localStorage with validation
   */
  static set<T>(key: string, value: T): boolean {
    try {
      this.validateKey(key);
      this.validateValue(value);

      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.warn(`Error writing to localStorage (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  static remove(key: string): boolean {
    try {
      this.validateKey(key);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error removing from localStorage (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage data
   */
  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all keys from localStorage
   */
  static keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Error getting localStorage keys:', error);
      return [];
    }
  }

  /**
   * Get storage size in bytes (approximate)
   */
  static getSize(): number {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return total;
    } catch (error) {
      console.warn('Error calculating localStorage size:', error);
      return 0;
    }
  }
}

/**
 * React Hook for localStorage with automatic updates
 */

export function useLocalStorage<T>(key: string, defaultValue: T): UseLocalStorageReturn<T> {
  // Initialize state with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    const storedValue = StorageManager.get<T>(key);
    return storedValue !== null ? storedValue : defaultValue;
  });

  // Update localStorage when value changes
  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue);
    StorageManager.set(key, newValue);
  }, [key]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    setValue(defaultValue);
    StorageManager.remove(key);
  }, [key, defaultValue]);

  // Listen for storage events (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsedValue = JSON.parse(e.newValue) as T;
          setValue(parsedValue);
        } catch {
          setValue(e.newValue as unknown as T);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return {
    value,
    setValue: setStoredValue,
    removeValue,
  };
}

/**
 * Specific storage functions for app data
 */
export const AppStorage = {
  // Model preferences
  getPreferredModel(): string | null {
    return StorageManager.get<string>('preferredModel');
  },
  
  setPreferredModel(model: string): boolean {
    return StorageManager.set('preferredModel', model);
  },

  // System prompt
  getSystemPrompt(): string | null {
    return StorageManager.get<string>('systemPrompt');
  },
  
  setSystemPrompt(prompt: string): boolean {
    return StorageManager.set('systemPrompt', prompt);
  },

  // User preferences
  getUserPreferences(): Record<string, any> {
    return StorageManager.get<Record<string, any>>('userPreferences', {}) || {};
  },
  
  setUserPreferences(preferences: Record<string, any>): boolean {
    return StorageManager.set('userPreferences', preferences);
  },

  // Theme
  getTheme(): 'light' | 'dark' | 'auto' {
    return StorageManager.get<'light' | 'dark' | 'auto'>('theme', 'auto') || 'auto';
  },
  
  setTheme(theme: 'light' | 'dark' | 'auto'): boolean {
    return StorageManager.set('theme', theme);
  },

  // Clear all app data
  clearAppData(): boolean {
    const keys = ['preferredModel', 'systemPrompt', 'userPreferences', 'theme'];
    let success = true;
    
    keys.forEach(key => {
      if (!StorageManager.remove(key)) {
        success = false;
      }
    });
    
    return success;
  }
};