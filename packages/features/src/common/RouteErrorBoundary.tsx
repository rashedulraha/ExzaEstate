import { useState } from 'react';
import { useRouteError, useNavigate, useLocation } from 'react-router';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, useToast } from '@exzaestate/ui';
import {
  type ClassifiedError,
  classifyError,
  renderActionButtons,
  renderErrorIcon,
  getBadgeColor,
} from './route-error.utils.js';

export interface RouteErrorBoundaryProps {
  /** If true, error boundary is rendering full-page outside of AppShell */
  isRoot?: boolean;
}

export { type ErrorCategory, type ClassifiedError, classifyError } from './route-error.utils.js';

function TechnicalDiagnosticsDrawer({
  classified,
  pathname,
}: {
  classified: ClassifiedError;
  pathname: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!classified.details && !classified.stack) {
    return null;
  }

  return (
    <div className="mt-6 w-full text-left">
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className="flex items-center justify-between w-full px-3 py-2 text-caption font-medium text-text-muted hover:text-text bg-surface-sunken rounded-button transition-colors cursor-pointer"
      >
        <span>Technical Diagnostics & Stack Trace</span>
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showDetails && (
        <div className="mt-2 p-3 bg-surface-sunken border border-border rounded-button text-caption font-mono text-text-muted overflow-x-auto max-h-56 space-y-2">
          <div className="text-text">
            <span className="font-semibold">Current Path:</span> {pathname}
          </div>
          {classified.statusCode && (
            <div className="text-text">
              <span className="font-semibold">Status Code:</span> {classified.statusCode}
            </div>
          )}
          {classified.details && (
            <div>
              <span className="font-semibold text-text">Details:</span>
              <pre className="whitespace-pre-wrap break-all mt-1">{classified.details}</pre>
            </div>
          )}
          {classified.stack && (
            <div>
              <span className="font-semibold text-text">Stack Trace:</span>
              <pre className="whitespace-pre-wrap break-all mt-1 text-caption text-text-muted">
                {classified.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RouteErrorBoundary({ isRoot = false }: RouteErrorBoundaryProps) {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);

  const classified = classifyError(error, location.pathname);

  const handleCopyDiagnostics = async () => {
    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      path: location.pathname,
      category: classified.category,
      title: classified.title,
      statusCode: classified.statusCode,
      message: classified.message,
      details: classified.details,
      stack: classified.stack,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
        setCopied(true);
        showToast({
          family: 'success',
          title: 'Diagnostics Copied',
          description: 'Error diagnostics copied to clipboard for troubleshooting.',
        });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-6 text-center ${
        isRoot ? 'min-h-screen bg-bg' : 'min-h-[500px] py-16'
      }`}
      data-testid="route-error-boundary"
    >
      <div className="max-w-lg w-full bg-surface border border-border rounded-card p-8 shadow-card flex flex-col items-center">
        {renderErrorIcon(classified.category)}

        {/* Badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-caption font-mono uppercase tracking-wider border mb-2 ${getBadgeColor(
            classified.badge.variant,
          )}`}
        >
          {classified.badge.label}
        </span>

        {/* Title */}
        <h2 className="text-h2 font-bold text-text mt-1">{classified.title}</h2>

        {/* User-friendly message */}
        <p className="text-body text-text-muted mt-2 max-w-md">{classified.message}</p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
          {renderActionButtons(classified.category, navigate)}

          <Button
            variant="ghost"
            size="md"
            leftIcon={
              copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />
            }
            onClick={handleCopyDiagnostics}
          >
            {copied ? 'Copied' : 'Copy Diagnostics'}
          </Button>
        </div>

        {/* Collapsible Technical Diagnostics Drawer */}
        <TechnicalDiagnosticsDrawer classified={classified} pathname={location.pathname} />
      </div>
    </div>
  );
}
