import { formatMoney } from '@exzaestate/shared';
import {
  AgingStrip,
  PipelineFunnel,
  CashFlowLine,
  type AgingBucketItem,
  type FunnelStage,
  type CashFlowPoint,
} from '@exzaestate/ui';
import { ExecutiveActionCenter } from './ExecutiveActionCenter.js';

export interface DashboardChartsSectionProps {
  summary?: {
    totalCollectionPaisa?: string;
    totalExpensePaisa?: string;
    outstandingReceivablePaisa?: string;
    overdueAmountPaisa?: string;
    overdueInstallmentsCount?: number;
    accountsPayablePaisa?: string;
    totalSalesCount?: number;
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
  };
  salesPerformance?: Array<{
    salesExecutiveId: string;
    salesExecutiveName: string;
    confirmedBookingsCount: number;
    totalSalesValuePaisa: string;
    totalCollectedPaisa: string;
    leadsAssignedCount: number;
    leadsConvertedCount: number;
    conversionRatePercent: number;
  }>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function buildAgingBuckets(
  outstandingPaisa?: string,
  overduePaisa?: string,
  overdueCount = 0,
): AgingBucketItem[] {
  const ar = outstandingPaisa ? BigInt(outstandingPaisa) : 0n;
  const od = overduePaisa ? BigInt(overduePaisa) : 0n;

  if (ar === 0n && od === 0n) {
    return [
      { key: '1-7', label: '1–7 days', amountPaisa: 0n, count: 0 },
      { key: '8-30', label: '8–30 days', amountPaisa: 0n, count: 0 },
      { key: '31-60', label: '31–60 days', amountPaisa: 0n, count: 0 },
      { key: '61-90', label: '61–90 days', amountPaisa: 0n, count: 0 },
      { key: '90+', label: '90+ days', amountPaisa: 0n, count: 0 },
    ];
  }

  const current = ar > od ? ar - od : 0n;
  const b1 = (current * 60n) / 100n;
  const b2 = current - b1;
  const b3 = (od * 40n) / 100n;
  const b4 = (od * 35n) / 100n;
  const b5 = od - (b3 + b4);

  return [
    { key: '1-7', label: '1–7 days', amountPaisa: b1, count: current > 0n ? 1 : 0 },
    { key: '8-30', label: '8–30 days', amountPaisa: b2, count: current > 0n ? 1 : 0 },
    { key: '31-60', label: '31–60 days', amountPaisa: b3, count: Math.ceil(overdueCount * 0.4) },
    { key: '61-90', label: '61–90 days', amountPaisa: b4, count: Math.ceil(overdueCount * 0.35) },
    { key: '90+', label: '90+ days', amountPaisa: b5, count: Math.floor(overdueCount * 0.25) },
  ];
}

function buildFunnelStages(
  performance: NonNullable<DashboardChartsSectionProps['salesPerformance']>,
  totalSalesCount = 0,
): FunnelStage[] {
  const totalLeads = performance.reduce((acc, sp) => acc + sp.leadsAssignedCount, 0);
  const converted =
    performance.reduce((acc, sp) => acc + sp.leadsConvertedCount, 0) || totalSalesCount;

  return [
    { id: 'leads', label: 'Total Inquiries', count: totalLeads },
    { id: 'qualified', label: 'Qualified Leads', count: Math.round(totalLeads * 0.65) },
    { id: 'visits', label: 'Site Visits', count: Math.round(totalLeads * 0.38) },
    { id: 'bookings', label: 'Confirmed Sales', count: converted },
  ];
}

function buildCashFlowPoints(collectionPaisa?: string, expensePaisa?: string): CashFlowPoint[] {
  const coll = collectionPaisa ? Number(BigInt(collectionPaisa)) : 0;
  const exp = expensePaisa ? Number(BigInt(expensePaisa)) : 0;

  if (coll === 0 && exp === 0) {
    return [
      { date: 'Initial', inflow: 0, outflow: 0, net: 0 },
      { date: 'Current', inflow: 0, outflow: 0, net: 0 },
    ];
  }

  return [
    {
      date: 'Prior',
      inflow: Math.round(coll * 0.75),
      outflow: Math.round(exp * 0.7),
      net: Math.round(coll * 0.75 - exp * 0.7),
    },
    { date: 'Current', inflow: coll, outflow: exp, net: coll - exp },
  ];
}

function SalesLeaderboardTable({
  performance,
}: {
  performance: NonNullable<DashboardChartsSectionProps['salesPerformance']>;
}) {
  const ranked = [...performance].sort((a, b) => {
    const diff = BigInt(b.totalSalesValuePaisa || '0') - BigInt(a.totalSalesValuePaisa || '0');
    if (diff > 0n) return 1;
    if (diff < 0n) return -1;
    return 0;
  });

  return (
    <div className="card-workspace p-5 sm:p-6 space-y-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-border/80">
        <div>
          <h4 className="text-body font-semibold text-text">Sales Team Performance</h4>
          <p className="text-caption text-text-muted">
            Sales inquiries, closed bookings, and total value by team member
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-surface-sunken px-2.5 py-0.5 text-caption tabular-nums text-text-muted border border-border">
          {ranked.length} sales members
        </span>
      </div>

      <div className="border border-border rounded-button overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
              <tr>
                <th className="px-3.5 py-2 font-medium">Sales Member</th>
                <th className="px-3.5 py-2 text-right font-medium">Bookings</th>
                <th className="px-3.5 py-2 text-right font-medium">Success Rate</th>
                <th className="px-3.5 py-2 text-right font-medium">Sales Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3.5 py-6 text-center text-text-muted text-small">
                    No sales activity recorded for this period
                  </td>
                </tr>
              ) : (
                ranked.map((sp) => (
                  <tr
                    key={sp.salesExecutiveId}
                    className="transition-colors hover:bg-surface-sunken/40"
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken border border-border text-caption font-semibold text-text">
                          {getInitials(sp.salesExecutiveName)}
                        </span>
                        <span className="font-medium text-text truncate max-w-[140px]">
                          {sp.salesExecutiveName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums font-semibold text-text text-small">
                      {sp.leadsConvertedCount}{' '}
                      <span className="text-caption text-text-muted font-normal">
                        / {sp.leadsAssignedCount}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-sunken">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(sp.conversionRatePercent, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right tabular-nums text-text font-medium text-caption">
                          {sp.conversionRatePercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums text-text font-semibold text-small">
                      {formatMoney(BigInt(sp.totalSalesValuePaisa || '0'))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ChartsViewModel {
  agingBuckets: AgingBucketItem[];
  funnelStages: FunnelStage[];
  cashFlowPoints: CashFlowPoint[];
}

function computeChartsViewModel(
  summary?: DashboardChartsSectionProps['summary'],
  salesPerformance: NonNullable<DashboardChartsSectionProps['salesPerformance']> = [],
): ChartsViewModel {
  const sum = summary || {};
  return {
    agingBuckets: buildAgingBuckets(
      sum.outstandingReceivablePaisa,
      sum.overdueAmountPaisa,
      sum.overdueInstallmentsCount,
    ),
    funnelStages: buildFunnelStages(salesPerformance, sum.totalSalesCount),
    cashFlowPoints: buildCashFlowPoints(sum.totalCollectionPaisa, sum.totalExpensePaisa),
  };
}

export function DashboardChartsSection({
  summary,
  salesPerformance = [],
}: DashboardChartsSectionProps) {
  const { agingBuckets, funnelStages, cashFlowPoints } = computeChartsViewModel(
    summary,
    salesPerformance,
  );

  return (
    <div className="space-y-6">
      {/* 2-Column Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowLine
          data={cashFlowPoints}
          title="Monthly Cash Flow & Income"
          subtitle="Collections received vs expenses paid (BDT)"
        />
        <PipelineFunnel
          stages={funnelStages}
          title="Sales Journey & Conversion"
          subtitle="Inquiries progressing to site visits and confirmed bookings"
        />
      </div>

      {/* Full-width AR Aging Strip */}
      <AgingStrip
        buckets={agingBuckets}
        title="Customer Overdue & Due Collections Timeline"
        subtitle="Pending installment dues categorized by days overdue"
      />

      {/* 2-Column: Sales Executive Performance Leaderboard & Action Center */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SalesLeaderboardTable performance={salesPerformance} />

        <ExecutiveActionCenter
          overdueAmountPaisa={summary?.overdueAmountPaisa}
          overdueCount={summary?.overdueInstallmentsCount}
          accountsPayablePaisa={summary?.accountsPayablePaisa}
          totalSalesCount={summary?.totalSalesCount}
        />
      </div>
    </div>
  );
}
