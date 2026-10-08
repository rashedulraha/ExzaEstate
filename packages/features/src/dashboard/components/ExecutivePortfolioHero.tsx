import { Building2, TrendingUp, ShieldCheck, ArrowUpRight, Layers } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';

export interface ExecutivePortfolioHeroProps {
  summary?: {
    totalSalesPaisa?: string;
    totalCollectionPaisa?: string;
    cashBankBalancePaisa?: string;
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
    performance?: {
      leadConversionRatePercent: number;
      collectionEfficiencyPercent: number;
    };
  };
  onNavigate?: (path: string) => void;
}

interface HeroMetricCardProps {
  label: string;
  value: string;
  subtext: string;
  badge?: string;
  badgeType?: 'primary' | 'success' | 'warning';
}

function HeroMetricCard({
  label,
  value,
  subtext,
  badge,
  badgeType = 'primary',
}: HeroMetricCardProps) {
  const badgeClasses = {
    primary: 'bg-primary/10 text-primary border-primary/25',
    success: 'bg-success/10 text-success border-success/25',
    warning: 'bg-warning/10 text-warning border-warning/25',
  };

  return (
    <div className="flex flex-col justify-between p-4 rounded-card bg-surface border border-border hover:border-primary/40 transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {badge && (
          <span
            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border tabular-nums ${badgeClasses[badgeType]}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-h2 sm:text-h1 font-bold text-text tracking-tight tabular-nums font-sans">
          {value}
        </div>
        <p className="text-[12px] text-text-muted mt-1 truncate">{subtext}</p>
      </div>
    </div>
  );
}

export type ExecutivePortfolioInventory = NonNullable<
  ExecutivePortfolioHeroProps['summary']
>['inventory'];

function calculateAbsorptionStats(inventory?: ExecutivePortfolioInventory) {
  if (!inventory) {
    return {
      total: 0,
      sold: 0,
      booked: 0,
      activeCount: 0,
      absorptionPct: '0.0',
      totalValPaisa: 0n,
      availableValPaisa: 0n,
    };
  }

  const total = inventory.totalUnits;
  const sold = inventory.soldUnits;
  const booked = inventory.bookedUnits;
  const activeCount = sold + booked;

  const absorptionPct = total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0.0';
  const totalValPaisa = BigInt(inventory.totalInventoryValuePaisa ?? '0');
  const availableValPaisa = BigInt(inventory.availableInventoryValuePaisa ?? '0');

  return {
    total,
    sold,
    booked,
    activeCount,
    absorptionPct,
    totalValPaisa,
    availableValPaisa,
  };
}

export function ExecutivePortfolioHero({ summary, onNavigate }: ExecutivePortfolioHeroProps) {
  const stats = calculateAbsorptionStats(summary?.inventory);
  const totalCollection = summary?.totalCollectionPaisa ? BigInt(summary.totalCollectionPaisa) : 0n;
  const cashBank = summary?.cashBankBalancePaisa ? BigInt(summary.cashBankBalancePaisa) : 0n;
  const efficiency = summary?.performance?.collectionEfficiencyPercent ?? 0;

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-surface p-5 sm:p-6 lg:p-7">
      {/* Subtle Architectural Ambient Glow */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-success/5 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-6">
        {/* Banner Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <Building2 className="w-3.5 h-3.5" />
                Portfolio Summary
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-sunken text-text-muted border border-border">
                <ShieldCheck className="w-3 h-3 text-success" />
                Accounts Verified
              </span>
            </div>
            <h2 className="text-h2 sm:text-h1 font-bold text-text tracking-tight">
              Total Portfolio Value & Sales Summary
            </h2>
            <p className="text-small text-text-muted">
              Live summary across all housing projects, residential plots, apartments, and
              commercial units.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate?.('/properties')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-small font-medium text-text bg-surface hover:bg-surface-sunken border border-border transition-all cursor-pointer active:scale-[0.98]"
            >
              <Layers className="w-3.5 h-3.5 text-text-muted" />
              <span>View Properties</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('/reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-small font-medium text-text bg-surface hover:bg-surface-sunken border border-border transition-all cursor-pointer active:scale-[0.98]"
            >
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span>Financial Reports</span>
            </button>
          </div>
        </div>

        {/* 4 Spotlight Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
          <HeroMetricCard
            label="Total Property Value"
            value={formatMoney(stats.totalValPaisa)}
            subtext={`${stats.total} total units across all projects`}
            badge="Total Value"
            badgeType="primary"
          />

          <HeroMetricCard
            label="Sales Progress"
            value={`${stats.absorptionPct}%`}
            subtext={`${stats.activeCount} units booked or confirmed sold`}
            badge="Sold / Booked"
            badgeType="primary"
          />

          <HeroMetricCard
            label="Collections Received"
            value={formatMoney(totalCollection)}
            subtext={`${efficiency}% collection efficiency`}
            badge="Received"
            badgeType="success"
          />

          <HeroMetricCard
            label="Cash & Bank Balance"
            value={formatMoney(cashBank)}
            subtext="Available in company bank accounts & cash"
            badge="Available Funds"
            badgeType="success"
          />
        </div>
      </div>
    </div>
  );
}
