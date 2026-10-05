import { useState } from 'react';
import { LoadingState, ErrorState } from '@exzaestate/ui';
import { useSettings, useNumbering } from '../hooks/useSettings.js';
import { SettingsNavTabs, type SettingsTabId } from '../components/SettingsNavTabs.js';
import { GeneralPolicySettings } from '../components/GeneralPolicySettings.js';
import { SalesPolicySettings } from '../components/SalesPolicySettings.js';
import { FinancialPolicySettings } from '../components/FinancialPolicySettings.js';
import { NumberingPatternsTable } from '../components/NumberingPatternsTable.js';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const { settings, isLoading, isError, refetch, updateBatchSettings, isUpdating } = useSettings();
  const {
    patterns,
    isLoading: isLoadingPatterns,
    updatePattern,
    isUpdating: isUpdatingPattern,
  } = useNumbering();

  if (isLoading || (activeTab === 'numbering' && isLoadingPatterns)) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Settings"
        message="Unable to retrieve tenant configuration. Please check permissions."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Company Settings & Policies</h1>
          <p className="text-body text-text-muted mt-1">
            Enterprise system configurations, statutory accounting defaults, and document numbering
            series.
          </p>
        </div>
      </div>

      <SettingsNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'general' && (
        <GeneralPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      )}

      {activeTab === 'sales' && (
        <SalesPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      )}

      {activeTab === 'finance' && (
        <FinancialPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      )}

      {activeTab === 'numbering' && (
        <NumberingPatternsTable
          patterns={patterns}
          onUpdatePattern={updatePattern}
          isUpdating={isUpdatingPattern}
        />
      )}
    </div>
  );
}
