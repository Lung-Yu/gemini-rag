// Enhanced File Manager Component with TypeScript and Hooks

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  FiUpload, FiFile, FiTrash2, FiRefreshCw,
  FiSearch, FiGrid, FiList, FiFolderPlus,
  FiDownload, FiEye, FiFilter, FiClock, FiFileText, FiDatabase
} from 'react-icons/fi';

import { useFileManager } from '../hooks/useFileManager';
import { Button, Card, LoadingSpinner, EmptyState } from './common';
import { ACCEPTED_FILE_TYPES, MESSAGES } from '../constants';
import { FileSizeFormatter, DateFormatter } from '../utils/formatters';
import { validateFiles } from '../utils/validation';
import type { FileInfo } from '../types';

import './FileManager.css';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'size' | 'created_at' | 'type';
type SortOrder = 'asc' | 'desc';

export function FileManager() {
  // Hooks
  const {
    files,
    isLoading,
    uploadProgress,
    handleMultipleUpload,
    handleDelete,
    loadFiles,
    message
  } = useFileManager();

  // Temporary message handler (until proper message system is integrated)
  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    console.log(`[${type.toUpperCase()}]: ${text}`);
    // TODO: Integrate with proper notification system
  }, []);

  // Local state
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUploadArea, setShowUploadArea] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // File filtering and sorting
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = files.filter(file => 
        file.display_name.toLowerCase().includes(term) ||
        file.name.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.display_name.localeCompare(b.display_name);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchTerm, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

    return { totalFiles, totalSize };
  }, [files]);

  // Handle file input change
  const handleFileInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validation = validateFiles(filesArray);

    if (validation.errors.length > 0) {
      showMessage(validation.errors[0], 'error');
      return;
    }

    try {
      await handleMultipleUpload(filesArray);
      showMessage(MESSAGES.FILE_UPLOAD_SUCCESS, 'success');
    } catch (error) {
      showMessage(MESSAGES.FILE_UPLOAD_FAILED, 'error');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleMultipleUpload, showMessage]);

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validation = validateFiles(filesArray);

    if (validation.errors.length > 0) {
      showMessage(validation.errors[0], 'error');
      return;
    }

    try {
      await handleMultipleUpload(filesArray);
      showMessage(MESSAGES.FILE_UPLOAD_SUCCESS, 'success');
    } catch (error) {
      showMessage(MESSAGES.FILE_UPLOAD_FAILED, 'error');
    }
  }, [handleMultipleUpload, showMessage]);

  // Handle file deletion
  const handleDeleteSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const fileNames = Array.from(selectedFiles);
    const confirmMessage = fileNames.length === 1
      ? `確定要刪除檔案 "${fileNames[0]}" 嗎？`
      : `確定要刪除 ${fileNames.length} 個檔案嗎？`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await Promise.all(fileNames.map(fileName => handleDelete(fileName)));
      showMessage('檔案刪除成功', 'success');
      setSelectedFiles(new Set());
    } catch (error) {
      showMessage('檔案刪除失敗', 'error');
    }
  }, [selectedFiles, handleDelete, showMessage]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileName: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  }, []);

  // Select all files
  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.name)));
    }
  }, [selectedFiles.size, filteredAndSortedFiles]);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Handle sync
  const handleSync = useCallback(async () => {
    try {
      await loadFiles();
      showMessage('文件同步成功', 'success');
    } catch (error) {
      showMessage('文件同步失敗', 'error');
    }
  }, [loadFiles, showMessage]);

  // File type icon
  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.includes('text') || fileType.includes('json')) return <FiFileText />;
    return <FiFile />;
  }, []);

  return (
    <div className="file-manager">
      {/* Header */}
      <div className="file-manager-header">
        <div className="header-left">
          <h2><FiFolderPlus /> 檔案管理</h2>
          <div className="stats">
            <span><FiFile /> {stats.totalFiles} 個檔案</span>
            <span><FiDatabase /> {FileSizeFormatter.format(stats.totalSize)}</span>

          </div>
        </div>

        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={() => setShowUploadArea(!showUploadArea)}
            aria-label="切換上傳區域"
          >
            <FiUpload /> 上傳
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleSync}
            loading={isLoading}
            disabled={isLoading}
            title="同步檔案到資料庫"
          >
            {!isLoading && <FiRefreshCw />} 同步
          </Button>

          <Button
            variant="secondary"
            onClick={loadFiles}
            loading={isLoading}
            disabled={isLoading}
            aria-label="重新載入檔案列表"
          >
            {!isLoading && <FiRefreshCw />}
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      {showUploadArea && (
        <Card className="upload-area">
          <div
            className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FiUpload className="upload-icon" />
            <div className="upload-text">
              <p><strong>拖曳檔案到此處或點擊選擇</strong></p>
              <p>支援格式: {ACCEPTED_FILE_TYPES}</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileInputChange}
            className="file-input"
          />

          {uploadProgress !== null && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span>{uploadProgress}%</span>
            </div>
          )}
        </Card>
      )}

      {/* Controls */}
      <div className="file-controls">
        <div className="search-filter">
          <div className="search-input">
            <FiSearch />
            <input
              type="text"
              placeholder="搜尋檔案..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="view-toggle">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setViewMode('grid')}
              aria-label="網格檢視"
            >
              <FiGrid />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setViewMode('list')}
              aria-label="清單檢視"
            >
              <FiList />
            </Button>
          </div>
        </div>

        <div className="bulk-actions">
          {selectedFiles.size > 0 && (
            <>
              <span className="selection-count">
                已選擇 {selectedFiles.size} 個檔案
              </span>
              <Button
                variant="danger"
                size="small"
                onClick={handleDeleteSelected}
              >
                <FiTrash2 /> 刪除選定
              </Button>
            </>
          )}
          
          {filteredAndSortedFiles.length > 0 && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedFiles.size === filteredAndSortedFiles.length ? '取消全選' : '全選'}
            </Button>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="file-list-container">
        {isLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>載入檔案中...</p>
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <EmptyState
            icon={<FiFile />}
            title={searchTerm ? "找不到相符的檔案" : "尚未上傳任何檔案"}
            description={searchTerm ? "請嘗試其他搜尋關鍵字" : "開始上傳檔案以建立知識庫"}
            action={
              !searchTerm && (
                <Button
                  variant="primary"
                  onClick={() => setShowUploadArea(true)}
                >
                  <FiUpload /> 上傳第一個檔案
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Sort Header (for list view) */}
            {viewMode === 'list' && (
              <div className="sort-header">
                <div className="sort-item checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === filteredAndSortedFiles.length}
                    onChange={handleSelectAll}
                  />
                </div>
                <div className="sort-item name-column" onClick={() => handleSortChange('name')}>
                  檔案名稱 {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                </div>
                <div className="sort-item type-column" onClick={() => handleSortChange('type')}>
                  類型 {sortBy === 'type' && (sortOrder === 'desc' ? '↓' : '↑')}
                </div>
                <div className="sort-item size-column" onClick={() => handleSortChange('size')}>
                  大小 {sortBy === 'size' && (sortOrder === 'desc' ? '↓' : '↑')}
                </div>
                <div className="sort-item date-column" onClick={() => handleSortChange('created_at')}>
                  上傳時間 {sortBy === 'created_at' && (sortOrder === 'desc' ? '↓' : '↑')}
                </div>
                <div className="sort-item actions-column">操作</div>
              </div>
            )}

            {/* File Items */}
            <div className={`file-list ${viewMode}`}>
              {filteredAndSortedFiles.map((file: FileInfo) => (
                <div key={file.name} className="file-item">
                  {viewMode === 'grid' ? (
                    <Card className="file-card">
                      <div className="file-card-header">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.name)}
                          onChange={() => toggleFileSelection(file.name)}
                        />
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDelete(file.name)}
                          aria-label="刪除檔案"
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                      <div className="file-icon">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="file-info">
                        <div className="file-name" title={file.display_name}>
                          {file.display_name}
                        </div>
                        <div className="file-meta">
                          <span>{file.name.split(".").pop()}</span>
                          <span>{FileSizeFormatter.format(file.size || 0)}</span>
                        </div>
                        <div className="file-date">
                          {DateFormatter.toLocaleDateTimeString(file.created_at || '')}
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="file-row">
                      <div className="file-cell checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.name)}
                          onChange={() => toggleFileSelection(file.name)}
                        />
                      </div>
                      <div className="file-cell name-column">
                        <div className="file-name-with-icon">
                          {getFileIcon(file.name)}
                          <span title={file.display_name}>{file.display_name}</span>
                        </div>
                      </div>
                      <div className="file-cell type-column">
                        <span className="file-type-badge">{file.name.split(".").pop()}</span>
                      </div>
                      <div className="file-cell size-column">
                        {FileSizeFormatter.format(file.size || 0)}
                      </div>
                      <div className="file-cell date-column">
                        {DateFormatter.toLocaleDateTimeString(file.created_at || '')}
                      </div>
                      <div className="file-cell actions-column">
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDelete(file.name)}
                          aria-label="刪除檔案"
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}