import { Hash, Calendar, Layers, Clock } from 'lucide-react';
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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Document Series
          </span>
          <Hash className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
          {patternsCount} Active
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Fiscal Period
          </span>
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
          {fiscalMonthName} 1
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Land Conversion
          </span>
          <Layers className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
          4 Units (BD)
        </span>
      </div>

      <div className="card-stat">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Nightly Job Time
          </span>
          <Clock className="w-4 h-4 text-text-muted" />
        </div>
        <span className="text-hero-num font-bold text-text-2 mt-1.5 block tabular-nums">
          {typeof nightlyJobTime === 'string' && nightlyJobTime ? nightlyJobTime : '00:30'} BST
        </span>
      </div>
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
