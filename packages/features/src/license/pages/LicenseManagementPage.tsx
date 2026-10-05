import { useState } from 'react';
import { LoadingState } from '@exzaestate/ui';
import { useLicenseState } from '../hooks/useLicenseState.js';
import { LicenseStatusBanner } from '../components/LicenseStatusBanner.js';
import { LicenseSummaryCard } from '../components/LicenseSummaryCard.js';
import { LicenseActivationModal } from '../components/LicenseActivationModal.js';
import { LicenseRenewalModal } from '../components/LicenseRenewalModal.js';
import { LicenseTransferModal } from '../components/LicenseTransferModal.js';

export function LicenseManagementPage() {
  const {
    isLoading,
    status,
    isWriteLocked,
    canExport,
    daysRemaining,
    message,
    fingerprint,
    storedLicense,
    renewalRequestCode,
    activate,
    renew,
    transfer,
    exportData,
  } = useLicenseState();

  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  if (isLoading) {
    return <LoadingState variant="cards" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-text">Commercial Workstation Licensing</h1>
        <p className="text-body text-text-muted mt-1">
          Manage hardware binding, offline digital signatures, and subscription renewals
        </p>
      </div>

      {/* Expiry / Lockout Banner */}
      <LicenseStatusBanner
        status={status}
        daysRemaining={daysRemaining}
        message={message}
        isWriteLocked={isWriteLocked}
        canExport={canExport}
        onOpenRenewModal={() => setIsRenewOpen(true)}
        onOpenActivateModal={() => setIsActivateOpen(true)}
        onExportData={() => void exportData()}
      />

      {/* Main License & Hardware Summary */}
      <LicenseSummaryCard
        status={status}
        license={storedLicense}
        fingerprint={fingerprint}
        isWriteLocked={isWriteLocked}
        canExport={canExport}
        daysRemaining={daysRemaining}
        onOpenActivate={() => setIsActivateOpen(true)}
        onOpenRenew={() => setIsRenewOpen(true)}
        onOpenTransfer={() => setIsTransferOpen(true)}
        onExportData={() => void exportData()}
      />

      {/* Architectural Policy Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-small">
        <div className="bg-surface border border-border rounded-card p-4 space-y-1">
          <h4 className="font-semibold text-text">AT-31 License Grace Period</h4>
          <p className="text-caption text-text-muted">
            Upon expiration, a 7-day grace period maintains write operations with prompt alerts
            before transitioning to read-only mode.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-card p-4 space-y-1">
          <h4 className="font-semibold text-text">BR-20 Data Retention Rule</h4>
          <p className="text-caption text-text-muted">
            Financial records are never held hostage. Even with an expired or locked license, users
            retain full export and reporting capabilities.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-card p-4 space-y-1">
          <h4 className="font-semibold text-text">Gate D-15 Hardware Tolerance</h4>
          <p className="text-caption text-text-muted">
            Component matching tolerates single hardware replacements (≥ 2 of 3 matching) and
            permits up to 2 transfer reassignments per year.
          </p>
        </div>
      </div>

      {/* Modals */}
      <LicenseActivationModal
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        fingerprint={fingerprint}
        onActivate={activate}
      />

      <LicenseRenewalModal
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        renewalRequestCode={renewalRequestCode}
        onRenew={renew}
      />

      <LicenseTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        currentLicenseKey={storedLicense?.payload.plan ? 'EXZA-CURRENT' : undefined}
        onTransfer={transfer}
      />
    </div>
  );
}
