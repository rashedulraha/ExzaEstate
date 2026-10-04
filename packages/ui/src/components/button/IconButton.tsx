import React from 'react';
import type { ButtonVariant, ButtonSize } from './Button.js';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  'aria-label': string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-action text-on-action hover:opacity-90 active:opacity-95 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
  secondary:
    'bg-surface text-text border border-border-input hover:bg-surface-sunken active:bg-surface-sunken/80 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-text hover:bg-surface-sunken active:bg-surface-sunken/80 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
  destructive:
    'bg-danger text-white hover:opacity-90 active:opacity-95 focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2',
  accent:
    'bg-accent text-white hover:opacity-90 active:opacity-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', icon, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-button transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
