// Query History Hook - Manages Query History Logic and Pagination

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { UseQueryHistoryReturn, HistoryItem } from '../types';
import { apiClient } from '../services/api';
import { validatePagination } from '../utils/validation';
import { HISTORY_PAGE_SIZE } from '../constants';

export function useQueryHistory(): UseQueryHistoryReturn {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load history with pagination
  const loadHistory = useCallback(async (): Promise<void> => {
    // Validate pagination parameters
    const validation = validatePagination(currentPage, HISTORY_PAGE_SIZE);
    if (!validation.isValid) {
      console.error('Invalid pagination parameters:', validation.errors);
      setError(validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getQueryHistory({
        page: currentPage,
        page_size: HISTORY_PAGE_SIZE,
        order: 'desc'
      });
      
      setHistory(data.history || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / HISTORY_PAGE_SIZE));
      
    } catch (error) {
      console.error('Failed to load query history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load history');
      setHistory([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Load history when page changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Set current page with validation
  const setCurrentPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPageState(page);
    }
  }, [totalPages, currentPage]);

  // Navigation functions
  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(Math.max(1, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const goToNextPage = useCallback(() => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, setCurrentPage]);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages, setCurrentPage]);

  // Calculate statistics for current page
  const pageStats = useMemo(() => {
    const recordsOnCurrentPage = history.length;
    const totalTokensOnPage = history
      .filter(item => item.total_tokens !== null)
      .reduce((sum, item) => sum + (item.total_tokens || 0), 0);
    const successfulOnPage = history.filter(item => item.success).length;
    const successRate = recordsOnCurrentPage > 0 
      ? (successfulOnPage / recordsOnCurrentPage) * 100 
      : 0;

    return {
      recordsOnCurrentPage,
      totalTokensOnPage,
      successfulOnPage,
      successRate,
    };
  }, [history]);

  // Get overall statistics (could be moved to separate hook if needed)
  const overallStats = useMemo(() => {
    // These would ideally come from the API, but we can calculate from current data
    return {
      totalRecords: total,
      currentPageRange: {
        start: ((currentPage - 1) * HISTORY_PAGE_SIZE) + 1,
        end: Math.min(currentPage * HISTORY_PAGE_SIZE, total)
      }
    };
  }, [total, currentPage]);

  // Refresh history (useful for manual refresh)
  const refreshHistory = useCallback(async (): Promise<void> => {
    await loadHistory();
  }, [loadHistory]);

  // Search within history (basic client-side search)
  const searchHistory = useCallback((searchTerm: string): HistoryItem[] => {
    if (!searchTerm.trim()) return history;
    
    const term = searchTerm.toLowerCase();
    return history.filter(item => 
      item.query.toLowerCase().includes(term) ||
      item.response.toLowerCase().includes(term) ||
      item.model_used.toLowerCase().includes(term)
    );
  }, [history]);

  // Export history data (for potential download functionality)
  const exportHistory = useCallback((): string => {
    const headers = [
      'Time',
      'Query',
      'Response',
      'Model',
      'Files Used',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Success'
    ];
    
    const rows = history.map(item => [
      new Date(item.created_at).toLocaleString(),
      `"${item.query.replace(/"/g, '""')}"`, // Escape quotes for CSV
      `"${item.response.replace(/"/g, '""')}"`,
      item.model_used,
      item.files_used,
      item.prompt_tokens || 0,
      item.completion_tokens || 0,
      item.total_tokens || 0,
      item.success ? 'Yes' : 'No'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }, [history]);

  // Memoized return value
  return useMemo(() => ({
    history,
    isLoading,
    currentPage,
    totalPages,
    total,
    error,
    setCurrentPage,
    loadHistory,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    pageStats,
    overallStats,
    refreshHistory,
    searchHistory,
    exportHistory,
  }), [
    history,
    isLoading,
    currentPage,
    totalPages,
    total,
    error,
    setCurrentPage,
    loadHistory,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    pageStats,
    overallStats,
    refreshHistory,
    searchHistory,
    exportHistory,
  ]);
}