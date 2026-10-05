import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, Input } from '@exzaestate/ui';
import {
  createLocalCompanySchema,
  restoreBackupSchema,
  type CreateLocalCompanyInput,
  type RestoreBackupInput,
  type LocalSetupAction,
} from '../schemas/first-launch.schema.js';

interface LocalCompanyFormProps {
  onSubmit: (data: CreateLocalCompanyInput) => void;
  isLoading: boolean;
}

function LocalCompanyForm({ onSubmit, isLoading }: LocalCompanyFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLocalCompanyInput>({
    resolver: zodResolver(createLocalCompanySchema),
    defaultValues: {
      companyName: '',
      tradeLicense: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="local-companyName"
          label="Company / Enterprise Name"
          required
          error={errors.companyName?.message}
        >
          <Input
            id="local-companyName"
            placeholder="e.g. Paramount Real Estate Ltd."
            {...register('companyName')}
          />
        </FormField>

        <FormField
          id="local-tradeLicense"
          label="Trade License Number"
          error={errors.tradeLicense?.message}
        >
          <Input
            id="local-tradeLicense"
            placeholder="e.g. TRAD/DNCC/012345/2026"
            {...register('tradeLicense')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="local-adminName"
          label="Managing Director / Admin Name"
          required
          error={errors.adminName?.message}
        >
          <Input
            id="local-adminName"
            placeholder="e.g. Mohammad Anisur Rahman"
            {...register('adminName')}
          />
        </FormField>

        <FormField
          id="local-adminEmail"
          label="Administrator Email (Login ID)"
          required
          error={errors.adminEmail?.message}
        >
          <Input
            id="local-adminEmail"
            type="email"
            placeholder="admin@exzaestate.local"
            {...register('adminEmail')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="local-adminPassword"
          label="Master Password"
          required
          error={errors.adminPassword?.message}
          helperText="Minimum 8 characters with numbers and symbols"
        >
          <Input
            id="local-adminPassword"
            type="password"
            placeholder="••••••••••••"
            {...register('adminPassword')}
          />
        </FormField>

        <FormField
          id="local-confirmPassword"
          label="Confirm Master Password"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="local-confirmPassword"
            type="password"
            placeholder="••••••••••••"
            {...register('confirmPassword')}
          />
        </FormField>
      </div>

      <div className="p-3.5 bg-surface-sunken rounded-card border border-border text-caption text-text-muted flex items-start gap-2.5">
        <span className="text-accent font-bold">ℹ</span>
        <span>
          Local Standalone uses single-machine encryption and local loopback isolation. Keep regular
          backups to protect your ledgers.
        </span>
      </div>

      <div className="pt-2 flex justify-end">
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          Initialize Local Engine & Create Admin →
        </Button>
      </div>
    </form>
  );
}

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
}

export function LocalSetupSection({
  onCreateCompany,
  onRestoreBackup,
  isLoading,
  onBrowseFile,
}: LocalSetupSectionProps): ReactElement {
  const [action, setAction] = useState<LocalSetupAction>('new_company');

  return (
    <div className="card-surface space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-h3 font-semibold text-text">Local Standalone Configuration</h3>
          <p className="mt-0.5 text-body text-text-muted">
            Configure your air-gapped financial engine on this PC.
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
        <LocalCompanyForm onSubmit={onCreateCompany} isLoading={isLoading} />
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
