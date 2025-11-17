// Button Component - Reusable Button with TypeScript and Variants

import { forwardRef } from 'react';
import type { ButtonProps } from '../../types';
import { FiLoader } from 'react-icons/fi';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'btn';
  const variantClasses = `btn--${variant}`;
  const sizeClasses = size !== 'medium' ? `btn--${size}` : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className
  ].filter(Boolean).join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={isDisabled}
      {...props}
    >
      {loading && <FiLoader className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';