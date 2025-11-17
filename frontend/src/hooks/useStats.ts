// Statistics Hook - Manages Statistics Data and Calculations

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { UseStatsReturn, Statistics } from '../types';
import { apiClient } from '../services/api';

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load statistics
  const loadStats = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getStatistics();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadStats();
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadStats, isLoading]);

  // Enhanced statistics calculations
  const enhancedStats = useMemo(() => {
    if (!stats) return null;

    // Model usage calculations
    const modelUsageArray = Object.entries(stats.model_usage || {})
      .map(([model, count]) => ({
        model,
        count,
        percentage: stats.total_queries > 0 ? (count / stats.total_queries * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Most popular model
    const mostPopularModel = modelUsageArray[0];

    // Performance metrics
    const failureRate = 100 - stats.success_rate;
    const avgTokensPerSuccessfulQuery = stats.successful_queries > 0 
      ? (stats.total_tokens_used || 0) / stats.successful_queries 
      : 0;

    // Usage trends (would need historical data from API)
    const usageLevel = (() => {
      if (stats.total_queries === 0) return 'none';
      if (stats.total_queries < 10) return 'low';
      if (stats.total_queries < 50) return 'medium';
      return 'high';
    })();

    // Cost estimation (example calculation)
    const estimatedCost = (stats.total_tokens_used || 0) * 0.000002; // $0.002 per 1K tokens

    return {
      ...stats,
      modelUsageArray,
      mostPopularModel,
      failureRate,
      avgTokensPerSuccessfulQuery,
      usageLevel,
      estimatedCost,
    };
  }, [stats]);

  // Get formatted statistics for display
  const formattedStats = useMemo(() => {
    if (!enhancedStats) return null;

    return {
      totalQueries: enhancedStats.total_queries.toLocaleString(),
      successfulQueries: enhancedStats.successful_queries.toLocaleString(),
      successRate: `${enhancedStats.success_rate.toFixed(1)}%`,
      failureRate: `${enhancedStats.failureRate.toFixed(1)}%`,
      avgFilesUsed: enhancedStats.avg_files_used.toFixed(1),
      totalTokens: enhancedStats.total_tokens_used?.toLocaleString() || 'N/A',
      avgTokensPerQuery: enhancedStats.avg_tokens_per_query?.toFixed(0) || 'N/A',
      avgTokensPerSuccessfulQuery: enhancedStats.avgTokensPerSuccessfulQuery.toFixed(0),
      estimatedCost: `$${enhancedStats.estimatedCost.toFixed(4)}`,
      mostPopularModel: enhancedStats.mostPopularModel?.model || 'N/A',
      lastUpdated: lastUpdated?.toLocaleString() || 'Never',
    };
  }, [enhancedStats, lastUpdated]);

  // Get statistics summary for quick overview
  const statsSummary = useMemo(() => {
    if (!enhancedStats) return null;

    const summary = [];
    
    if (enhancedStats.total_queries === 0) {
      summary.push('尚無查詢記錄');
    } else {
      summary.push(`總計 ${enhancedStats.total_queries} 次查詢`);
      
      if (enhancedStats.success_rate >= 95) {
        summary.push('系統運行穩定');
      } else if (enhancedStats.success_rate >= 80) {
        summary.push('系統運行良好');
      } else {
        summary.push('系統可能需要檢查');
      }
      
      if (enhancedStats.mostPopularModel) {
        summary.push(`主要使用 ${enhancedStats.mostPopularModel.model}`);
      }
    }

    return summary;
  }, [enhancedStats]);

  // Refresh statistics
  const refreshStats = useCallback(async (): Promise<void> => {
    await loadStats();
  }, [loadStats]);

  // Check if statistics are stale (older than 10 minutes)
  const isStale = useMemo(() => {
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated.getTime() > 600000; // 10 minutes
  }, [lastUpdated]);

  // Export statistics data
  const exportStats = useCallback((): string => {
    if (!enhancedStats) return '';

    const data = {
      'Statistics Export': {
        'Generated At': new Date().toISOString(),
        'Total Queries': enhancedStats.total_queries,
        'Successful Queries': enhancedStats.successful_queries,
        'Success Rate': `${enhancedStats.success_rate.toFixed(2)}%`,
        'Average Files Used': enhancedStats.avg_files_used.toFixed(2),
        'Total Tokens Used': enhancedStats.total_tokens_used || 0,
        'Average Tokens per Query': enhancedStats.avg_tokens_per_query || 0,
        'Most Popular Model': enhancedStats.mostPopularModel?.model || 'N/A',
        'Estimated Cost': `$${enhancedStats.estimatedCost.toFixed(4)}`,
      },
      'Model Usage': enhancedStats.model_usage
    };

    return JSON.stringify(data, null, 2);
  }, [enhancedStats]);

  // Memoized return value
  return useMemo(() => ({
    stats,
    enhancedStats,
    formattedStats,
    statsSummary,
    isLoading,
    error,
    lastUpdated,
    isStale,
    loadStats,
    refreshStats,
    exportStats,
  }), [
    stats,
    enhancedStats,
    formattedStats,
    statsSummary,
    isLoading,
    error,
    lastUpdated,
    isStale,
    loadStats,
    refreshStats,
    exportStats,
  ]);
}