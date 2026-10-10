import { Button } from '@exzaestate/ui';
import type { UiLicenseStatus } from '../hooks/useLicenseState.js';
import type { MachineFingerprint, StoredLicenseRecord } from '@exzaestate/app-core';

export interface LicenseSummaryCardProps {
  status: UiLicenseStatus;
  license: StoredLicenseRecord | null;
  fingerprint: MachineFingerprint | null;
  isWriteLocked: boolean;
  canExport: boolean;
  daysRemaining?: number;
  onOpenActivate: () => void;
  onOpenRenew: () => void;
  onOpenTransfer: () => void;
  onExportData: () => void;
}

function StatusBadge({
  status,
  daysRemaining,
}: {
  status: UiLicenseStatus;
  daysRemaining?: number;
}) {
  if (status === 'ACTIVE') {
    return <span className="badge-brand">Active License</span>;
  }
  if (status === 'GRACE') {
    return <span className="badge-warning">Grace Period ({daysRemaining ?? 7}d left)</span>;
  }
  if (status === 'EXPIRED') {
    return <span className="badge-danger">Expired (Write-Locked)</span>;
  }
  if (status === 'CLOCK_TAMPERED') {
    return <span className="badge-danger">Clock Tampered</span>;
  }
  if (status === 'INVALID') {
    return <span className="badge-danger">Hardware / Signature Mismatch</span>;
  }
  return <span className="badge-warning">Unlicensed Workstation</span>;
}

function LicenseActionButtons({
  license,
  canExport,
  onOpenActivate,
  onOpenRenew,
  onOpenTransfer,
  onExportData,
}: {
  license: StoredLicenseRecord | null;
  canExport: boolean;
  onOpenActivate: () => void;
  onOpenRenew: () => void;
  onOpenTransfer: () => void;
  onExportData: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canExport && (
        <Button type="button" variant="secondary" size="sm" onClick={onExportData}>
          Export All Data
        </Button>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onOpenTransfer}
        disabled={!license}
      >
        Transfer Device License
      </Button>

      {license ? (
        <Button type="button" variant="primary" size="sm" onClick={onOpenRenew}>
          Renew License
        </Button>
      ) : (
        <Button type="button" variant="primary" size="sm" onClick={onOpenActivate}>
          Activate Workstation
        </Button>
      )}
    </div>
  );
}

function LicenseAttributesGrid({
  plan,
  seats,
  validUntil,
  isWriteLocked,
}: {
  plan: string;
  seats: number;
  validUntil: string;
  isWriteLocked: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-surface-sunken border border-border/50 rounded-card p-3">
        <span className="text-caption text-text-muted">Subscription Plan</span>
        <p className="text-h4 font-bold text-text mt-0.5">{plan}</p>
      </div>

      <div className="bg-surface-sunken border border-border/50 rounded-card p-3">
        <span className="text-caption text-text-muted">Concurrent Seats</span>
        <p className="text-h4 font-bold text-text mt-0.5">{seats > 0 ? `${seats} Seats` : '—'}</p>
      </div>

      <div className="bg-surface-sunken border border-border/50 rounded-card p-3">
        <span className="text-caption text-text-muted">Valid Until</span>
        <p className="text-h4 font-bold text-text mt-0.5">{validUntil}</p>
      </div>

      <div className="bg-surface-sunken border border-border/50 rounded-card p-3">
        <span className="text-caption text-text-muted">Write Operations</span>
        <p className={`text-h4 font-bold mt-0.5 ${isWriteLocked ? 'text-danger' : 'text-success'}`}>
          {isWriteLocked ? 'Locked (Read-Only)' : 'Full Access'}
        </p>
      </div>
    </div>
  );
}

function HardwareSection({ fingerprint }: { fingerprint: MachineFingerprint | null }) {
  return (
    <div className="bg-surface-sunken border border-border rounded-card p-4 space-y-2">
      <h4 className="text-caption font-semibold uppercase tracking-wider text-text-muted">
        Licensed Hardware Device Information
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-small">
        <div>
          <span className="text-caption text-text-muted">Hardware UUID / Motherboard:</span>
          <p className="font-mono text-text truncate">
            {fingerprint?.motherboardUuid ?? 'Detecting...'}
          </p>
        </div>
        <div>
          <span className="text-caption text-text-muted">CPU Serial:</span>
          <p className="font-mono text-text truncate">{fingerprint?.cpuSerial ?? 'Detecting...'}</p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Primary Disk Serial:</span>
          <p className="font-mono text-text truncate">
            {fingerprint?.diskSerial ?? 'Detecting...'}
          </p>
        </div>
      </div>
      <div className="pt-2 border-t border-border/40">
        <span className="text-caption text-text-muted">Composite Machine ID (SHA-256):</span>
        <p className="font-mono text-caption text-text break-all mt-0.5">
          {fingerprint?.machineId ?? 'Calculating machine ID...'}
        </p>
      </div>
    </div>
  );
}

export function LicenseSummaryCard({
  status,
  license,
  fingerprint,
  isWriteLocked,
  canExport,
  daysRemaining,
  onOpenActivate,
  onOpenRenew,
  onOpenTransfer,
  onExportData,
}: LicenseSummaryCardProps) {
  const plan = license?.payload.plan ?? 'Not Activated';
  const seats = license?.payload.maxSeats ?? 0;
  const validUntil = license?.payload.validUntil
    ? new Date(license.payload.validUntil).toLocaleDateString()
    : 'N/A';

  return (
    <div className="bg-surface border border-border rounded-card p-6 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-h3 font-semibold text-text">Commercial License</h3>
            <StatusBadge status={status} daysRemaining={daysRemaining} />
          </div>
          <p className="text-small text-text-muted mt-1">
            Workstation hardware binding and subscription verification
          </p>
        </div>

        <LicenseActionButtons
          license={license}
          canExport={canExport}
          onOpenActivate={onOpenActivate}
          onOpenRenew={onOpenRenew}
          onOpenTransfer={onOpenTransfer}
          onExportData={onExportData}
        />
      </div>

      <LicenseAttributesGrid
        plan={plan}
        seats={seats}
        validUntil={validUntil}
        isWriteLocked={isWriteLocked}
      />

      <HardwareSection fingerprint={fingerprint} />
    </div>
  );
}
