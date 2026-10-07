import { useNavigate, useInRouterContext } from 'react-router';
import { formatMoney } from '@exzaestate/shared';

export interface InventoryAbsorptionStripProps {
  inventory?: {
    totalUnits: number;
    availableUnits: number;
    bookedUnits: number;
    soldUnits: number;
    reservedUnits: number;
    blockedUnits: number;
    totalInventoryValuePaisa: string;
    availableInventoryValuePaisa: string;
  };
}

interface InventoryStripViewProps extends InventoryAbsorptionStripProps {
  onNavigate: (path: string) => void;
}

interface ComputedInventoryStats {
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  reservedUnits: number;
  blockedUnits: number;
  totalValuePaisa: bigint;
  availableValuePaisa: bigint;
  pctSold: string;
  pctBooked: string;
  pctAvailable: string;
  pctReserved: string;
  pctBlocked: string;
  absorptionRate: string;
  lockedRevenuePaisa: bigint;
  pipelineRevenuePaisa: bigint;
}

const DEFAULT_INVENTORY = {
  totalUnits: 0,
  availableUnits: 0,
  bookedUnits: 0,
  soldUnits: 0,
  reservedUnits: 0,
  blockedUnits: 0,
  totalInventoryValuePaisa: '0',
  availableInventoryValuePaisa: '0',
};

function calculateInventoryStats(
  raw?: InventoryAbsorptionStripProps['inventory'],
): ComputedInventoryStats {
  const inv = raw || DEFAULT_INVENTORY;
  const total = inv.totalUnits;
  const totalVal = BigInt(inv.totalInventoryValuePaisa || '0');
  const availVal = BigInt(inv.availableInventoryValuePaisa || '0');

  if (total <= 0) {
    return {
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      soldUnits: 0,
      reservedUnits: 0,
      blockedUnits: 0,
      totalValuePaisa: totalVal,
      availableValuePaisa: availVal,
      pctSold: '0.0',
      pctBooked: '0.0',
      pctAvailable: '0.0',
      pctReserved: '0.0',
      pctBlocked: '0.0',
      absorptionRate: '0.0',
      lockedRevenuePaisa: 0n,
      pipelineRevenuePaisa: 0n,
    };
  }

  const safeTotal = BigInt(total);
  const activeCount = inv.soldUnits + inv.bookedUnits;
  return {
    totalUnits: total,
    availableUnits: inv.availableUnits,
    bookedUnits: inv.bookedUnits,
    soldUnits: inv.soldUnits,
    reservedUnits: inv.reservedUnits,
    blockedUnits: inv.blockedUnits,
    totalValuePaisa: totalVal,
    availableValuePaisa: availVal,
    pctSold: ((inv.soldUnits / total) * 100).toFixed(1),
    pctBooked: ((inv.bookedUnits / total) * 100).toFixed(1),
    pctAvailable: ((inv.availableUnits / total) * 100).toFixed(1),
    pctReserved: ((inv.reservedUnits / total) * 100).toFixed(1),
    pctBlocked: ((inv.blockedUnits / total) * 100).toFixed(1),
    absorptionRate: ((activeCount / total) * 100).toFixed(1),
    lockedRevenuePaisa: (totalVal * BigInt(activeCount)) / safeTotal,
    pipelineRevenuePaisa: (totalVal * BigInt(inv.reservedUnits)) / safeTotal,
  };
}

function ValuationMetricsGrid({ stats }: { stats: ComputedInventoryStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      <div className="p-3.5 rounded-button bg-surface-sunken/50 border border-border/70 hover:border-border transition-colors">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Total Asset Valuation
        </span>
        <div className="text-h2 font-bold tabular-nums text-text mt-1">
          {formatMoney(stats.totalValuePaisa)}
        </div>
        <span className="text-[12px] text-text-muted tabular-nums block mt-0.5">
          {stats.totalUnits} units in master plan
        </span>
      </div>

      <div className="p-3.5 rounded-button bg-surface-sunken/50 border border-border/70 hover:border-border transition-colors">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Available Stock Value
        </span>
        <div className="text-h2 font-bold tabular-nums text-success mt-1">
          {formatMoney(stats.availableValuePaisa)}
        </div>
        <span className="text-[12px] text-text-muted tabular-nums block mt-0.5">
          {stats.availableUnits} units ready for sale
        </span>
      </div>

      <div className="p-3.5 rounded-button bg-surface-sunken/50 border border-border/70 hover:border-border transition-colors">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Locked Revenue
        </span>
        <div className="text-h2 font-bold tabular-nums text-text mt-1">
          {formatMoney(stats.lockedRevenuePaisa)}
        </div>
        <span className="text-[12px] text-text-muted tabular-nums block mt-0.5">
          {stats.soldUnits + stats.bookedUnits} sold or booked
        </span>
      </div>

      <div className="p-3.5 rounded-button bg-surface-sunken/50 border border-border/70 hover:border-border transition-colors">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Pipeline In-Discussion
        </span>
        <div className="text-h2 font-bold tabular-nums text-warning mt-1">
          {formatMoney(stats.pipelineRevenuePaisa)}
        </div>
        <span className="text-[12px] text-text-muted tabular-nums block mt-0.5">
          {stats.reservedUnits} reserved plots
        </span>
      </div>
    </div>
  );
}

