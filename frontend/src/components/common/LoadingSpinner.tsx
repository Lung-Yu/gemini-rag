// Loading Spinner Component with TypeScript

import type { LoadingSpinnerProps } from '../../types';

export function LoadingSpinner({ 
  size = 'medium', 
  text = '', 
  className = '' 
}: LoadingSpinnerProps) {
  const spinnerClasses = [
    'spinner',
    size !== 'medium' && `spinner--${size}`,
    className
  ].filter(Boolean).join(' ');

  if (text) {
    return (
      <div className="loading">
        <div className={spinnerClasses} />
        <span>{text}</span>
      </div>
    );
  }

  return <div className={spinnerClasses} />;
}