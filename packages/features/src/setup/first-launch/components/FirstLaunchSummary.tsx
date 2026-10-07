import { type ReactElement } from 'react';
import { Button } from '@exzaestate/ui';
import type { RuntimeModeChoice } from '../schemas/first-launch.schema.js';

interface FirstLaunchSummaryProps {
  mode: RuntimeModeChoice;
  companyName?: string;
  onProceedToLogin: () => void;
  onProceedToDashboard?: () => void;
}

export function FirstLaunchSummary({
  mode,
  companyName,
  onProceedToLogin,
  onProceedToDashboard,
}: FirstLaunchSummaryProps): ReactElement {
  const isCloud = mode === 'cloud';
  const handleLaunch = onProceedToDashboard || onProceedToLogin;

  return (
    <div className="text-center py-2 px-2 flex flex-col justify-between flex-1 space-y-4 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto text-display font-bold">
        ✓
      </div>

      <div>
        <h2 className="text-h2 font-bold text-text">
          {companyName ? `${companyName} Initialized` : 'Workspace Initialized'}
        </h2>
        <p className="mt-2 text-body text-text-muted leading-relaxed">
          {isCloud
            ? 'Connected to ExzaEstate Cloud. Multi-branch ledgers, web portal sync, and managed cloud backups are active.'
            : 'Your local enterprise workspace is provisioned and ready on this computer. All company data is stored securely and privately on this PC.'}
        </p>
      </div>

      <div className="p-4 bg-surface-sunken/40 rounded-card border border-border/40 text-left space-y-2.5 text-caption">
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Organization Name:</span>
          <span className="font-semibold text-text">{companyName || '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Runtime Mode:</span>
          <span className="font-semibold text-text">
            {isCloud ? 'Cloud-Hosted (Multi-User)' : 'Local Standalone (100% Offline)'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Software License:</span>
          <span className="font-semibold text-success">Activated for this Computer</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Financial Accounting:</span>
          <span className="font-semibold text-success">Double-Entry & Audit Protected</span>
        </div>
      </div>

      <div className="pt-2">
        <Button
          variant="primary"
          onClick={handleLaunch}
          className="w-full justify-center py-2.5 font-semibold"
        >
          Launch Executive Dashboard →
        </Button>
      </div>
    </div>
  );
}
