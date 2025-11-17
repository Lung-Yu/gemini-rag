// Card Component - Reusable Card Container with TypeScript

import type { CardProps } from '../../types';

export function Card({ 
  children, 
  className = '', 
  hoverable = false, 
  title 
}: CardProps) {
  const classes = [
    'card',
    hoverable && 'card--hoverable',
    className
  ].filter(Boolean).join(' ');

  if (title) {
    return (
      <div className={classes}>
        <div className="card__header">
          <h3 className="card__title">{title}</h3>
        </div>
        <div className="card__body">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
}