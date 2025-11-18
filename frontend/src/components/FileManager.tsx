// Enhanced File Manager Component with TypeScript and Hooks

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  FiUpload, FiFile, FiTrash2, FiRefreshCw,
  FiSearch, FiFolderPlus,
  FiDownload, FiEye, FiFilter, FiClock, FiFileText, FiDatabase, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

import { useFileManager } from '../hooks/useFileManager';
import { Button, Card, LoadingSpinner, EmptyState } from './common';
import { ACCEPTED_FILE_TYPES } from '../constants';
import { FileSizeFormatter, DateFormatter } from '../utils/formatters';
import { validateFiles } from '../utils/validation';
import type { FileInfo } from '../types';

import './FileManager.css';

type SortBy = 'name' | 'size' | 'created_at' | 'type';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export function FileManager() {
  // Hooks
  const {
    files,
    isLoading,
    uploadProgress,
    handleMultipleUpload,
    handleDelete,
    handleSync,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Load and sync files on component mount
  useEffect(() => {
    const initializeFiles = async () => {
      await handleSync(); // Sync first to ensure DB is up-to-date
    };
    initializeFiles();
  }, [handleSync]);

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
          comparison = (a.size_bytes || a.size || 0) - (b.size_bytes || b.size || 0);
          break;
        case 'created_at':
          comparison = new Date(a.create_time || a.created_at || 0).getTime() - new Date(b.create_time || b.created_at || 0).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFiles.length / ITEMS_PER_PAGE);
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedFiles.slice(startIndex, endIndex);
  }, [filteredAndSortedFiles, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || file.size || 0), 0);

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
      showMessage('檔案上傳成功', 'success');
    } catch (error) {
      showMessage('檔案上傳失敗', 'error');
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
    setIsDragOver(false);
    dragCounterRef.current = 0;

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
      showMessage('檔案上傳成功', 'success');
    } catch (error) {
      showMessage('檔案上傳失敗', 'error');
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

      {/* File Table */}
      <div className="file-table-container">
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
            <div className="table-wrapper">
              <table className="file-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedFiles.size === paginatedFiles.length && paginatedFiles.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="name-column" onClick={() => handleSortChange('name')}>
                      檔案名稱 {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="status-column" onClick={() => handleSortChange('type')}>
                      狀態 {sortBy === 'type' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="size-column" onClick={() => handleSortChange('size')}>
                      大小 {sortBy === 'size' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="date-column" onClick={() => handleSortChange('created_at')}>
                      上傳時間 {sortBy === 'created_at' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="actions-column">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFiles.map((file: FileInfo) => (
                    <tr key={file.name}>
                      <td className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.name)}
                          onChange={() => toggleFileSelection(file.name)}
                        />
                      </td>
                      <td className="name-column">
                        <div className="file-name-with-icon">
                          {getFileIcon(file.name)}
                          <span title={file.display_name}>{file.display_name}</span>
                        </div>
                      </td>
                      <td className="status-column">
                        <span className={`status-badge ${file.state.toLowerCase()}`}>
                          {file.state === 'ACTIVE' ? (
                            <><FiCheckCircle /> 啟用中</>
                          ) : file.state === 'PROCESSING' ? (
                            <><FiRefreshCw /> 處理中</>
                          ) : (
                            <><FiAlertCircle /> {file.state}</>
                          )}
                        </span>
                      </td>
                      <td className="size-column">
                        {FileSizeFormatter.format(file.size_bytes || file.size || 0)}
                      </td>
                      <td className="date-column">
                        {DateFormatter.toLocaleDateTimeString(file.create_time || file.created_at || '')}
                      </td>
                      <td className="actions-column">
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDelete(file.name)}
                          aria-label="刪除檔案"
                        >
                          <FiTrash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft /> 上一頁
                </Button>
                
                <div className="pagination-info">
                  <span>第 {currentPage} 頁，共 {totalPages} 頁</span>
                  <span className="pagination-count">
                    顯示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedFiles.length)} / 共 {filteredAndSortedFiles.length} 筆
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一頁 <FiChevronRight />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}