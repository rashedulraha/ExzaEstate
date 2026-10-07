import { type ReactElement, useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import { usePlatform } from '@exzaestate/app-core';
import { http } from '@exzaestate/api-client';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (filePath: string) => void;
}

export function BackupModal({ isOpen, onClose, onSuccess }: BackupModalProps): ReactElement {
  const platform = usePlatform();
  const [destinationPath, setDestinationPath] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleBrowseDestination = async () => {
    try {
      const selected = await platform.fileDialog.save({
        title: 'Choose Backup Location',
        defaultPath: `exzaestate_backup_${new Date().toISOString().slice(0, 10)}.exzabackup`,
        filters: [{ name: 'ExzaEstate Backup (*.exzabackup)', extensions: ['exzabackup'] }],
      });
      if (selected) {
        setDestinationPath(selected);
      }
    } catch {
      // Fallback
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExecuteBackup = async () => {
    setIsSubmitting(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const targetPath =
        destinationPath.trim() || `AppData/ExzaEstate/backups/backup_${Date.now()}.exzabackup`;

      const headers = platform.apiConfig.localSecret
        ? { 'X-Local-Secret': platform.apiConfig.localSecret }
        : undefined;

      await http.post(
        '/api/v1/local-data/backup',
        {
          backupFilePath: targetPath,
          comment: comment.trim() || undefined,
        },
        { headers },
      );

      setResultMessage(`Database snapshot successfully written to ${targetPath}`);
      onSuccess?.(targetPath);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database backup operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Local Database Backup"
      description="Create an encrypted snapshot bundle of your company ledgers, vouchers, and properties."
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleExecuteBackup()}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Backup Now
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <FormField
          id="backup-dest"
          label="Backup Destination Path"
          helperText="Leave empty to write to the default AppData/ExzaEstate/backups/ folder."
        >
          <div className="flex gap-2">
            <Input
              id="backup-dest"
              placeholder="e.g. /Volumes/SecureDrive/exza_backup.exzabackup"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleBrowseDestination()}
              disabled={isSubmitting}
            >
              Browse...
            </Button>
          </div>
        </FormField>

        <FormField id="backup-comment" label="Snapshot Notes (Optional)">
          <Input
            id="backup-comment"
            placeholder="e.g. Monthly close before FY26 audit"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </FormField>

        {errorMessage && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-card text-caption text-danger flex items-center gap-2">
            <span>✕</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {resultMessage && (
          <div className="p-3 bg-success/10 border border-success/30 rounded-card text-caption text-success flex items-center gap-2">
            <span>✓</span>
            <span>{resultMessage}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
