import React, { useState, useEffect } from 'react';
import './QueryHistory.css';
import { getQueryHistory } from '../services/api';
import {
  FiBook,
  FiRefreshCw,
  FiInbox,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronsLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsRight
} from 'react-icons/fi';

function QueryHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadHistory();
  }, [currentPage]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getQueryHistory(currentPage, pageSize, 'desc');
      setHistory(data.history || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (error) {
      console.error('載入查詢歷史失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="query-history">
        <div className="history-loading">
          <div className="spinner"></div>
          <p>載入查詢歷史中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="query-history">
      <div className="history-header">
        <h2>
          <FiBook aria-hidden /> 查詢歷史記錄
        </h2>
        <div className="history-info">
          <span>總計 {total} 筆記錄</span>
          <button 
            onClick={loadHistory} 
            className="refresh-btn" 
            title="重新整理"
            aria-label="重新整理查詢記錄"
          >
            <FiRefreshCw aria-hidden />
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <p>
            <FiInbox aria-hidden /> 尚無查詢記錄
          </p>
        </div>
      ) : (
        <>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>查詢內容</th>
                  <th>模型</th>
                  <th>檔案數</th>
                  <th>輸入 Tokens</th>
                  <th>輸出 Tokens</th>
                  <th>總 Tokens</th>
                  <th>回應長度</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className={!item.success ? 'error-row' : ''}>
                    <td className="time-cell">{formatDate(item.created_at)}</td>
                    <td className="query-cell" title={item.query}>
                      {truncateText(item.query, 80)}
                    </td>
                    <td className="model-cell">{item.model_used}</td>
                    <td className="center-cell">{item.files_used}</td>
                    <td className="center-cell token-cell">
                      {item.prompt_tokens !== null ? item.prompt_tokens.toLocaleString() : '-'}
                    </td>
                    <td className="center-cell token-cell">
                      {item.completion_tokens !== null ? item.completion_tokens.toLocaleString() : '-'}
                    </td>
                    <td className="center-cell token-cell highlight">
                      {item.total_tokens !== null ? item.total_tokens.toLocaleString() : '-'}
                    </td>
                    <td className="center-cell">
                      {item.response_length !== null ? item.response_length.toLocaleString() : '-'}
                    </td>
                    <td className="center-cell">
                      {item.success ? (
                        <span className="status-success">
                          <FiCheckCircle aria-hidden /> 成功
                        </span>
                      ) : (
                        <span className="status-error" title={item.error_message}>
                          <FiAlertCircle aria-hidden /> 失敗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="page-btn"
              >
                <FiChevronsLeft aria-hidden /> 首頁
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="page-btn"
              >
                <FiChevronLeft aria-hidden /> 上一頁
              </button>
              <span className="page-info">
                第 {currentPage} / {totalPages} 頁
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                下一頁 <FiChevronRight aria-hidden />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                末頁 <FiChevronsRight aria-hidden />
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="history-summary">
            <div className="summary-item">
              <span className="summary-label">本頁記錄:</span>
              <span className="summary-value">{history.length} 筆</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">本頁總 Tokens:</span>
              <span className="summary-value">
                {history
                  .filter(item => item.total_tokens !== null)
                  .reduce((sum, item) => sum + item.total_tokens, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">成功率:</span>
              <span className="summary-value">
                {history.length > 0
                  ? ((history.filter(item => item.success).length / history.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default QueryHistory;