function AbsorptionLegend({ stats }: { stats: ComputedInventoryStats }) {
  const legendItems = [
    { label: 'Sold', color: 'bg-primary', count: stats.soldUnits, pct: stats.pctSold },
    { label: 'Booked', color: 'bg-special', count: stats.bookedUnits, pct: stats.pctBooked },
    { label: 'Reserved', color: 'bg-warning', count: stats.reservedUnits, pct: stats.pctReserved },
    {
      label: 'Available',
      color: 'bg-success',
      count: stats.availableUnits,
      pct: stats.pctAvailable,
    },
    { label: 'Blocked', color: 'bg-void', count: stats.blockedUnits, pct: stats.pctBlocked },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
      {legendItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 px-3 py-2 rounded-button bg-surface/90 border border-border/70 hover:border-border shadow-2xs transition-all"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0 ring-2 ring-surface`}
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-caption text-text-muted font-medium">{item.label}</span>
            <span className="text-small font-bold tabular-nums text-text">
              {item.count}{' '}
              <span className="text-caption font-normal text-text-muted">({item.pct}%)</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InventoryStripView({ inventory, onNavigate }: InventoryStripViewProps) {
  const stats = calculateInventoryStats(inventory);

  return (
    <div className="card-workspace p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-h2 font-semibold text-text tracking-tight">
              Property Portfolio & Inventory Absorption
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-surface-sunken text-text border border-border tabular-nums">
              {stats.absorptionRate}% Absorbed
            </span>
          </div>
          <p className="text-small text-text-muted mt-0.5">
            Live unit distribution and asset valuation across residential and commercial
            developments
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/properties')}
          className="inline-flex items-center px-3 py-1.5 rounded-button text-small font-medium text-text bg-surface hover:bg-surface-sunken border border-border transition-colors cursor-pointer active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          Plot Plan View
        </button>
      </div>

      <ValuationMetricsGrid stats={stats} />

      <div className="space-y-2">
        <div
          className="h-3.5 w-full rounded-full overflow-hidden flex bg-surface-sunken p-0.5 border border-border"
          role="progressbar"
          aria-valuenow={stats.soldUnits + stats.bookedUnits}
          aria-valuemin={0}
          aria-valuemax={stats.totalUnits}
          aria-label="Unit absorption distribution"
        >
          <div
            style={{ width: `${stats.pctSold}%` }}
            className="h-full bg-primary first:rounded-l-full transition-all duration-300"
            title={`Sold: ${stats.soldUnits} units (${stats.pctSold}%)`}
          />
          <div
            style={{ width: `${stats.pctBooked}%` }}
            className="h-full bg-special transition-all duration-300"
            title={`Booked: ${stats.bookedUnits} units (${stats.pctBooked}%)`}
          />
          <div
            style={{ width: `${stats.pctReserved}%` }}
            className="h-full bg-warning transition-all duration-300"
            title={`Reserved: ${stats.reservedUnits} units (${stats.pctReserved}%)`}
          />
          <div
            style={{ width: `${stats.pctAvailable}%` }}
            className="h-full bg-success transition-all duration-300"
            title={`Available: ${stats.availableUnits} units (${stats.pctAvailable}%)`}
          />
          <div
            style={{ width: `${stats.pctBlocked}%` }}
            className="h-full bg-void last:rounded-r-full transition-all duration-300"
            title={`Blocked/Retained: ${stats.blockedUnits} units (${stats.pctBlocked}%)`}
          />
        </div>

        <AbsorptionLegend stats={stats} />
      </div>
    </div>
  );
}

function RouterInventoryStrip(props: InventoryAbsorptionStripProps) {
  const navigate = useNavigate();
  return <InventoryStripView {...props} onNavigate={navigate} />;
}

export function InventoryAbsorptionStrip(props: InventoryAbsorptionStripProps) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RouterInventoryStrip {...props} />;
  }
  return <InventoryStripView {...props} onNavigate={() => {}} />;
}
