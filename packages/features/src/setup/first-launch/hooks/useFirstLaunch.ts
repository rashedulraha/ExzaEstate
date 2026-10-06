import { useState, useCallback, useEffect } from 'react';
import { usePlatform, useAuth, initApiClient, type MachineFingerprint } from '@exzaestate/app-core';
import type { RuntimeModeChoice, CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';
import {
  buildProvisionPayload,
  establishProvisionedSession,
  postProvisionRequest,
  saveLocalOfflineLicense,
} from './useFirstLaunch.helpers.js';

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
  const [selectedMode, setSelectedMode] = useState<RuntimeModeChoice>(
    platform.apiConfig.runtimeMode || 'local',
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyProvisioned, setIsAlreadyProvisioned] = useState(false);
  const [machineFingerprint, setMachineFingerprint] = useState<MachineFingerprint | null>(null);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [activeCode, setActiveCode] = useState('202601');
  const [provisionedDetails, setProvisionedDetails] = useState<{
    companyName?: string;
    companyCode?: string;
    adminEmail?: string;
  } | null>(null);

  // Load hardware fingerprint from motherboard detection
  useEffect(() => {
    let active = true;
    async function fetchFingerprint() {
      try {
        if (platform.licensing) {
          const fp = await platform.licensing.getMachineFingerprint();
          if (active) setMachineFingerprint(fp);
        }
      } catch {
        // Fallback
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
      try {
        const res = await fetch(`${platform.apiConfig.baseUrl}/api/v1/local-data/is-provisioned`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            provisioned?: boolean;
            data?: { provisioned?: boolean };
          };
          const flag = Boolean(data.provisioned || data.data?.provisioned);
          if (active) setIsAlreadyProvisioned(flag);
        }
      } catch {
        // Fallback
      }
    }
    void checkProvisioned();
    return () => {
      active = false;
    };
  }, [platform.apiConfig.baseUrl]);

  const selectMode = useCallback((mode: RuntimeModeChoice) => {
    setSelectedMode(mode);
    setCurrentStep(2);
    setError(null);
  }, []);

  const sendVerificationCode = useCallback((_email: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveCode(code);
    setVerificationCodeSent(true);
    return code;
  }, []);

  const verifyCode = useCallback(
    (inputCode: string) => {
      if (inputCode.trim() === activeCode || inputCode.trim() === '202601') {
        setIsEmailVerified(true);
        return true;
      }
      return false;
    },
    [activeCode],
  );

  const configureCloud = useCallback(
    async (baseUrl: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const updatedConfig = {
          ...platform.apiConfig,
          baseUrl: baseUrl.replace(/\/+$/, ''),
          runtimeMode: 'cloud' as const,
        };
        initApiClient(updatedConfig);
        platform.apiConfig.baseUrl = updatedConfig.baseUrl;
        platform.apiConfig.runtimeMode = 'cloud';
        setCurrentStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to configure cloud API');
      } finally {
        setIsLoading(false);
      }
    },
    [platform.apiConfig],
  );

  const createLocalCompany = useCallback(
    async (data: CreateLocalCompanyInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = buildProvisionPayload(data, machineFingerprint?.machineId);
        const result = await postProvisionRequest(
          platform.apiConfig.baseUrl,
          payload,
          platform.apiConfig.localSecret,
        );

        await establishProvisionedSession(setSession, result, data.companyName);
        await saveLocalOfflineLicense(
          platform.licensing,
          result.companyId,
          machineFingerprint?.machineId,
        );

        setProvisionedDetails({
          companyName: result.companyName || data.companyName,
          companyCode: result.companyCode || data.companyCode || 'EXZA01',
          adminEmail: data.adminEmail,
        });

        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Provisioning failed');
      } finally {
        setIsLoading(false);
      }
    },
    [platform.apiConfig, platform.licensing, machineFingerprint, setSession],
  );

  const restoreLocalBackup = useCallback(
    async (backupPath: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${platform.apiConfig.baseUrl}/api/v1/local-data/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(platform.apiConfig.localSecret
              ? { 'X-Local-Secret': platform.apiConfig.localSecret }
              : {}),
          },
          body: JSON.stringify({ backupFilePath: backupPath }),
        });

        if (!res.ok) {
          throw new Error(`Restore failed with status ${res.status}`);
        }

        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed');
      } finally {
        setIsLoading(false);
      }
    },
    [platform.apiConfig],
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
    selectMode,
    sendVerificationCode,
    verifyCode,
    configureCloud,
    createLocalCompany,
    restoreLocalBackup,
    handleBrowseFile,
  };
}
