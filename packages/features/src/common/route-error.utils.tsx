import type { ReactElement } from 'react';
import { isRouteErrorResponse } from 'react-router';
import {
  AlertTriangle,
  ServerCrash,
  WifiOff,
  ShieldAlert,
  Compass,
  RefreshCw,
  Home,
  ArrowLeft,
  LogIn,
} from 'lucide-react';
import { ApiError } from '@exzaestate/api-client';
import { Button } from '@exzaestate/ui';

export type ErrorCategory =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BACKEND_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'FRONTEND_RUNTIME_ERROR';

export interface ClassifiedError {
  category: ErrorCategory;
  title: string;
  badge: {
    label: string;
    variant: 'danger' | 'warning' | 'info' | 'void';
  };
  message: string;
  statusCode?: number;
  details?: string;
  stack?: string;
}

interface StatusErrorMeta {
  category: ErrorCategory;
  title: string;
  badge: {
    label: string;
    variant: 'danger' | 'warning' | 'info' | 'void';
  };
  defaultMessage: string;
}

const KNOWN_STATUS_MAP: Record<number, StatusErrorMeta> = {
  401: {
    category: 'UNAUTHORIZED',
    title: 'Session Expired or Unauthorized',
    badge: { label: 'Auth 401', variant: 'warning' },
    defaultMessage: 'Please sign in again to re-authenticate your session.',
  },
  403: {
    category: 'FORBIDDEN',
    title: 'Access Restricted',
    badge: { label: 'Forbidden 403', variant: 'void' },
    defaultMessage: 'You do not hold the required permissions to perform this action.',
  },
  404: {
    category: 'NOT_FOUND',
    title: 'Resource Not Found',
    badge: { label: 'Route 404', variant: 'info' },
    defaultMessage: 'The requested entity or record could not be found.',
  },
};

const CODE_TO_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

function resolveEffectiveStatus(error: ApiError): number {
  if (error.status && error.status !== 0) {
    return error.status;
  }
  return CODE_TO_STATUS[error.code] ?? (error.code === 'NETWORK_ERROR' ? 0 : 500);
}

export function classifyApiError(error: ApiError): ClassifiedError {
  if (error.code === 'NETWORK_ERROR' || error.status === 0) {
    return {
      category: 'NETWORK_ERROR',
      title: 'Network / Connection Failed',
      badge: { label: 'Server Disconnected', variant: 'danger' },
      message:
        'Unable to connect to the estate server. Please check your internet connection or verify that the server is online.',
      details: error.message,
    };
  }

  const effectiveStatus = resolveEffectiveStatus(error);
  const known = KNOWN_STATUS_MAP[effectiveStatus];

  if (known) {
    return {
      category: known.category,
      title: known.title,
      badge: known.badge,
      message: error.message || known.defaultMessage,
      statusCode: effectiveStatus,
      details: `Error Code: ${error.code}`,
    };
  }

  return {
    category: 'BACKEND_SERVER_ERROR',
    title: 'Backend Server Error',
    badge: { label: effectiveStatus ? `HTTP ${effectiveStatus}` : 'HTTP 500', variant: 'danger' },
    message: error.message || 'An unexpected error occurred while communicating with the server.',
    statusCode: effectiveStatus,
    details:
      typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2),
  };
}

function classifyRouteResponse(
  error: { status: number; statusText?: string; data?: unknown },
  pathname: string,
): ClassifiedError {
  if (error.status === 404) {
    return {
      category: 'NOT_FOUND',
      title: 'Page Not Found',
      badge: { label: 'Route 404', variant: 'info' },
      message: `The page at "${pathname}" could not be located. It may have moved or does not exist.`,
      statusCode: 404,
      details: typeof error.data === 'string' ? error.data : error.statusText,
    };
  }

  const known = KNOWN_STATUS_MAP[error.status];
  if (known) {
    return {
      category: known.category,
      title: known.title,
      badge: known.badge,
      message: known.defaultMessage,
      statusCode: error.status,
      details: typeof error.data === 'string' ? error.data : error.statusText,
    };
  }

  const title =
    error.status >= 500
      ? 'Backend Server Error'
      : `${error.status} - ${error.statusText || 'Navigation Error'}`;

  return {
    category: 'BACKEND_SERVER_ERROR',
    title,
    badge: { label: `HTTP ${error.status}`, variant: 'danger' },
    message:
      typeof error.data === 'string'
        ? error.data
        : 'A router navigation error occurred while loading this route.',
    statusCode: error.status,
    details: typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2),
  };
}

