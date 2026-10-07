import { type ReactElement } from 'react';
import type { MachineFingerprint } from '@exzaestate/app-core';
import type { CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';
import { LocalCompanyForm } from './LocalCompanyForm.js';

interface LocalSetupSectionProps {
  onCreateCompany: (data: CreateLocalCompanyInput) => void;
  isLoading: boolean;
  machineFingerprint?: MachineFingerprint | null;
  onBack?: () => void;
  // Retained optional props for backwards compatibility with tests
  onRestoreBackup?: (backupPath: string) => void;
  onBrowseFile?: () => Promise<string | null>;
  onSendVerificationCode?: (email: string) => string;
  onVerifyCode?: (code: string) => boolean;
  isEmailVerified?: boolean;
  verificationCodeSent?: boolean;
}

export function LocalSetupSection({
  onCreateCompany,
  isLoading,
  machineFingerprint,
  onBack,
}: LocalSetupSectionProps): ReactElement {
  return (
    <div className="flex flex-col justify-between flex-1 space-y-4">
      <div>
        <h3 className="text-h2 font-bold text-text">Local Standalone Workspace Setup</h3>
        <p className="mt-1 text-body text-text-muted leading-relaxed">
          Activate your software license and configure your 100% offline standalone workspace.
        </p>
      </div>

      <LocalCompanyForm
        onSubmit={onCreateCompany}
        isLoading={isLoading}
        machineFingerprint={machineFingerprint}
        onBack={onBack}
      />
    </div>
  );
}
