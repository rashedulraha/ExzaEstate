import type { PropertyKpiSummary } from '../hooks/usePropertyList.js';

export function PropertyKpiCards({ kpis }: { kpis: PropertyKpiSummary }) {
  const total = kpis.totalUnits || 1;
  const availablePct = Math.round((kpis.availableCount / total) * 100);
  const reservedPct = Math.round((kpis.reservedCount / total) * 100);
  const soldPct = Math.round((kpis.soldCount / total) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Units */}
      <div className="bg-surface/90 hover:bg-surface border border-border hover:border-primary/40 rounded-card p-4 sm:p-5 transition-all duration-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-row items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
              Total Units
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              Master Stock
            </span>
          </div>
          <div className="mt-2.5 flex flex-row items-baseline gap-2">
            <span className="text-hero-num font-bold text-text tabular-nums tracking-tight">
              {kpis.totalUnits}
            </span>
            <span className="text-caption text-text-muted">registered</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
            <div className="h-full bg-text-muted/40 rounded-full w-full" />
          </div>
          <p className="text-caption text-text-muted mt-2">Full Portfolio Volume</p>
        </div>
      </div>

      {/* 2. Available Units */}
      <div className="bg-surface/90 hover:bg-surface border border-border hover:border-success/40 rounded-card p-4 sm:p-5 transition-all duration-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-row items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
              Available
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 tabular-nums">
              {availablePct}% Ready
            </span>
          </div>
          <div className="mt-2.5 flex flex-row items-baseline gap-2">
            <span className="text-hero-num font-bold text-success tabular-nums tracking-tight">
              {kpis.availableCount}
            </span>
            <span className="text-caption text-text-muted">units</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, availablePct)}%` }}
            />
          </div>
          <p className="text-caption text-text-muted mt-2">Ready for Quotation & Sale</p>
        </div>
      </div>

      {/* 3. Reserved & Booked */}
      <div className="bg-surface/90 hover:bg-surface border border-border hover:border-warning/40 rounded-card p-4 sm:p-5 transition-all duration-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-row items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
              Reserved & Booked
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 tabular-nums">
              {reservedPct}% Pipeline
            </span>
          </div>
          <div className="mt-2.5 flex flex-row items-baseline gap-2">
            <span className="text-hero-num font-bold text-warning tabular-nums tracking-tight">
              {kpis.reservedCount}
            </span>
            <span className="text-caption text-text-muted">in negotiation</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
            <div
              className="h-full bg-warning rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, reservedPct)}%` }}
            />
          </div>
          <p className="text-caption text-text-muted mt-2">In Sales Pipeline</p>
        </div>
      </div>

      {/* 4. Sold Units */}
      <div className="bg-surface/90 hover:bg-surface border border-border hover:border-primary/40 rounded-card p-4 sm:p-5 transition-all duration-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-row items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
              Sold Units
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 tabular-nums">
              {soldPct}% Absorbed
            </span>
          </div>
          <div className="mt-2.5 flex flex-row items-baseline gap-2">
            <span className="text-hero-num font-bold text-primary tabular-nums tracking-tight">
              {kpis.soldCount}
            </span>
            <span className="text-caption text-text-muted">closed</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, soldPct)}%` }}
            />
          </div>
          <p className="text-caption text-text-muted mt-2">Deeds & Handover Active</p>
        </div>
      </div>
    </div>
  );
}
