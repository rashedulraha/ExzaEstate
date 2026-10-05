import React from 'react';
import { LoadingState, ErrorState } from '@exzaestate/ui';

export interface ReportStateWrapperProps {
  isLoading: boolean;
  isError: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry: () => void;
  hasData: boolean;
  children: React.ReactNode;
}

export function ReportStateWrapper({
  isLoading,
  isError,
  errorTitle = 'Failed to load report',
  errorMessage = 'Could not retrieve report metrics from server.',
  onRetry,
  hasData,
  children,
}: ReportStateWrapperProps) {
  if (isLoading && !hasData) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState title={errorTitle} message={errorMessage} onRetry={onRetry} />;
  }

  if (!hasData) {
    return null;
  }

  return <>{children}</>;
}
