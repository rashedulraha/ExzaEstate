import { useState, useCallback, useEffect } from 'react';
import { http } from '@exzaestate/api-client';
import { usePlatform, useAuth, initApiClient, type MachineFingerprint } from '@exzaestate/app-core';
import type {
  RuntimeModeChoice,
  CreateLocalCompanyInput,
  CloudConfigInput,
} from '../schemas/first-launch.schema.js';
import {
  buildProvisionPayload,
  establishProvisionedSession,
  parseCloudConfig,
  postProvisionRequest,
  saveLocalOfflineLicense,
} from './useFirstLaunch.helpers.js';

import { useOnboardingStore } from '../store/onboarding.store.js';

export interface FirstLaunchState {
  currentStep: number;
  selectedMode: RuntimeModeChoice;
  isLoading: boolean;
  error: string | null;
  isAlreadyProvisioned: boolean;
  machineFingerprint: MachineFingerprint | null;
  isEmailVerified: boolean;
  verificationCodeSent: boolean;
}

export function useFirstLaunch() {
  const platform = usePlatform();
  const { setSession } = useAuth();
  const {
    currentStep,
    selectedMode,
    provisionedDetails,
    setStep: setCurrentStep,
    nextStep,
    prevStep,
    setMode,
    setProvisionedDetails,
    updateCompanyData,
  } = useOnboardingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyProvisioned, setIsAlreadyProvisioned] = useState(false);
  const [machineFingerprint, setMachineFingerprint] = useState<MachineFingerprint | null>(null);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [activeCode, setActiveCode] = useState('');

  // Load hardware fingerprint from motherboard detection
  useEffect(() => {
    let active = true;
    async function fetchFingerprint() {
      try {
        if (platform.licensing) {
          const fp = await platform.licensing.getMachineFingerprint();
          if (active) setMachineFingerprint(fp);
        }
      } catch (err) {
        console.error('Failed to read machine fingerprint:', err);
      }
    }
    void fetchFingerprint();
    return () => {
      active = false;
    };
  }, [platform.licensing]);

  // Check if company is already provisioned on mount
  useEffect(() => {
    let active = true;
    async function checkProvisioned() {
      if (
        typeof window !== 'undefined' &&
        window.localStorage.getItem('exzaestate_workspace_provisioned') === 'true'
      ) {
        if (active) setIsAlreadyProvisioned(true);
        return;
      }
      try {
        const data = await http.get<{
          provisioned?: boolean;
          data?: { provisioned?: boolean };
        }>('/api/v1/local-data/is-provisioned', {
          signal: AbortSignal.timeout(3000),
        });
        const flag = Boolean(data.provisioned || data.data?.provisioned);
        if (active) {
          setIsAlreadyProvisioned(flag);
          if (flag && typeof window !== 'undefined') {
            window.localStorage.setItem('exzaestate_workspace_provisioned', 'true');
          }
        }
      } catch {
        // Server not ready / offline
      }
    }
    void checkProvisioned();
    return () => {
      active = false;
    };
  }, []);

  const selectMode = useCallback(
    (mode: RuntimeModeChoice) => {
      setMode(mode);
      setError(null);
    },
    [setMode],
  );

  const goToNextStep = useCallback(() => {
    nextStep();
    setError(null);
  }, [nextStep]);

  const goToPreviousStep = useCallback(() => {
    prevStep();
    setError(null);
  }, [prevStep]);

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      setError(null);
    },
    [setCurrentStep],
  );

  const sendVerificationCode = useCallback((_email: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveCode(code);
    setVerificationCodeSent(true);
    return code;
  }, []);

  const verifyCode = useCallback(
    (inputCode: string) => {
      if (activeCode && inputCode.trim() === activeCode) {
        setIsEmailVerified(true);
        return true;
      }
      return false;
    },
    [activeCode],
  );

  const configureCloud = useCallback(
    async (config: CloudConfigInput | string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { baseUrl, companyName, licenseKey } = parseCloudConfig(config);
        updateCompanyData({ companyName, licenseKey });

        const updatedConfig = {
          ...platform.apiConfig,
          baseUrl: baseUrl.replace(/\/+$/, ''),
          runtimeMode: 'cloud' as const,
        };
        initApiClient(updatedConfig);
        platform.apiConfig.baseUrl = updatedConfig.baseUrl;
        platform.apiConfig.runtimeMode = 'cloud';

        setProvisionedDetails({
          companyName,
          companyCode: '',
          adminEmail: '',
        });

        if (platform.licensing) {
          await saveLocalOfflineLicense(
            platform.licensing,
            'cloud-org',
            machineFingerprint?.machineId,
          );
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('exzaestate_workspace_provisioned', 'true');
        }

        setCurrentStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to configure cloud API');
      } finally {
        setIsLoading(false);
      }
    },
    [
      platform.apiConfig,
      platform.licensing,
      machineFingerprint?.machineId,
      setCurrentStep,
      setProvisionedDetails,
      updateCompanyData,
    ],
  );

  const createLocalCompany = useCallback(
    async (data: CreateLocalCompanyInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = buildProvisionPayload(data, machineFingerprint?.machineId);
        const result = await postProvisionRequest(payload, platform.apiConfig.localSecret);

        await establishProvisionedSession(setSession, result, data.companyName);
        await saveLocalOfflineLicense(
          platform.licensing,
          result.companyId,
          machineFingerprint?.machineId,
        );

        const finalCompanyCode = result.companyCode || data.companyCode;
        if (!finalCompanyCode) {
          throw new Error('Provisioning failed: company code was not generated');
        }

        setProvisionedDetails({
          companyName: result.companyName || data.companyName,
          companyCode: finalCompanyCode,
          adminEmail: data.adminEmail,
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('exzaestate_workspace_provisioned', 'true');
        }

        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Provisioning failed');
      } finally {
        setIsLoading(false);
      }
    },
    [
      platform.apiConfig,
      platform.licensing,
      machineFingerprint,
      setSession,
      setCurrentStep,
      setProvisionedDetails,
    ],
  );

  const restoreLocalBackup = useCallback(
    async (backupPath: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = platform.apiConfig.localSecret
          ? { 'X-Local-Secret': platform.apiConfig.localSecret }
          : undefined;
        await http.post('/api/v1/local-data/restore', { backupFilePath: backupPath }, { headers });

        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed');
      } finally {
        setIsLoading(false);
      }
    },
    [platform.apiConfig, setCurrentStep],
  );

  const handleBrowseFile = useCallback(async (): Promise<string | null> => {
    try {
      const selected = await platform.fileDialog.open({
        title: 'Select Backup Archive (.exzabackup)',
        multiple: false,
        filters: [{ name: 'ExzaEstate Backup (*.exzabackup)', extensions: ['exzabackup'] }],
      });
      return typeof selected === 'string' ? selected : null;
    } catch {
      return null;
    }
  }, [platform.fileDialog]);

  return {
    currentStep,
    selectedMode,
    isLoading,
    error,
    isAlreadyProvisioned,
    machineFingerprint,
    verificationCodeSent,
    isEmailVerified,
    activeCode,
    provisionedDetails,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    selectMode,
    sendVerificationCode,
    verifyCode,
    configureCloud,
    createLocalCompany,
    restoreLocalBackup,
    handleBrowseFile,
  };
}
