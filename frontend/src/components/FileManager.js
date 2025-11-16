import React, { useState, useEffect } from 'react';
import './FileManager.css';
import { listFiles, uploadFile, deleteFile, clearAllFiles } from '../services/api';

function FileManager({ onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const data = await listFiles();
      setFiles(data.files);
      onFilesChange && onFilesChange();
    } catch (error) {
      showMessage('載入檔案列表失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadProgress(file.name);
    try {
      await uploadFile(file);
      showMessage(`✓ ${file.name} 上傳成功`, 'success');
      loadFiles();
    } catch (error) {
      showMessage(`✗ ${file.name} 上傳失敗`, 'error');
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileName) => {
    if (!window.confirm(`確定要刪除 ${fileName} 嗎？`)) return;

    try {
      await deleteFile(fileName);
      showMessage(`✓ ${fileName} 已刪除`, 'success');
      loadFiles();
    } catch (error) {
      showMessage(`✗ 刪除失敗`, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('確定要刪除所有檔案嗎？此操作無法復原！')) return;

    try {
      await clearAllFiles();
      showMessage('✓ 所有檔案已清除', 'success');
      loadFiles();
    } catch (error) {
      showMessage('✗ 清除失敗', 'error');
    }
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2>📁 檔案管理</h2>
        <div className="actions">
          <label className="upload-btn">
            <input
              type="file"
              onChange={handleUpload}
              accept=".txt,.pdf,.doc,.docx"
              disabled={!!uploadProgress}
            />
            ➕ 上傳檔案
          </label>
          {files.length > 0 && (
            <button
              className="clear-btn"
              onClick={handleClearAll}
              disabled={isLoading}
            >
              🗑️ 清除全部
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      {uploadProgress && (
        <div className="upload-progress">
          <div className="spinner"></div>
          <span>正在上傳 {uploadProgress}...</span>
        </div>
      )}

      <div className="files-list">
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>載入中...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <p>📂 尚無已上傳的檔案</p>
            <p className="hint">點擊「上傳檔案」開始使用</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.name} className="file-item">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{file.display_name}</div>
                <div className="file-meta">
                  <span className={`status ${file.state.toLowerCase()}`}>
                    {file.state}
                  </span>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={() => handleDelete(file.name)}
                title="刪除檔案"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FileManager;
