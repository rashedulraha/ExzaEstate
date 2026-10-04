import React from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

function FormFeedback({
  error,
  helperText,
  errorId,
  helperId,
}: {
  error?: string;
  helperText?: string;
  errorId?: string;
  helperId?: string;
}) {
  if (error) {
    return (
      <p id={errorId} className="text-small text-danger" role="alert">
        {error}
      </p>
    );
  }
  if (helperText) {
    return (
      <p id={helperId} className="text-small text-text-muted">
        {helperText}
      </p>
    );
  }
  return null;
}

function cloneFieldChild(
  children: React.ReactNode,
  id: string,
  describedBy?: string,
  error?: string,
): React.ReactNode {
  if (
    !React.isValidElement<{ id?: string; 'aria-describedby'?: string; isError?: boolean }>(children)
  ) {
    return children;
  }
  const childId = children.props.id || id;
  const childDescribedBy = children.props['aria-describedby'] || describedBy;
  const isError = children.props.isError !== undefined ? children.props.isError : Boolean(error);
  return React.cloneElement(children, {
    id: childId,
    'aria-describedby': childDescribedBy,
    isError,
  });
}

export function FormField({
  id,
  label,
  required = false,
  error,
  helperText,
  className = '',
  children,
}: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  const content = cloneFieldChild(children, id, describedBy, error);

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <label htmlFor={id} className="block text-h4 text-text font-medium">
        {label}
        {required && (
          <span className="text-danger ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {content}
      <FormFeedback error={error} helperText={helperText} errorId={errorId} helperId={helperId} />
    </div>
  );
}
