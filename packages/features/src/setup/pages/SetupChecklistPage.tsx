import { useState, useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { useSetupChecklist } from '../hooks/useSetupChecklist.js';
import type { SetupChecklistItem } from '../schemas/setup.schema.js';
import { SetupProgressBar } from '../components/SetupProgressBar.js';
import { TransactReadyBanner } from '../components/TransactReadyBanner.js';
import { ChecklistCard } from '../components/ChecklistCard.js';
import {
  SetupChecklistHeader,
  SetupChecklistKpis,
  type SetupKpiStats,
} from './SetupChecklistComponents.js';

type ChecklistFilter = 'ALL' | 'MANDATORY' | 'PENDING' | 'COMPLETED';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Items' },
  { id: 'MANDATORY', label: 'Mandatory' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'COMPLETED', label: 'Completed' },
] as const;

function matchesChecklistFilter(item: SetupChecklistItem, filter: ChecklistFilter): boolean {
  switch (filter) {
    case 'MANDATORY':
      return item.isMandatory;
    case 'PENDING':
      return !item.isCompleted;
    case 'COMPLETED':
      return item.isCompleted;
    default:
      return true;
  }
}

export function SetupChecklistPage() {
  const { checklist, isLoading, isError, refetch } = useSetupChecklist();
  const [filter, setFilter] = useState<ChecklistFilter>('ALL');

  const kpis: SetupKpiStats = useMemo(() => {
    if (!checklist) {
      return { completed: 0, total: 0, percentage: 0, mandatoryPending: 0 };
    }
    const mandatoryPending = checklist.items.filter(
      (item) => item.isMandatory && !item.isCompleted,
    ).length;
    return {
      completed: checklist.completedCount,
      total: checklist.totalCount,
      percentage: checklist.percentage,
      mandatoryPending,
    };
  }, [checklist]);

  const filteredItems = useMemo(() => {
    if (!checklist) return [];
    return checklist.items.filter((item) => matchesChecklistFilter(item, filter));
  }, [checklist, filter]);

  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError || !checklist) {
    return (
      <ErrorState
        title="Failed to Load Setup Checklist"
        message="Unable to verify organizational onboarding progress. Please retry."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="container-page space-y-6">
      <SetupChecklistHeader canTransact={checklist.canTransact} onRefresh={() => void refetch()} />

      <SetupChecklistKpis kpis={kpis} canTransact={checklist.canTransact} />

      <SetupProgressBar
        completedCount={checklist.completedCount}
        totalCount={checklist.totalCount}
        percentage={checklist.percentage}
      />

      <TransactReadyBanner canTransact={checklist.canTransact} />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <h3 className="text-h3 font-semibold text-text">Setup Requirements</h3>

          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            {FILTER_TABS.map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1 text-caption font-medium rounded-button transition-colors cursor-pointer ${
                    isActive ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<ListChecks className="w-8 h-8" />}
              title="No Checklist Items Found"
              description="No onboarding items match the selected filter criteria."
              dashedBorder
              actionLabel="Show All Items"
              actionVariant="secondary"
              onAction={() => setFilter('ALL')}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ChecklistCard key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
