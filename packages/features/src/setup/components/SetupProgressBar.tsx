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
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="card-workspace border border-border bg-surface p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
            Onboarding Progress
          </span>
          <div className="text-hero-num font-bold text-text mt-0.5 tabular-nums">
            {clampedPercentage}% Completed
          </div>
        </div>
        <div className="text-body-sm text-text-2 font-medium bg-surface-sunken px-3.5 py-1.5 rounded-full border border-border self-start sm:self-auto tabular-nums">
          {completedCount} of {totalCount} Requirements Satisfied
        </div>
      </div>

      <div className="w-full bg-surface-sunken rounded-full h-3 overflow-hidden border border-border">
        <div
          className="bg-primary h-3 rounded-full transition-all duration-500 ease-out shadow-xs"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
