// Error Boundary Component - Catches JavaScript errors in component tree

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="card" style={{ margin: '20px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', color: 'var(--color-error)', marginBottom: '16px' }}>
            <FiAlertTriangle />
          </div>
          <h2 style={{ color: 'var(--color-error)', marginBottom: '12px' }}>
            發生了一個錯誤
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            抱歉，這個部分出現了問題。請嘗試重新載入或聯繫技術支援。
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              textAlign: 'left', 
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-base)',
              border: '1px solid var(--color-border)'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                錯誤詳情（開發模式）
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: '12px',
                color: 'var(--color-error)',
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleReset}
            className="btn btn--primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiRefreshCw />
            重新嘗試
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}