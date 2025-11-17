// Enhanced Query History Component with TypeScript and Hooks

import React, { useState, useCallback, useMemo } from 'react';
import {
  FiClock, FiSearch, FiTrash2, FiMessageSquare, 
  FiFilter, FiCalendar, FiDownload, FiRefreshCw, FiX, 
  FiChevronLeft, FiChevronRight, FiMoreVertical, FiEye,
  FiShare2, FiBookmark, FiTag, FiUser
} from 'react-icons/fi';
import { FaRobot, FaHistory } from 'react-icons/fa';

import { useQueryHistory } from '../hooks/useQueryHistory';
import { Button, Card, LoadingSpinner, EmptyState, TabPanel } from './common';
import { DateFormatter } from '../utils/formatters';
import type { HistoryItem } from '../types';

import './QueryHistory.css';

type SortBy = 'timestamp' | 'query' | 'model';
type SortOrder = 'asc' | 'desc';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export function QueryHistory() {
  // Hooks
  const {
    history,
    isLoading,
    currentPage,
    totalPages,
    total,
    setCurrentPage,
    loadHistory,
    searchHistory,
    exportHistory,
  } = useQueryHistory();


  // Local state
  const [selectedQueries, setSelectedQueries] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    console.log(`[${type}] ${text}`);
  }, []);
  // Filtered and sorted history
  const filteredQueries = useMemo(() => {
    // Apply search filter first
    let filtered = searchTerm ? searchHistory(searchTerm) : [...history];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(q => new Date(q.created_at) >= filterDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'query':
          comparison = a.query.localeCompare(b.query);
          break;
        case 'model':
          comparison = a.model_used.localeCompare(b.model_used);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [history, timeFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const modelCount = history.reduce((acc, q) => {
      acc[q.model_used] = (acc[q.model_used] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalQueries: history.length,
      modelsUsed: Object.keys(modelCount).length,
      mostUsedModel: Object.entries(modelCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
      avgResponseTime: '0.0'
    };
  }, [history]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Handle time filter change
  const handleTimeFilterChange = useCallback((filter: TimeFilter) => {
    setTimeFilter(filter);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  // Handle query selection
  const toggleQuerySelection = useCallback((queryId: number) => {
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queryId)) {
        newSet.delete(queryId);
      } else {
        newSet.add(queryId);
      }
      return newSet;
    });
  }, []);

  // Select all history
  const handleSelectAll = useCallback(() => {
    if (selectedQueries.size === filteredQueries.length) {
      setSelectedQueries(new Set());
    } else {
      setSelectedQueries(new Set(filteredQueries.map(q => q.id)));
    }
  }, [selectedQueries.size, filteredQueries]);

  // Delete selected history (not implemented in API yet)
  const handleDeleteSelected = useCallback(async () => {
    showMessage('刪除功能尚未實現', 'error');
  }, [showMessage]);

  // Clear all history (not implemented in API yet)
  const handleClearAll = useCallback(async () => {
    showMessage('清除功能尚未實現', 'error');
    setSelectedQueries(new Set());
  }, [showMessage]);

  // Export history
  const handleExport = useCallback(async () => {
    try {
      await exportHistory();
      showMessage('查詢記錄匯出成功', 'success');
    } catch (error) {
      showMessage('查詢記錄匯出失敗', 'error');
    }
  }, [exportHistory, showMessage]);

  // Expand/collapse query
  const toggleQueryExpansion = useCallback((queryId: number) => {
    setExpandedQuery(prev => prev === queryId ? null : queryId);
  }, []);

  // Pagination info
  const startIndex = (currentPage - 1) * 20 + 1;
  const endIndex = Math.min(currentPage * 20, total);

  return (
    <div className="query-history">
      {/* Header */}
      <div className="query-history-header">
        <div className="header-left">
          <h2><FaHistory /> 查詢記錄</h2>
          <div className="stats-summary">
            <span><FiMessageSquare /> {stats.totalQueries} 次查詢</span>
            <span><FaRobot /> {stats.modelsUsed} 個模型</span>
            <span><FiClock /> 平均 {stats.avgResponseTime}s</span>
          </div>
        </div>

        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="切換篩選器"
          >
            <FiFilter /> 篩選
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={history.length === 0}
            title="匯出查詢記錄"
          >
            <FiDownload /> 匯出
          </Button>
          
          <Button
            variant="danger"
            onClick={handleClearAll}
            disabled={history.length === 0}
            title="清除所有記錄"
          >
            <FiTrash2 /> 清除全部
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="filters-panel">
          <div className="filters-header">
            <h3><FiFilter /> 篩選與排序</h3>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowFilters(false)}
            >
              <FiX />
            </Button>
          </div>

          <div className="filters-content">
            <div className="filter-group">
              <label>時間範圍：</label>
              <div className="filter-tabs">
                {(['all', 'today', 'week', 'month'] as TimeFilter[]).map(filter => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => handleTimeFilterChange(filter)}
                  >
                    {filter === 'all' && '全部'}
                    {filter === 'today' && '今天'}
                    {filter === 'week' && '本週'}
                    {filter === 'month' && '本月'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>排序方式：</label>
              <div className="sort-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="form-select"
                >
                  <option value="timestamp">時間</option>
                  <option value="query">查詢內容</option>
                  <option value="model">使用模型</option>
                </select>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  title={`${sortOrder === 'desc' ? '降序' : '升序'}排列`}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Controls */}
      <div className="query-controls">
        <div className="search-input">
          <FiSearch />
          <input
            type="text"
            placeholder="搜尋查詢記錄..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="bulk-actions">
          {selectedQueries.size > 0 && (
            <>
              <span className="selection-count">
                已選擇 {selectedQueries.size} 個記錄
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
          
          {filteredQueries.length > 0 && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedQueries.size === filteredQueries.length ? '取消全選' : '全選'}
            </Button>
          )}
        </div>
      </div>

      {/* Query List */}
      <div className="query-list-container">
        {isLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>載入查詢記錄中...</p>
          </div>
        ) : filteredQueries.length === 0 ? (
          <EmptyState
            icon={<FaHistory />}
            title={searchTerm ? "找不到相符的記錄" : "尚無查詢記錄"}
            description={searchTerm ? "請嘗試其他搜尋關鍵字" : "開始使用聊天功能後，查詢記錄將顯示在這裡"}
          />
        ) : (
          <div className="query-list">
            {filteredQueries.map((query: HistoryItem) => (
              <Card key={query.id} className="query-item">
                <div className="query-header">
                  <div className="query-header-left">
                    <input
                      type="checkbox"
                      checked={selectedQueries.has(query.id)}
                      onChange={() => toggleQuerySelection(query.id)}
                    />
                    <div className="query-info">
                      <div className="query-text" title={query.query}>
                        {query.query}
                      </div>
                      <div className="query-meta">
                        <span><FiClock /> {DateFormatter.toLocaleDateTimeString(query.created_at)}</span>
                        <span><FaRobot /> {query.model_used}</span>
                        {query.files_used && query.files_used > 0 && (
                          <span>📁 {query.files_used} 個檔案</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="query-actions">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => toggleQueryExpansion(query.id)}
                      title={expandedQuery === query.id ? '收起' : '展開'}
                    >
                      <FiEye />
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => showMessage('刪除功能尚未實現', 'error')}
                      title="刪除記錄"
                    >
                      <FiTrash2 />
                    </Button>showMessage('刪除功能尚未實現', 'error'
                  </div>
                </div>

                {expandedQuery === query.id && query.response && (
                  <div className="query-expansion">
                    <div className="response-section">
                      <h4><FaRobot /> AI 回應：</h4>
                      <div className="response-text">
                        {query.response}
                      </div>
                      {query.prompt_tokens && query.completion_tokens && (
                        <div className="token-info">
                          <span>輸入 Token: {query.prompt_tokens}</span>
                          <span>輸出 Token: {query.completion_tokens}</span>
                          <span>總計: {query.prompt_tokens + query.completion_tokens}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            顯示第 {startIndex}-{endIndex} 項，共 {total} 項
          </div>
          
          <div className="pagination-controls">
            <Button
              variant="secondary"
              size="small"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
            </Button>
            
            <span className="page-info">
              {currentPage} / {totalPages}
            </span>
            
            <Button
              variant="secondary"
              size="small"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}