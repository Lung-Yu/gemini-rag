// Stats Panel Component

import React, { useState, useCallback } from 'react';
import {
  FiBarChart, FiTrendingUp, FiActivity,
  FiRefreshCw, FiMessageSquare, FiFile, FiCpu, FiZap
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

import { useStats } from '../hooks/useStats';
import { Button, Card, LoadingSpinner, EmptyState } from './common';

import './StatsPanel.css';

export function StatsPanel() {
  const { stats, isLoading, refreshStats } = useStats();
  const [activeTab, setActiveTab] = useState<'overview' | 'usage'>('overview');

  const handleRefresh = useCallback(async () => {
    await refreshStats();
  }, [refreshStats]);

  if (isLoading && !stats) {
    return (
      <div className="stats-panel">
        <LoadingSpinner text="載入統計資料..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-panel">
        <EmptyState
          icon={<FiBarChart />}
          title="無法載入統計資料"
          description="請稍後再試"
          action={
            <Button variant="primary" onClick={handleRefresh}>
              <FiRefreshCw /> 重新載入
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <div className="header-left">
          <h2><FiBarChart /> 統計資料</h2>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={handleRefresh}>
            <FiRefreshCw /> 重新整理
          </Button>
        </div>
      </div>

      <div className="stats-content">
        <div className="stat-cards">
          <Card className="stat-card">
            <FiMessageSquare className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">總查詢數</div>
              <div className="stat-value">{stats.total_queries.toLocaleString()}</div>
            </div>
          </Card>

          <Card className="stat-card">
            <FiActivity className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">成功查詢</div>
              <div className="stat-value">{stats.successful_queries.toLocaleString()}</div>
            </div>
          </Card>

          <Card className="stat-card">
            <FiTrendingUp className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">成功率</div>
              <div className="stat-value">{stats.success_rate.toFixed(1)}%</div>
            </div>
          </Card>

          <Card className="stat-card">
            <FiFile className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">平均使用檔案</div>
              <div className="stat-value">{stats.avg_files_used.toFixed(1)}</div>
            </div>
          </Card>

          <Card className="stat-card">
            <FiCpu className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">Token 使用量</div>
              <div className="stat-value">{stats.total_tokens_used?.toLocaleString() || '0'}</div>
            </div>
          </Card>

          <Card className="stat-card">
            <FiZap className="stat-icon" />
            <div className="stat-info">
              <div className="stat-label">平均 Token</div>
              <div className="stat-value">{stats.avg_tokens_per_query?.toFixed(0) || '0'}</div>
            </div>
          </Card>
        </div>

        <div className="stats-tabs">
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('overview')}
          >
            總覽
          </Button>
          <Button
            variant={activeTab === 'usage' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('usage')}
          >
            使用情況
          </Button>
        </div>

        {activeTab === 'overview' && (
          <Card className="chart-card">
            <h3><FaRobot /> 模型使用統計</h3>
            <div className="model-stats">
              {Object.entries(stats.model_usage).map(([model, count]) => (
                <div key={model} className="model-item">
                  <span className="model-name">{model}</span>
                  <div className="model-bar">
                    <div 
                      className="model-bar-fill"
                      style={{ width: `${(count / stats.total_queries) * 100}%` }}
                    />
                  </div>
                  <span className="model-count">{count} 次</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'usage' && (
          <Card className="chart-card">
            <h3><FiMessageSquare /> 使用詳情</h3>
            <div className="usage-details">
              <div className="usage-item">
                <span className="usage-label">總查詢數:</span>
                <span className="usage-value">{stats.total_queries}</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">成功查詢:</span>
                <span className="usage-value">{stats.successful_queries}</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">成功率:</span>
                <span className="usage-value">{stats.success_rate.toFixed(2)}%</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">平均使用檔案數:</span>
                <span className="usage-value">{stats.avg_files_used.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
