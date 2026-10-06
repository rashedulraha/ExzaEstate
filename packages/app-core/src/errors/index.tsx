import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ApiError } from '@exzaestate/api-client';
import { ERROR_CODES, t } from '@exzaestate/shared';
import { ErrorState } from '@exzaestate/ui';

const FALLBACK_ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Please verify the entered details and try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'Your session has expired. Please sign in again.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_CODES.TENANT_MISMATCH]: 'Organization data mismatch occurred.',
  [ERROR_CODES.STEP_UP_REQUIRED]: 'Security verification is required to proceed.',
  [ERROR_CODES.TWO_FACTOR_REQUIRED]:
    'Two-factor authentication enrollment is mandatory for this account.',
  [ERROR_CODES.SELF_APPROVAL_FORBIDDEN]:
    'Maker-checker policy: You cannot approve your own submission.',
  [ERROR_CODES.NOT_FOUND]: 'The requested record was not found.',
  [ERROR_CODES.CONFLICT]: 'The record was modified or already exists.',
  [ERROR_CODES.DUPLICATE_BOOKING]: 'This property is already actively booked.',
  [ERROR_CODES.INVALID_STATE_TRANSITION]: 'This operation is not permitted for the current status.',
  [ERROR_CODES.REQUEST_IN_PROGRESS]: 'An identical request is currently being processed.',
  [ERROR_CODES.APPROVAL_REQUIRED]: 'This action requires higher-tier approval.',
  [ERROR_CODES.IDEMPOTENCY_KEY_REUSED]: 'Request already submitted with different parameters.',
  [ERROR_CODES.JOURNAL_UNBALANCED]: 'Journal entry is unbalanced: debits must equal credits.',
  [ERROR_CODES.PERIOD_CLOSED]: 'Accounting period is closed for postings.',
  [ERROR_CODES.POSTING_RULE_MISSING]: 'No financial posting rule is mapped for this event.',
  [ERROR_CODES.FILE_REJECTED]: 'File upload was rejected due to format or size constraints.',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Account locked due to consecutive failed attempts.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please pause before trying again.',
  [ERROR_CODES.CLIENT_UPGRADE_REQUIRED]: 'A required software update is available.',
  [ERROR_CODES.LICENSE_INVALID]: 'Desktop license validation failed.',
  [ERROR_CODES.LICENSE_EXPIRED]: 'License has expired.',
  [ERROR_CODES.CLOCK_TAMPERED]: 'System clock tampering detected. Writes are locked.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected internal error occurred.',
};

/**
 * Extracts the stable error code from an error object.
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    return error.code;
  }
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Translates an error to a localized message using the `errors.<CODE>` convention.
 */
export function getErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  const translationKey = `errors.${code}`;
  const translated = t(translationKey);

  // If translation was found in the dictionary, use it
  if (translated !== translationKey) {
    return translated;
  }

  // Fallback to our curated domain messages
  if (FALLBACK_ERROR_MESSAGES[code]) {
    return FALLBACK_ERROR_MESSAGES[code]!;
  }

  // Fallback to error message if present
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t('common.error');
}

export function isStepUpRequired(error: unknown): boolean {
  return getErrorCode(error) === ERROR_CODES.STEP_UP_REQUIRED;
}

export function isTwoFactorRequired(error: unknown): boolean {
  return getErrorCode(error) === ERROR_CODES.TWO_FACTOR_REQUIRED;
}

export function isSessionExpired(error: unknown): boolean {
  return getErrorCode(error) === ERROR_CODES.UNAUTHORIZED;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <ErrorState
          title={t('common.error')}
          message={this.state.error.message || getErrorMessage(this.state.error)}
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
