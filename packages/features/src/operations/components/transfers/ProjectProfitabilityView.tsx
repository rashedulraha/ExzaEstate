import { DollarSign, TrendingUp, TrendingDown, Download, Building } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button } from '@exzaestate/ui';
import type { ProjectProfitabilityItem } from '../../schemas/operations.schema.js';

export interface ProjectProfitabilityViewProps {
  profitability: ProjectProfitabilityItem | null;
  isLoading?: boolean;
  onExport?: () => void;
}

export function ProjectProfitabilityView({
  profitability,
  isLoading,
  onExport,
}: ProjectProfitabilityViewProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading project financial analytics...</p>
      </div>
    );
  }

  if (!profitability) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/30 p-6 text-center">
        <Building className="mb-2 h-8 w-8 text-text-muted" />
        <p className="text-body font-medium text-text">No project selected</p>
        <p className="mt-1 text-caption text-text-muted">
          Select a development project to review profitability, revenues, and cost breakdowns.
        </p>
      </div>
    );
  }

  const revenuePaisa = BigInt(profitability.totalRevenuePaisa);
  const costPaisa = BigInt(profitability.totalCostPaisa);
  const profitPaisa = BigInt(profitability.netProfitPaisa);
  const isProfitable = profitability.isProfitable && profitPaisa >= 0n;

  const costBreakdown = profitability.costBreakdown;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h2 font-semibold text-text">{profitability.projectName}</h2>
            <span className="font-mono text-caption text-text-muted">
              ({profitability.projectCode})
            </span>
          </div>
          <p className="text-caption text-text-muted">
            Consolidated Project Profitability & Cost Ledger
          </p>
        </div>
        {onExport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Export P&L Report
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-stat">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="text-th">Total Realized Revenue</span>
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-hero-num font-bold text-text tabular-nums">
            {formatMoney(revenuePaisa)}
          </div>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="text-th">Total Project Costs</span>
            <DollarSign className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-2 text-hero-num font-bold text-text tabular-nums">
            {formatMoney(costPaisa)}
          </div>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="text-th">Net Operating Margin</span>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
          </div>
          <div
            className={`mt-2 text-hero-num font-bold tabular-nums ${
              isProfitable ? 'text-success' : 'text-danger'
            }`}
          >
            {formatMoney(profitPaisa)}
          </div>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="text-th">Profit Margin (%)</span>
            <span
              className={`rounded-full px-2 py-0.5 text-caption font-semibold ${
                isProfitable
                  ? 'border border-success/30 bg-success/10 text-success'
                  : 'border border-danger/30 bg-danger/10 text-danger'
              }`}
            >
              {isProfitable ? 'PROFITABLE' : 'LOSS-MAKING'}
            </span>
          </div>
          <div
            className={`mt-2 text-hero-num font-bold tabular-nums ${
              isProfitable ? 'text-success' : 'text-danger'
            }`}
          >
            {profitability.profitMarginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-4 text-th">Cost Breakdown by Category (BDT)</h3>
        <div className="space-y-3">
          {[
            { label: 'Land Acquisition & Legal', amount: BigInt(costBreakdown.landCostPaisa) },
            {
              label: 'Development & Construction',
              amount: BigInt(costBreakdown.developmentCostPaisa),
            },
            {
              label: 'Marketing & Broker Commission',
              amount: BigInt(costBreakdown.marketingCostPaisa),
            },
            {
              label: 'Administrative & Site Overheads',
              amount: BigInt(costBreakdown.adminCostPaisa),
            },
            { label: 'Other Operational Expenses', amount: BigInt(costBreakdown.otherCostPaisa) },
          ].map((item, idx) => {
            const pct = costPaisa > 0n ? Number((item.amount * 10000n) / costPaisa) / 100 : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-small">
                  <span className="text-text-2">{item.label}</span>
                  <span className="font-medium text-text tabular-nums">
                    {formatMoney(item.amount)}{' '}
                    <span className="text-caption text-text-muted">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
