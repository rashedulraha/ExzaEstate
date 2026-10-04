import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  sm: 'h-8 px-3 text-btn gap-1.5',
  md: 'h-9 px-4 text-btn gap-2',
  lg: 'h-10 px-5 text-btn gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium rounded-button transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
