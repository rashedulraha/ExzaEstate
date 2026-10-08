import { useState } from 'react';
import { Dialog, Button } from '@exzaestate/ui';
import { Building2, ShieldAlert, ShieldCheck, MapPin, Calendar, Clock } from 'lucide-react';
import type { TenantItem } from '../schemas/system-admin.schema.js';

interface TenantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantItem | null;
  onSuspend: (reason: string) => Promise<void>;
  onReactivate: () => Promise<void>;
  isMutating?: boolean;
}

export function TenantDetailModal({
  isOpen,
  onClose,
  tenant,
  onSuspend,
  onReactivate,
  isMutating,
}: TenantDetailModalProps) {
  const [suspendReason, setSuspendReason] = useState('');
  const [isConfirmingSuspend, setIsConfirmingSuspend] = useState(false);

  if (!tenant) return null;

  const isActive = tenant.status === 'ACTIVE';
  const createdDate = new Date(tenant.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleSuspendSubmit = async () => {
    if (!suspendReason.trim()) return;
    await onSuspend(suspendReason);
    setIsConfirmingSuspend(false);
    setSuspendReason('');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setIsConfirmingSuspend(false);
        setSuspendReason('');
        onClose();
      }}
      title={tenant.name}
      description={`Company ID: ${tenant.id}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Status header banner */}
        <div className="rounded-card border border-border bg-surface-sunken/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <div className="text-body font-semibold text-text">{tenant.name}</div>
              <div className="text-caption text-text-muted font-mono">Code: {tenant.code}</div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border ${
              isActive
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-danger/10 text-danger border-danger/20'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-danger'}`} />
            {tenant.status}
          </span>
        </div>

        {/* Details list */}
        <div className="grid grid-cols-2 gap-3 text-small">
          <div className="p-3 rounded-button bg-surface border border-border">
            <span className="text-caption text-text-muted flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5" />
              Timezone
            </span>
            <span className="font-medium text-text">{tenant.timezone || 'Asia/Dhaka'}</span>
          </div>

          <div className="p-3 rounded-button bg-surface border border-border">
            <span className="text-caption text-text-muted flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              Registration Date
            </span>
            <span className="font-medium text-text tabular-nums">{createdDate}</span>
          </div>
        </div>

        {/* Branches */}
        {tenant.branches && tenant.branches.length > 0 && (
          <div>
            <h4 className="text-caption font-semibold text-text-muted mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Office Branches ({tenant.branches.length})
            </h4>
            <div className="space-y-1.5">
              {tenant.branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-button bg-surface-sunken/40 border border-border text-small"
                >
                  <span className="font-medium text-text">{b.name}</span>
                  <span className="text-caption text-text-muted font-mono">{b.code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suspension / Reactivation section */}
        <div className="pt-2 border-t border-border">
          {isConfirmingSuspend ? (
            <SuspendConfirmCard
              reason={suspendReason}
              onChangeReason={setSuspendReason}
              onCancel={() => setIsConfirmingSuspend(false)}
              onConfirm={handleSuspendSubmit}
              isMutating={isMutating}
            />
          ) : (
            <TenantStatusActions
              isActive={isActive}
              isMutating={isMutating}
              onStartSuspend={() => setIsConfirmingSuspend(true)}
              onReactivate={onReactivate}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}

function SuspendConfirmCard({
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
  isMutating,
}: {
  reason: string;
  onChangeReason: (val: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isMutating?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-3.5">
      <h5 className="text-caption font-semibold text-danger flex items-center gap-1">
        <ShieldAlert className="w-4 h-4" />
        Reason for Suspension
      </h5>
      <input
        type="text"
        placeholder="e.g. Account renewal pending / Requested by client"
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        className="w-full rounded-button border border-border-input bg-surface px-3 py-1.5 text-small text-text focus:border-danger focus:outline-none"
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={!reason.trim() || isMutating}
          isLoading={isMutating}
          onClick={onConfirm}
        >
          Confirm Suspension
        </Button>
      </div>
    </div>
  );
}

function TenantStatusActions({
  isActive,
  isMutating,
  onStartSuspend,
  onReactivate,
}: {
  isActive: boolean;
  isMutating?: boolean;
  onStartSuspend: () => void;
  onReactivate: () => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-caption text-text-muted">
        {isActive
          ? 'Suspending pauses all employee logins. Company data remains safe.'
          : 'Reactivating restores employee access immediately.'}
      </div>

      {isActive ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onStartSuspend}
          leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
        >
          Suspend Company
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={onReactivate}
          isLoading={isMutating}
          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-success" />}
        >
          Reactivate Company
        </Button>
      )}
    </div>
  );
}
