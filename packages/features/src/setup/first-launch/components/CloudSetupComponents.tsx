import type { ReactElement } from 'react';
import type { UseFormRegister } from 'react-hook-form';
import { Button, FormField, Input } from '@exzaestate/ui';
import type { CloudConfigInput } from '../schemas/first-launch.schema.js';

export function CloudStatusRow(): ReactElement {
  return (
    <div className="p-3.5 rounded-card border border-border/60 bg-surface-sunken/40 flex items-center justify-between gap-3 text-caption">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-success shrink-0" />
        <div>
          <span className="font-semibold text-text">Cloud Gateway: Connected & Ready</span>
          <p className="text-caption text-text-muted">
            Multi-branch real-time sync & automatic cloud backups active
          </p>
        </div>
      </div>
      <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-semibold text-success shrink-0">
        System Online
      </span>
    </div>
  );
}

export interface CloudAdvancedSettingsProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  defaultBaseUrl: string;
  errorMessage?: string;
  register: UseFormRegister<CloudConfigInput>;
  onTestConnection: () => void;
  isConnecting: boolean;
  testStatus: 'idle' | 'testing' | 'success' | 'failed';
  testMessage: string;
}

export function CloudAdvancedSettings(props: CloudAdvancedSettingsProps): ReactElement {
  const {
    showAdvanced,
    onToggleAdvanced,
    defaultBaseUrl,
    errorMessage,
    register,
    onTestConnection,
    isConnecting,
    testStatus,
    testMessage,
  } = props;

  const isTesting = testStatus === 'testing';
  const isSuccess = testStatus === 'success';

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="text-caption text-text-muted hover:text-text font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>{showAdvanced ? '▼' : '▶'}</span>
        <span>Advanced Server Settings (Optional)</span>
      </button>

      {showAdvanced && (
        <div className="mt-3 p-4 rounded-card border border-border/60 bg-surface-sunken/40 space-y-3">
          <FormField
            id="cloud-baseUrl"
            label="Enterprise Server URL (Optional)"
            error={errorMessage}
            helperText={`Leave empty to connect to default cloud server (${defaultBaseUrl})`}
          >
            <div className="flex gap-2">
              <Input
                id="cloud-baseUrl"
                placeholder={defaultBaseUrl || 'https://api.exzaestate.com'}
                {...register('baseUrl')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onTestConnection}
                disabled={isConnecting || isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </FormField>

          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-card border text-caption flex items-start gap-2 ${
                isSuccess
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-danger/10 border-danger/30 text-danger'
              }`}
            >
              <span className="font-bold">{isSuccess ? '✓' : '⚠'}</span>
              <span className="flex-1 font-medium">{testMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
