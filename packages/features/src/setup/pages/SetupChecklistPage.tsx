import { Button, LoadingState, ErrorState } from '@exzaestate/ui';
import { useSetupChecklist } from '../hooks/useSetupChecklist.js';
import { SetupProgressBar } from '../components/SetupProgressBar.js';
import { TransactReadyBanner } from '../components/TransactReadyBanner.js';
import { ChecklistCard } from '../components/ChecklistCard.js';

export function SetupChecklistPage() {
  const { checklist, isLoading, isError, refetch } = useSetupChecklist();

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Company Setup Checklist</h1>
          <p className="text-body text-text-muted mt-1">
            Enterprise first-time setup checklist per FLOW-02. Complete mandatory items to enable
            financial operations.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Refresh Status
        </Button>
      </div>

      <SetupProgressBar
        completedCount={checklist.completedCount}
        totalCount={checklist.totalCount}
        percentage={checklist.percentage}
      />

      <TransactReadyBanner canTransact={checklist.canTransact} />

      <div className="space-y-3">
        <h3 className="text-h3 font-semibold text-text">Setup Requirements</h3>
        <div className="space-y-3">
          {checklist.items.map((item) => (
            <ChecklistCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
