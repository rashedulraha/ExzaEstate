import { type ReactElement, useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import { usePlatform } from '@exzaestate/app-core';
import { http } from '@exzaestate/api-client';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RestoreModal({ isOpen, onClose, onSuccess }: RestoreModalProps): ReactElement {
  const platform = usePlatform();
  const [backupPath, setBackupPath] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleBrowseFile = async () => {
    try {
      const selected = await platform.fileDialog.open({
        title: 'Select Backup Archive',
        multiple: false,
        filters: [{ name: 'ExzaEstate Backup (*.exzabackup)', extensions: ['exzabackup'] }],
      });
      if (typeof selected === 'string') {
        setBackupPath(selected);
      }
    } catch {
      // Fallback
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExecuteRestore = async () => {
    if (!backupPath.trim()) return;
    setIsRestoring(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const headers = platform.apiConfig.localSecret
        ? { 'X-Local-Secret': platform.apiConfig.localSecret }
        : undefined;

      await http.post(
        '/api/v1/local-data/restore',
        { backupFilePath: backupPath.trim() },
        { headers },
      );

      setStatusMessage('Database restored successfully from backup.');
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database restore operation failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Restore Database from Backup"
      description="Restore an encrypted .exzabackup archive file to replace the local database state."
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isRestoring}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleExecuteRestore()}
            isLoading={isRestoring}
            disabled={isRestoring || !backupPath.trim()}
          >
            Confirm & Restore
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <FormField
          id="restore-path"
          label="Backup Archive Path"
          required
          helperText="Select the verified .exzabackup bundle created by ExzaEstate"
        >
          <div className="flex gap-2">
            <Input
              id="restore-path"
              placeholder="/path/to/archive.exzabackup"
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleBrowseFile()}
              disabled={isRestoring}
            >
              Browse...
            </Button>
          </div>
        </FormField>

        <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-card text-caption text-warning flex items-start gap-2.5">
          <span className="font-bold">⚠</span>
          <div>
            <strong className="block">Destructive Operation:</strong>
            All current local ledger records will be overwritten by the selected backup file. Make
            sure you have exported any current changes before restoring.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-card text-caption text-danger flex items-center gap-2">
            <span>✕</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-success/10 border border-success/30 rounded-card text-caption text-success flex items-center gap-2">
            <span>✓</span>
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
