export interface SetupProgressBarProps {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export function SetupProgressBar({
  completedCount,
  totalCount,
  percentage,
}: SetupProgressBarProps) {
  return (
    <div className="rounded-card border border-border bg-surface-elevated p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Onboarding Progress
          </span>
          <div className="text-h2 font-bold text-text mt-0.5">{percentage}% Completed</div>
        </div>
        <div className="text-body-sm text-text-muted font-medium bg-surface-sunken px-3 py-1.5 rounded-full border border-border self-start sm:self-auto">
          {completedCount} of {totalCount} Requirements Satisfied
        </div>
      </div>

      <div className="w-full bg-surface-sunken rounded-full h-3 overflow-hidden border border-border/50">
        <div
          className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
