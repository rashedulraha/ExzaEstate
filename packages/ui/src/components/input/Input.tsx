import React from 'react';

export type InputSize = 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  isError?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

function resolveInputClasses(
  inputSize: InputSize,
  isError: boolean,
  hasPrefix: boolean,
  hasSuffix: boolean,
  customClass: string,
): string {
  const heightClass = inputSize === 'lg' ? 'h-10' : 'h-9';
  const borderClass = isError
    ? 'border-danger focus-visible:ring-danger'
    : 'border-border-input focus-visible:ring-focus';
  const padLeft = hasPrefix ? 'pl-9' : 'pl-3';
  const padRight = hasSuffix ? 'pr-9' : 'pr-3';

  return `w-full bg-surface text-text rounded-button border text-body transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:bg-surface-sunken disabled:cursor-not-allowed ${heightClass} ${borderClass} ${padLeft} ${padRight} ${customClass}`.trim();
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = 'lg',
      isError = false,
      prefixIcon,
      suffixIcon,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    const inputClass = resolveInputClasses(
      inputSize,
      isError,
      Boolean(prefixIcon),
      Boolean(suffixIcon),
      className,
    );

    return (
      <div className={`relative flex items-center w-full ${disabled ? 'opacity-50' : ''}`}>
        {prefixIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
            {prefixIcon}
          </div>
        )}
        <input ref={ref} disabled={disabled} className={inputClass} {...props} />
        {suffixIcon && (
          <div className="absolute right-3 flex items-center text-text-muted">{suffixIcon}</div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
