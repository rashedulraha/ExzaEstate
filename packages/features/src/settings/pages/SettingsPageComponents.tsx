import { Hash, Calendar, Layers, Clock } from 'lucide-react';
import { StatCard } from '@exzaestate/ui';
import type { NumberingPatternItem, NumberingPatternFormData } from '../schemas/settings.schema.js';
import type { SettingsTabId } from '../components/SettingsNavTabs.js';
import { GeneralPolicySettings } from '../components/GeneralPolicySettings.js';
import { SalesPolicySettings } from '../components/SalesPolicySettings.js';
import { FinancialPolicySettings } from '../components/FinancialPolicySettings.js';
import { NumberingPatternsTable } from '../components/NumberingPatternsTable.js';
import { AccountProfileSettings } from '../components/AccountProfileSettings.js';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function getFiscalMonthName(monthVal?: unknown): string {
  const m = Number(monthVal) || 7;
  return MONTH_NAMES[m - 1] ?? 'July';
}

export function SettingsKpiCards({
  patternsCount,
  fiscalMonthName,
  nightlyJobTime,
}: {
  patternsCount: number;
  fiscalMonthName: string;
  nightlyJobTime?: unknown;
}) {
  const formattedTime =
    typeof nightlyJobTime === 'string' && nightlyJobTime ? nightlyJobTime : '00:30';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Document Series"
        value={`${patternsCount} Active`}
        icon={<Hash className="w-4 h-4" />}
      />
      <StatCard
        label="Fiscal Period"
        value={`${fiscalMonthName} 1`}
        variant="brand"
        icon={<Calendar className="w-4 h-4" />}
      />
      <StatCard
        label="Land Conversion"
        value="4 Units (BD)"
        icon={<Layers className="w-4 h-4" />}
      />
      <StatCard
        label="Nightly Job Time"
        value={`${formattedTime} BST`}
        icon={<Clock className="w-4 h-4" />}
      />
    </div>
  );
}

export interface SettingsTabContentProps {
  activeTab: SettingsTabId;
  settings: Record<string, unknown>;
  updateBatchSettings: (items: { key: string; value: unknown }[]) => Promise<unknown>;
  isUpdating: boolean;
  patterns: NumberingPatternItem[];
  updatePattern: (documentType: string, data: NumberingPatternFormData) => Promise<unknown>;
  isUpdatingPattern: boolean;
}

export function SettingsTabContent(props: SettingsTabContentProps) {
  const {
    activeTab,
    settings,
    updateBatchSettings,
    isUpdating,
    patterns,
    updatePattern,
    isUpdatingPattern,
  } = props;

  switch (activeTab) {
    case 'general':
      return (
        <GeneralPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      );
    case 'sales':
      return (
        <SalesPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      );
    case 'finance':
      return (
        <FinancialPolicySettings
          settings={settings}
          onSave={updateBatchSettings}
          isSaving={isUpdating}
        />
      );
    case 'numbering':
      return (
        <NumberingPatternsTable
          patterns={patterns}
          onUpdatePattern={updatePattern}
          isUpdating={isUpdatingPattern}
        />
      );
    case 'profile':
      return <AccountProfileSettings />;
    default:
      return null;
  }
}
