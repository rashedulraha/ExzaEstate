import { Button } from '@exzaestate/ui';
import type { UiLicenseStatus } from '../hooks/useLicenseState.js';

export interface LicenseStatusBannerProps {
  status: UiLicenseStatus;
  daysRemaining?: number;
  message?: string;
  isWriteLocked: boolean;
  canExport: boolean;
  onOpenRenewModal: () => void;
  onOpenActivateModal: () => void;
  onExportData: () => void;
}

interface BannerContent {
  title: string;
  description: string;
  containerClasses: string;
  badgeClasses: string;
  icon: string;
}

function resolveBannerContent(
  status: UiLicenseStatus,
  daysRemaining?: number,
  customMessage?: string,
): BannerContent {
  if (status === 'GRACE') {
    return {
      title: 'Subscription Grace Period Active',
      description: `Your subscription has elapsed. ${daysRemaining ?? 7} days of full write access remain before read-only lock.`,
      containerClasses: 'bg-warning/12 border border-warning/30 text-warning',
      badgeClasses: 'bg-warning/20',
      icon: '⚠',
    };
  }
  if (status === 'EXPIRED') {
    return {
      title: 'License Expired — Read-Only Mode (AT-31)',
      description:
        'Your subscription period has ended. New transactions are locked. Data is never held hostage (BR-20) — all ledgers and export tools remain fully accessible.',
      containerClasses: 'bg-danger/12 border border-danger/30 text-danger',
      badgeClasses: 'bg-danger/20',
      icon: '🔒',
    };
  }
  if (status === 'CLOCK_TAMPERED') {
    return {
      title: 'Clock Rollback Detected (CLOCK_TAMPERED)',
      description:
        'Operating system clock was shifted backward relative to the financial high-water mark. Write operations are locked to prevent ledger tampering.',
      containerClasses: 'bg-danger/12 border border-danger/30 text-danger',
      badgeClasses: 'bg-danger/20',
      icon: '🔒',
    };
  }
  return {
    title: 'Standalone Installation Unlicensed',
    description:
      customMessage ||
      'Please activate this workstation with a cryptographically signed license key.',
    containerClasses: 'bg-danger/12 border border-danger/30 text-danger',
    badgeClasses: 'bg-danger/20',
    icon: '🔒',
  };
}

export function LicenseStatusBanner({
  status,
  daysRemaining,
  message,
  isWriteLocked,
  canExport,
  onOpenRenewModal,
  onOpenActivateModal,
  onExportData,
}: LicenseStatusBannerProps) {
  if (status === 'ACTIVE') {
    return null;
  }

  const content = resolveBannerContent(status, daysRemaining, message);
  const showRenew = status === 'GRACE' || status === 'EXPIRED';

  return (
    <div
      className={`rounded-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${content.containerClasses}`}
      role="alert"
    >
      <div className="flex items-start md:items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${content.badgeClasses}`}
        >
          {content.icon}
        </div>
        <div>
          <h4 className="text-h5 font-semibold text-text">{content.title}</h4>
          <p className="text-caption text-text-muted mt-0.5">{content.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
        {canExport && isWriteLocked && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onExportData}
            aria-label="Export All Business Data"
          >
            Export All Data (BR-20)
          </Button>
        )}

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={showRenew ? onOpenRenewModal : onOpenActivateModal}
        >
          {showRenew ? 'Renew Subscription' : 'Activate License'}
        </Button>
      </div>
    </div>
  );
}
