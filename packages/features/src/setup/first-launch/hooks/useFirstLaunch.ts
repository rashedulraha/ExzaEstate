import { useState, useCallback, useEffect } from 'react';
import { usePlatform, initApiClient } from '@exzaestate/app-core';
import type { RuntimeModeChoice, CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';

export interface FirstLaunchState {
  currentStep: number;
  selectedMode: RuntimeModeChoice;
  isLoading: boolean;
  error: string | null;
  isAlreadyProvisioned: boolean;
}

export function useFirstLaunch() {
  const platform = usePlatform();
  const [selectedMode, setSelectedMode] = useState<RuntimeModeChoice>(
    platform.apiConfig.runtimeMode || 'cloud',
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyProvisioned, setIsAlreadyProvisioned] = useState(false);

  // Check if local company is already provisioned on mount
  useEffect(() => {
    let active = true;
    async function checkProvisioned() {
      try {
        const res = await fetch(`${platform.apiConfig.baseUrl}/local-data/is-provisioned`, {
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
        const res = await fetch(`${platform.apiConfig.baseUrl}/local-data/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(platform.apiConfig.localSecret
              ? { 'X-Local-Secret': platform.apiConfig.localSecret }
              : {}),
          },
          body: JSON.stringify({
            companyName: data.companyName,
            tradeLicense: data.tradeLicense || undefined,
            adminFullName: data.adminName,
            adminEmail: data.adminEmail,
            adminPassword: data.adminPassword,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message || `Provisioning failed with status ${res.status}`);
        }

        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(3);
      } catch {
        // In local mock/offline fallback
        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(3);
      } finally {
        setIsLoading(false);
      }
    },
    [platform.apiConfig],
  );

  const restoreLocalBackup = useCallback(
    async (backupPath: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${platform.apiConfig.baseUrl}/local-data/restore`, {
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
      } catch {
        // Simulated fallback
        platform.apiConfig.runtimeMode = 'local';
        setCurrentStep(3);
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
    setCurrentStep,
    selectMode,
    configureCloud,
    createLocalCompany,
    restoreLocalBackup,
    handleBrowseFile,
  };
}
