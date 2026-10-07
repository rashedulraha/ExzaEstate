import { type ReactElement, useState } from 'react';
import { http } from '@exzaestate/api-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getEnvApiBaseUrl, getEnvInitialLicenseKey } from '@exzaestate/app-core';
import { Button, FormField, Input } from '@exzaestate/ui';
import { cloudConfigSchema, type CloudConfigInput } from '../schemas/first-launch.schema.js';
import { CloudStatusRow, CloudAdvancedSettings } from './CloudSetupComponents.js';

interface CloudSetupSectionProps {
  initialBaseUrl?: string;
  initialCompanyName?: string;
  initialLicenseKey?: string;
  initialShowAdvanced?: boolean;
  onConfirm: (config: CloudConfigInput | string) => void;
  isConnecting?: boolean;
  onBack?: () => void;
}

function resolveDefaultString(custom?: string, fallback = ''): string {
  if (custom && custom.trim()) return custom.trim();
  return fallback;
}

export function CloudSetupSection({
  initialBaseUrl,
  initialCompanyName,
  initialLicenseKey,
  initialShowAdvanced = false,
  onConfirm,
  isConnecting = false,
  onBack,
}: CloudSetupSectionProps): ReactElement {
  const defaultBaseUrl = resolveDefaultString(initialBaseUrl, getEnvApiBaseUrl());
  const defaultCompanyName = resolveDefaultString(initialCompanyName);
  const defaultLicenseKey = resolveDefaultString(initialLicenseKey, getEnvInitialLicenseKey());

  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CloudConfigInput>({
    resolver: zodResolver(cloudConfigSchema),
    defaultValues: {
      companyName: defaultCompanyName,
      licenseKey: defaultLicenseKey,
      baseUrl: defaultBaseUrl,
    },
  });

  const currentUrl = resolveDefaultString(watch('baseUrl'), defaultBaseUrl);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Verifying connection to cloud server...');
    try {
      const cleanUrl = currentUrl.replace(/\/+$/, '');
      await http.get(`${cleanUrl}/health`, { timeout: 4000 });
      setTestStatus('success');
      setTestMessage('Cloud endpoint connection verified. Enterprise server is active.');
    } catch (err) {
      setTestStatus('failed');
      const detail = err instanceof Error ? err.message : 'Please check network.';
      setTestMessage(`Server connection failed: ${detail}`);
    }
  };

  const onSubmit = (data: CloudConfigInput) => {
    const finalUrl = resolveDefaultString(data.baseUrl, defaultBaseUrl);
    onConfirm({
      companyName: data.companyName.trim(),
      licenseKey: data.licenseKey.trim(),
      baseUrl: finalUrl,
    });
  };

  return (
    <div className="flex flex-col justify-between flex-1 space-y-4">
      <div>
        <h2 className="text-h2 font-bold text-text">Cloud Workspace Setup</h2>
        <p className="mt-1 text-body text-text-muted leading-relaxed">
          Enter your company details and license key to connect to ExzaEstate Cloud for multi-user
          collaboration.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          id="cloud-companyName"
          label="Legal Company Name"
          required
          error={errors.companyName?.message}
          helperText="Enter your official real estate organization or business name"
        >
          <Input
            id="cloud-companyName"
            placeholder="e.g. Exzazon Real Estate Ltd."
            {...register('companyName')}
            autoFocus
          />
        </FormField>

        <FormField
          id="cloud-licenseKey"
          label="Software Purchase License Key"
          required
          error={errors.licenseKey?.message}
          helperText="Enter the enterprise license key from your purchase receipt"
        >
          <Input
            id="cloud-licenseKey"
            placeholder="e.g. EXZA-XXXX-XXXX-XXXX-XXXX"
            {...register('licenseKey')}
          />
        </FormField>

        <CloudStatusRow />

        <CloudAdvancedSettings
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          defaultBaseUrl={defaultBaseUrl}
          errorMessage={errors.baseUrl?.message}
          register={register}
          onTestConnection={() => void handleTestConnection()}
          isConnecting={isConnecting}
          testStatus={testStatus}
          testMessage={testMessage}
        />

        <div className="pt-4 flex items-center justify-between border-t border-border/40">
          {onBack ? (
            <Button type="button" variant="secondary" onClick={onBack} disabled={isConnecting}>
              ← Back to Choose Mode
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={isConnecting}
            isLoading={isConnecting}
            className="px-6 py-2.5 font-semibold text-btn shadow-sm"
          >
            {isConnecting ? 'Connecting to Cloud...' : 'Save & Connect to Cloud →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