export function classifyError(error: unknown, pathname: string): ClassifiedError {
  // 1. ApiError from @exzaestate/api-client takes precedence
  if (error instanceof ApiError) {
    return classifyApiError(error);
  }

  // 2. React Router error response
  if (isRouteErrorResponse(error)) {
    return classifyRouteResponse(error, pathname);
  }

  // 3. Frontend Runtime JavaScript Error (e.g. TypeError, render exception)
  if (error instanceof Error) {
    return {
      category: 'FRONTEND_RUNTIME_ERROR',
      title: 'Application Runtime Error',
      badge: { label: 'Frontend Client Issue', variant: 'warning' },
      message:
        error.message || 'A frontend component encountered an unexpected error during execution.',
      stack: error.stack,
    };
  }

  // 4. Fallback unknown error
  return {
    category: 'FRONTEND_RUNTIME_ERROR',
    title: 'Unexpected Application Error',
    badge: { label: 'System Notice', variant: 'warning' },
    message: typeof error === 'string' ? error : 'An unexpected error occurred.',
    details: error ? JSON.stringify(error, null, 2) : undefined,
  };
}

export function renderActionButtons(
  category: ClassifiedError['category'],
  navigate: (path: string, options?: { replace?: boolean }) => void,
): ReactElement {
  if (category === 'UNAUTHORIZED') {
    return (
      <Button
        variant="primary"
        size="md"
        leftIcon={<LogIn className="w-4 h-4" />}
        onClick={() => navigate('/auth/login', { replace: true })}
      >
        Sign In to Continue
      </Button>
    );
  }

  if (category === 'NOT_FOUND') {
    return (
      <>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Home className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        leftIcon={<RefreshCw className="w-4 h-4" />}
        onClick={() => window.location.reload()}
      >
        Reload Page
      </Button>
      <Button
        variant="secondary"
        size="md"
        leftIcon={<Home className="w-4 h-4" />}
        onClick={() => navigate('/dashboard')}
      >
        Go to Dashboard
      </Button>
    </>
  );
}

export function renderErrorIcon(category: ClassifiedError['category']): ReactElement {
  switch (category) {
    case 'NOT_FOUND':
      return (
        <div className="w-14 h-14 rounded-full bg-info/12 flex items-center justify-center text-info mb-4">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>
      );
    case 'UNAUTHORIZED':
      return (
        <div className="w-14 h-14 rounded-full bg-warning/12 flex items-center justify-center text-warning mb-4">
          <LogIn className="w-7 h-7" aria-hidden="true" />
        </div>
      );
    case 'FORBIDDEN':
      return (
        <div className="w-14 h-14 rounded-full bg-void/12 flex items-center justify-center text-void mb-4">
          <ShieldAlert className="w-7 h-7" aria-hidden="true" />
        </div>
      );
    case 'NETWORK_ERROR':
      return (
        <div className="w-14 h-14 rounded-full bg-danger/12 flex items-center justify-center text-danger mb-4">
          <WifiOff className="w-7 h-7" aria-hidden="true" />
        </div>
      );
    case 'BACKEND_SERVER_ERROR':
      return (
        <div className="w-14 h-14 rounded-full bg-danger/12 flex items-center justify-center text-danger mb-4">
          <ServerCrash className="w-7 h-7" aria-hidden="true" />
        </div>
      );
    case 'FRONTEND_RUNTIME_ERROR':
    default:
      return (
        <div className="w-14 h-14 rounded-full bg-warning/12 flex items-center justify-center text-warning mb-4">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>
      );
  }
}

export function getBadgeColor(variant: 'danger' | 'warning' | 'info' | 'void'): string {
  switch (variant) {
    case 'danger':
      return 'bg-danger/12 text-danger border-danger/30';
    case 'warning':
      return 'bg-warning/12 text-warning border-warning/30';
    case 'info':
      return 'bg-info/12 text-info border-info/30';
    case 'void':
    default:
      return 'bg-void/12 text-void border-void/30';
  }
}
