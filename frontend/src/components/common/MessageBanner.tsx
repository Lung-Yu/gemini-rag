// Message Banner Component - Shows success/error messages

import { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

interface MessageBannerProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

export function MessageBanner({
  message,
  type = 'info',
  onClose,
  autoClose = false,
  duration = 3000,
  className = ''
}: MessageBannerProps) {
  const icons = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    warning: FiAlertTriangle,
    info: FiInfo,
  };

  const Icon = icons[type];

  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoClose, onClose, duration]);

  return (
    <div className={`message-banner ${type} ${className}`}>
      <Icon aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}