import React, { useState, useEffect } from 'react';
import './StatsPanel.css';
import { getStatistics } from '../services/api';
import { FaRobot } from 'react-icons/fa';
import {
  FiBarChart2,
  FiRefreshCw,
  FiMessageSquare,
  FiCheckCircle,
  FiFolder,
  FiTarget,
  FiLayers,
  FiPieChart,
  FiInfo,
  FiAlertCircle
} from 'react-icons/fi';

function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await getStatistics();
      setStats(data);
    } catch (error) {
      console.error('載入統計資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="stats-panel">
        <div className="stats-loading">
          <div className="spinner"></div>
          <p>載入統計資料中...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-panel">
        <div className="stats-error">
          <p>
            <FiAlertCircle aria-hidden /> 無法載入統計資料
          </p>
          <button onClick={loadStats} className="retry-btn">重試</button>
        </div>
      </div>
    );
  }

  const modelUsageEntries = Object.entries(stats.model_usage || {});

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h2>
          <FiBarChart2 aria-hidden /> 使用統計
        </h2>
        <button 
          onClick={loadStats} 
          className="refresh-btn" 
          title="重新整理"
          aria-label="重新整理統計資料"
        >
          <FiRefreshCw aria-hidden />
        </button>
      </div>

      <div className="stats-grid">
        {/* Total Queries */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiMessageSquare aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">總查詢次數</div>
            <div className="stat-value">{stats.total_queries}</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiCheckCircle aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">成功率</div>
            <div className="stat-value">{stats.success_rate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Average Files */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiFolder aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">平均使用檔案</div>
            <div className="stat-value">{stats.avg_files_used.toFixed(1)}</div>
          </div>
        </div>

        {/* Successful Queries */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiTarget aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">成功查詢</div>
            <div className="stat-value">{stats.successful_queries}</div>
          </div>
        </div>

        {/* Total Tokens Used */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiLayers aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">總 Token 使用量</div>
            <div className="stat-value">{stats.total_tokens_used?.toLocaleString() || 0}</div>
          </div>
        </div>

        {/* Average Tokens per Query */}
        <div className="stat-card">
          <div className="stat-icon">
            <FiPieChart aria-hidden />
          </div>
          <div className="stat-content">
            <div className="stat-label">平均 Token 數</div>
            <div className="stat-value">{stats.avg_tokens_per_query?.toFixed(0) || 0}</div>
          </div>
        </div>
      </div>

      {/* Model Usage */}
      {modelUsageEntries.length > 0 && (
        <div className="model-usage-section">
          <h3>
            <FaRobot aria-hidden /> 模型使用分布
          </h3>
          <div className="model-usage-list">
            {modelUsageEntries.map(([model, count]) => {
              const percentage = stats.total_queries > 0 
                ? (count / stats.total_queries * 100).toFixed(1) 
                : 0;
              
              return (
                <div key={model} className="model-usage-item">
                  <div className="model-name">{model}</div>
                  <div className="model-bar-container">
                    <div 
                      className="model-bar" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="model-stats">
                    <span className="model-count">{count} 次</span>
                    <span className="model-percentage">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stats-footer">
        <p>
          <FiInfo aria-hidden /> 提示：統計資料會隨著使用而更新
        </p>
      </div>
    </div>
  );
}

export default StatsPanel;
