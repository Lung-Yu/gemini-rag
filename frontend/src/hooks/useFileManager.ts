// File Manager Hook - Manages File Upload and Management Logic

import { useState, useCallback, useMemo, useRef } from 'react';
import type { UseFileManagerReturn, FileInfo, NotificationMessage } from '../types';
import { apiClient } from '../services/api';
import { validateFile } from '../utils/validation';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../constants';
import { generateId } from '../utils';
import { useApp } from '../contexts/AppContext';

export function useFileManager(): UseFileManagerReturn {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Get refreshHealth from App context
  const { refreshHealth } = useApp();
  
  // Ref to track file input for programmatic access
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show message with auto-hide
  const showMessage = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const messageId = generateId();
    setMessage({ text, type });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setMessage(current => current?.text === text ? null : current);
    }, 3000);
  }, []);

  // Load files
  const loadFiles = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiClient.listFiles();
      setFiles(data.files || []);
      
      // Also refresh app health to update file count
      await refreshHealth();
    } catch (error) {
      console.error('Failed to load files:', error);
      showMessage('載入檔案列表失敗', 'error');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshHealth, showMessage]);

  // Upload single file
  const handleUpload = useCallback(async (file: File): Promise<void> => {
    // Validate file
    const validation = validateFile(file, {
      maxSize: MAX_FILE_SIZE,
      allowedExtensions: ACCEPTED_FILE_TYPES.split(',')
    });

    if (!validation.isValid) {
      showMessage(validation.errors.join(', '), 'error');
      return;
    }

    if (validation.warnings?.length) {
      console.warn('File upload warnings:', validation.warnings);
    }

    setUploadProgress(file.name);
    
    try {
      await apiClient.uploadFile(file, (progress) => {
        // Could add progress callback here if needed
        console.log(`Upload progress: ${progress}%`);
      });
      
      showMessage(`${file.name} 上傳成功`, 'success');
      await loadFiles(); // Reload files after successful upload
    } catch (error) {
      console.error('Upload failed:', error);
      showMessage(`${file.name} 上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 'error');
    } finally {
      setUploadProgress(null);
    }
  }, [showMessage, loadFiles]);

  // Upload multiple files
  const handleMultipleUpload = useCallback(async (fileList: FileList | File[]): Promise<void> => {
    const files = Array.from(fileList);
    
    for (const file of files) {
      await handleUpload(file);
    }
  }, [handleUpload]);

  // Delete single file
  const handleDelete = useCallback(async (fileName: string): Promise<void> => {
    if (!fileName) {
      showMessage('無效的檔案名稱', 'error');
      return;
    }

    try {
      await apiClient.deleteFile(fileName);
      showMessage(`${fileName} 已刪除`, 'success');
      await loadFiles(); // Reload files after successful deletion
    } catch (error) {
      console.error('Delete failed:', error);
      showMessage(`刪除失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 'error');
    }
  }, [showMessage, loadFiles]);

  // Delete all files
  const handleClearAll = useCallback(async (): Promise<void> => {
    if (files.length === 0) {
      showMessage('沒有檔案需要刪除', 'error');
      return;
    }

    try {
      await apiClient.clearAllFiles();
      showMessage('所有檔案已清除', 'success');
      await loadFiles(); // Reload files after successful clear
    } catch (error) {
      console.error('Clear all failed:', error);
      showMessage(`清除失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 'error');
    }
  }, [files.length, showMessage, loadFiles]);

  // Sync files from Gemini API to database
  const handleSync = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await apiClient.syncFiles();
      showMessage(
        `同步完成: ${result.synced} 個新增, ${result.skipped} 個跳過${result.errors ? `, ${result.errors} 個失敗` : ''}`,
        result.errors > 0 ? 'error' : 'success'
      );
      await loadFiles(); // Reload files after sync
      await refreshHealth(); // Update health stats
    } catch (error) {
      console.error('Sync failed:', error);
      showMessage(`同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showMessage, loadFiles, refreshHealth]);

  // Handle drag and drop
  const handleDrop = useCallback(async (event: React.DragEvent<HTMLElement>): Promise<void> => {
    event.preventDefault();
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length === 0) {
      showMessage('沒有檔案被拖放', 'error');
      return;
    }

    await handleMultipleUpload(droppedFiles);
  }, [handleMultipleUpload, showMessage]);

  // Prevent default drag over
  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>): void => {
    event.preventDefault();
  }, []);

  // Programmatically trigger file selection
  const triggerFileSelect = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Get file statistics
  const fileStats = useMemo(() => {
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || file.size || 0), 0);
    const processingFiles = files.filter(f => f.state.toLowerCase() === 'processing').length;
    const readyFiles = files.filter(f => f.state.toLowerCase() === 'active').length;
    const errorFiles = files.filter(f => f.state.toLowerCase() === 'failed').length;

    return {
      totalFiles,
      totalSize,
      processingFiles,
      readyFiles,
      errorFiles,
    };
  }, [files]);

  // Memoized return value
  return useMemo(() => ({
    files,
    isLoading,
    uploadProgress,
    message,
    handleUpload,
    handleMultipleUpload,
    handleDelete,
    handleClearAll,
    handleSync,
    loadFiles,
    handleDrop,
    handleDragOver,
    triggerFileSelect,
    fileInputRef,
    fileStats,
  }), [
    files,
    isLoading,
    uploadProgress,
    message,
    handleUpload,
    handleMultipleUpload,
    handleDelete,
    handleClearAll,
    handleSync,
    loadFiles,
    handleDrop,
    handleDragOver,
    triggerFileSelect,
    fileStats,
  ]);
}