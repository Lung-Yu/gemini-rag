// Empty State Component - Shows when no content is available


import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <FiInbox />,
  title = '暫無資料',
  description = '',
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      {description && (
        <div className="empty-state__description">{description}</div>
      )}
      {action && <div style={{ marginTop: '20px' }}>{action}</div>}
    </div>
  );
}