import { type ReactElement } from 'react';
import { Button } from '@exzaestate/ui';
import type { RuntimeModeChoice } from '../schemas/first-launch.schema.js';

interface FirstLaunchSummaryProps {
  mode: RuntimeModeChoice;
  onProceedToLogin: () => void;
}

export function FirstLaunchSummary({
  mode,
  onProceedToLogin,
}: FirstLaunchSummaryProps): ReactElement {
  const isCloud = mode === 'cloud';

  return (
    <div className="card-surface text-center py-8 px-6 space-y-6 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto text-display font-bold">
        ✓
      </div>

      <div>
        <h2 className="text-h2 font-bold text-text">Workspace Initialized</h2>
        <p className="mt-2 text-body text-text-muted leading-relaxed">
          {isCloud
            ? 'Connected to ExzaEstate Cloud API cluster. Multi-branch ledgers, web portal sync, and managed cloud backups are active.'
            : 'ExzaEstate Local Standalone engine is ready. Your database is embedded locally on this computer with zero cloud telemetry.'}
        </p>
      </div>

      <div className="p-4 bg-surface-sunken rounded-card border border-border text-left space-y-2 text-caption">
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Runtime Mode:</span>
          <span className="font-semibold text-text uppercase">
            {isCloud ? 'Cloud-Hosted' : 'Local Standalone'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Security Policy:</span>
          <span className="font-semibold text-text">
            {isCloud ? 'JWT + Row-Level Isolation' : 'Loopback + Hardware-Bound Secret'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Financial Immutability:</span>
          <span className="font-semibold text-success font-mono">ENFORCED (RULE-IMMUTABLE)</span>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="primary" onClick={onProceedToLogin} className="w-full justify-center">
          Proceed to Sign In →
        </Button>
      </div>
    </div>
  );
}
