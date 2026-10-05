import { type ReactElement, useState } from 'react';
import { Button } from '@exzaestate/ui';
import { BackupModal } from './BackupModal.js';

interface BackupBannerProps {
  lastBackupDate?: string | null;
  totalBackupsCount?: number;
  onBackupCompleted?: () => void;
}

function calculateDaysSinceBackup(isoDate?: string | null): number {
  if (!isoDate) return 999;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function BackupBanner({
  lastBackupDate,
  totalBackupsCount = 0,
  onBackupCompleted,
}: BackupBannerProps): ReactElement | null {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const daysSince = calculateDaysSinceBackup(lastBackupDate);
  const isOverdue = daysSince >= 7;

  if (!isOverdue && totalBackupsCount > 0) {
    return null;
  }

  const message = !lastBackupDate
    ? 'No database backup exists for this local standalone installation. Back up now to safeguard financial records.'
    : `Last database backup was ${daysSince} days ago (exceeds 7-day threshold). A single hard disk holds your ledger.`;

  return (
    <>
      <div className="bg-warning/12 border border-warning/30 rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-warning">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0 text-warning font-bold">
            ⚠
          </div>
          <div>
            <h4 className="text-h5 font-semibold text-text">Database Backup Recommended (AT-34)</h4>
            <p className="text-caption text-text-muted mt-0.5">{message}</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="!h-8 !px-3 text-btn"
          >
            Back up now
          </Button>
        </div>
      </div>

      <BackupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          onBackupCompleted?.();
        }}
      />
    </>
  );
}
