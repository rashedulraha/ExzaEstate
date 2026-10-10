import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Breadcrumbs, LoadingState, ErrorState } from '@exzaestate/ui';
import { useSettings, useNumbering } from '../hooks/useSettings.js';
import { SettingsNavTabs, type SettingsTabId } from '../components/SettingsNavTabs.js';
import {
  getFiscalMonthName,
  SettingsKpiCards,
  SettingsTabContent,
} from './SettingsPageComponents.js';

const VALID_TABS: readonly SettingsTabId[] = [
  'general',
  'sales',
  'finance',
  'numbering',
  'profile',
];

function resolveInitialTab(tabParam: string | null): SettingsTabId {
  if (tabParam && VALID_TABS.includes(tabParam as SettingsTabId)) {
    return tabParam as SettingsTabId;
  }
  return 'general';
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    resolveInitialTab(searchParams.get('tab')),
  );

  const { settings, isLoading, isError, refetch, updateBatchSettings, isUpdating } = useSettings();
  const {
    patterns,
    isLoading: isLoadingPatterns,
    updatePattern,
    isUpdating: isUpdatingPattern,
  } = useNumbering();

  const handleTabChange = (tab: SettingsTabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const isDataLoading = isLoading || (activeTab === 'numbering' && isLoadingPatterns);

  if (isDataLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Settings"
        message="Unable to load company settings. Please refresh or check your connection."
        onRetry={() => refetch()}
      />
    );
  }

  const fiscalMonthName = getFiscalMonthName(settings.fiscal_year_start_month);

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Workspace & Admin' },
              { label: 'Company Settings' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Company Settings & Policies</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-primary border border-primary/20">
              FY 2026-27 Active
            </span>
          </div>
          <p className="text-body text-text-muted mt-1">
            Manage company preferences, financial calendar, sales rules, and document numbering.
          </p>
        </div>
      </div>

      <SettingsKpiCards
        patternsCount={patterns.length}
        fiscalMonthName={fiscalMonthName}
        nightlyJobTime={settings.nightly_job_time}
      />

      <SettingsNavTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <SettingsTabContent
        activeTab={activeTab}
        settings={settings}
        updateBatchSettings={updateBatchSettings}
        isUpdating={isUpdating}
        patterns={patterns}
        updatePattern={updatePattern}
        isUpdatingPattern={isUpdatingPattern}
      />
    </div>
  );
}
