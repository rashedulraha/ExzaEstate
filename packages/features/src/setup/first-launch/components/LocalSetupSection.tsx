import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { MachineFingerprint } from '@exzaestate/app-core';
import {
  restoreBackupSchema,
  type CreateLocalCompanyInput,
  type RestoreBackupInput,
  type LocalSetupAction,
} from '../schemas/first-launch.schema.js';
import { LocalCompanyForm } from './LocalCompanyForm.js';

interface LocalRestoreFormProps {
  onRestore: (backupPath: string) => void;
  isLoading: boolean;
  onBrowseFile?: () => Promise<string | null>;
}

function LocalRestoreForm({
  onRestore,
  isLoading,
  onBrowseFile,
}: LocalRestoreFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RestoreBackupInput>({
    resolver: zodResolver(restoreBackupSchema),
    defaultValues: { backupFilePath: '' },
  });

  const handlePickFile = async () => {
    if (onBrowseFile) {
      const selected = await onBrowseFile();
      if (selected) {
        setValue('backupFilePath', selected);
      }
    }
  };

  const onSubmit = (data: RestoreBackupInput) => {
    onRestore(data.backupFilePath);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        id="local-backupPath"
        label="Select Backup Archive (.exzabackup)"
        required
        error={errors.backupFilePath?.message}
        helperText="Encrypted snapshot bundle containing ledger journals, customers, properties and audit records"
      >
        <div className="flex gap-2">
          <Input
            id="local-backupPath"
            placeholder="/path/to/backup_2026-10-01.exzabackup"
            {...register('backupFilePath')}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handlePickFile()}
            disabled={isLoading}
          >
            Browse...
          </Button>
        </div>
      </FormField>

      <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-card text-caption text-warning flex items-start gap-2.5">
        <span className="font-bold">⚠</span>
        <span>
          <strong>Destructive Operation:</strong> Restoring will erase any uncommitted local scratch
          data and load the verified backup snapshot.
        </span>
      </div>

      <div className="pt-2 flex justify-end">
        <Button type="submit" variant="destructive" isLoading={isLoading} disabled={isLoading}>
          Restore Company Database →
        </Button>
      </div>
    </form>
  );
}

interface LocalSetupSectionProps {
  onCreateCompany: (data: CreateLocalCompanyInput) => void;
  onRestoreBackup: (backupPath: string) => void;
  isLoading: boolean;
  onBrowseFile?: () => Promise<string | null>;
  machineFingerprint?: MachineFingerprint | null;
  onSendVerificationCode?: (email: string) => string;
  onVerifyCode?: (code: string) => boolean;
  isEmailVerified?: boolean;
  verificationCodeSent?: boolean;
}

export function LocalSetupSection({
  onCreateCompany,
  onRestoreBackup,
  isLoading,
  onBrowseFile,
  machineFingerprint,
  onSendVerificationCode,
  onVerifyCode,
  isEmailVerified,
  verificationCodeSent,
}: LocalSetupSectionProps): ReactElement {
  const [action, setAction] = useState<LocalSetupAction>('new_company');

  return (
    <div className="card-surface space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-h3 font-semibold text-text">
            Organization Registration & Deployment
          </h3>
          <p className="mt-0.5 text-body text-text-muted">
            Activate your license key and configure your enterprise workspace.
          </p>
        </div>
        <div className="flex rounded-button bg-surface-sunken p-1 border border-border">
          <button
            type="button"
            onClick={() => setAction('new_company')}
            className={`px-3 py-1.5 text-caption font-semibold rounded-button transition-colors cursor-pointer ${
              action === 'new_company'
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            New Company
          </button>
          <button
            type="button"
            onClick={() => setAction('restore_backup')}
            className={`px-3 py-1.5 text-caption font-semibold rounded-button transition-colors cursor-pointer ${
              action === 'restore_backup'
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Restore Backup
          </button>
        </div>
      </div>

      {action === 'new_company' ? (
        <LocalCompanyForm
          onSubmit={onCreateCompany}
          isLoading={isLoading}
          machineFingerprint={machineFingerprint}
          onSendVerificationCode={onSendVerificationCode}
          onVerifyCode={onVerifyCode}
          isEmailVerified={isEmailVerified}
          verificationCodeSent={verificationCodeSent}
        />
      ) : (
        <LocalRestoreForm
          onRestore={onRestoreBackup}
          isLoading={isLoading}
          onBrowseFile={onBrowseFile}
        />
      )}
    </div>
  );
}
