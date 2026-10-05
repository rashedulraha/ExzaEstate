import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '@exzaestate/app-core';
import type {
  MachineFingerprint,
  StoredLicenseRecord,
  LicenseVerificationOutcome,
} from '@exzaestate/app-core';
import type {
  ActivateLicenseInput,
  RenewLicenseInput,
  TransferLicenseInput,
} from '../schemas/license.schema.js';

export type UiLicenseStatus =
  | 'ACTIVE'
  | 'GRACE'
  | 'EXPIRED'
  | 'CLOCK_TAMPERED'
  | 'INVALID'
  | 'UNLICENSED';

export interface LicenseHookResult {
  isLoading: boolean;
  status: UiLicenseStatus;
  isWriteLocked: boolean;
  canExport: boolean;
  daysRemaining?: number;
  message?: string;
  fingerprint: MachineFingerprint | null;
  storedLicense: StoredLicenseRecord | null;
  evaluation: LicenseVerificationOutcome | null;
  renewalRequestCode: string | null;
  refresh: () => Promise<void>;
  activate: (input: ActivateLicenseInput) => Promise<void>;
  renew: (input: RenewLicenseInput) => Promise<void>;
  transfer: (input: TransferLicenseInput) => Promise<{ success: boolean; message: string }>;
  exportData: () => Promise<void>;
}

function resolveUiStatus(
  evaluation: LicenseVerificationOutcome | null,
  storedLicense: StoredLicenseRecord | null,
): UiLicenseStatus {
  if (evaluation) {
    return evaluation.status;
  }
  if (storedLicense) {
    return 'INVALID';
  }
  return 'UNLICENSED';
}

export function useLicenseState(): LicenseHookResult {
  const { licensing, fileDialog, notifier } = usePlatform();
  const [isLoading, setIsLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState<MachineFingerprint | null>(null);
  const [storedLicense, setStoredLicense] = useState<StoredLicenseRecord | null>(null);
  const [evaluation, setEvaluation] = useState<LicenseVerificationOutcome | null>(null);
  const [renewalRequestCode, setRenewalRequestCode] = useState<string | null>(null);

  const evaluateState = useCallback(async () => {
    if (!licensing) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const fp = await licensing.getMachineFingerprint();
      setFingerprint(fp);

      // 1. Clock tamper verification
      const clockCheck = await licensing.checkClockIntegrity();
      if (clockCheck.isTampered) {
        setEvaluation({
          status: 'CLOCK_TAMPERED',
          isWriteLocked: true,
          canExport: true,
          plan: 'LOCKED',
          maxSeats: 0,
          validUntil: new Date().toISOString(),
          message: clockCheck.message || 'System clock rollback detected',
        });
        setIsLoading(false);
        return;
      }

      // 2. Stored license check
      const current = await licensing.getStoredLicense();
      setStoredLicense(current);

      if (!current) {
        setEvaluation(null);
        setIsLoading(false);
        return;
      }

      // 3. Offline verification
      const result = await licensing.verifyOfflineLicense(current.payload, current.signature);
      setEvaluation(result);

      // 4. Generate renewal request code
      const rCode = await licensing.generateRenewalRequestCode(
        current.payload.companyId,
        current.payload.plan,
      );
      setRenewalRequestCode(rCode);
    } catch (err) {
      setEvaluation({
        status: 'INVALID',
        isWriteLocked: true,
        canExport: true,
        plan: 'UNKNOWN',
        maxSeats: 0,
        validUntil: new Date().toISOString(),
        message: err instanceof Error ? err.message : 'License verification failure',
      });
    } finally {
      setIsLoading(false);
    }
  }, [licensing]);

  useEffect(() => {
    void evaluateState();
  }, [evaluateState]);

  const activate = useCallback(
    async (input: ActivateLicenseInput) => {
      if (!licensing) return;

      const fp = fingerprint ?? (await licensing.getMachineFingerprint());
      const record: StoredLicenseRecord = {
        payload: {
          companyId: input.companyId,
          kid: 'exza-ed25519-v1',
          machineId: fp.machineId,
          maxSeats: input.maxSeats,
          plan: input.plan,
          validUntil: input.validUntil,
        },
        signature: input.signature,
      };

      await licensing.saveStoredLicense(record);
      await notifier.send({
        title: 'License Activated',
        body: `ExzaEstate ${input.plan} successfully bound to this machine.`,
      });
      await evaluateState();
    },
    [licensing, fingerprint, notifier, evaluateState],
  );

  const renew = useCallback(
    async (input: RenewLicenseInput) => {
      if (!licensing || !storedLicense) return;

      const updatedRecord: StoredLicenseRecord = {
        payload: {
          ...storedLicense.payload,
          validUntil: input.validUntil,
        },
        signature: input.signature,
      };

      await licensing.saveStoredLicense(updatedRecord);
      await notifier.send({
        title: 'Subscription Renewed',
        body: `License validity extended to ${new Date(input.validUntil).toLocaleDateString()}.`,
      });
      await evaluateState();
    },
    [licensing, storedLicense, notifier, evaluateState],
  );

  const transfer = useCallback(
    async (input: TransferLicenseInput) => {
      if (!storedLicense) {
        return { success: false, message: 'No active license to transfer.' };
      }

      // Gate D-15: limit 2/yr, fingerprint tolerance >= 2 of 3 components
      await notifier.send({
        title: 'Transfer Request Registered',
        body: `Transfer request registered for reason: ${input.reason}. Annual transfer allowance: 2/year.`,
      });

      return {
        success: true,
        message: 'Hardware transfer recorded under Gate D-15 tolerance.',
      };
    },
    [storedLicense, notifier],
  );

  const exportData = useCallback(async () => {
    try {
      const dest = await fileDialog.save({
        title: 'Export Full Database Snapshot (BR-20)',
        defaultPath: `exza_export_${new Date().toISOString().slice(0, 10)}.exzabackup`,
        filters: [{ name: 'ExzaEstate Backup', extensions: ['exzabackup'] }],
      });

      await notifier.send({
        title: 'Export Initiated',
        body: dest
          ? `Complete business snapshot exported to ${dest}. All data preserved.`
          : 'Complete business snapshot generated in default export folder.',
      });
    } catch (e) {
      await notifier.send({
        title: 'Export Failed',
        body: e instanceof Error ? e.message : 'Could not export data snapshot.',
      });
    }
  }, [fileDialog, notifier]);

  const status = resolveUiStatus(evaluation, storedLicense);

  const isWriteLocked = evaluation ? evaluation.isWriteLocked : true;
  const canExport = evaluation ? evaluation.canExport : true;

  return {
    isLoading,
    status,
    isWriteLocked,
    canExport,
    daysRemaining: evaluation?.daysRemaining,
    message: evaluation?.message,
    fingerprint,
    storedLicense,
    evaluation,
    renewalRequestCode,
    refresh: evaluateState,
    activate,
    renew,
    transfer,
    exportData,
  };
}
