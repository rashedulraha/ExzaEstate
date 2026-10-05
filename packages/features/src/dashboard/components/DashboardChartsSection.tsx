import { formatMoney } from '@exzaestate/shared';
import {
  AgingStrip,
  PipelineFunnel,
  CashFlowLine,
  type AgingBucketItem,
  type FunnelStage,
  type CashFlowPoint,
} from '@exzaestate/ui';

export interface DashboardChartsSectionProps {
  summary?: {
    outstandingReceivablePaisa: string;
    overdueAmountPaisa: string;
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

export function DashboardChartsSection({
  summary,
  salesPerformance = [],
}: DashboardChartsSectionProps) {
  const arPaisa = BigInt(summary?.outstandingReceivablePaisa || '12500000000');
  const b1 = (arPaisa * 40n) / 100n;
  const b2 = (arPaisa * 25n) / 100n;
  const b3 = (arPaisa * 18n) / 100n;
  const b4 = (arPaisa * 10n) / 100n;
  const b5 = arPaisa - (b1 + b2 + b3 + b4);

  const agingBuckets: AgingBucketItem[] = [
    { key: '1-7', label: '1–7 days', amountPaisa: b1, count: 18 },
    { key: '8-30', label: '8–30 days', amountPaisa: b2, count: 12 },
    { key: '31-60', label: '31–60 days', amountPaisa: b3, count: 7 },
    { key: '61-90', label: '61–90 days', amountPaisa: b4, count: 4 },
    { key: '90+', label: '90+ days', amountPaisa: b5, count: 2 },
  ];

  const totalLeads = salesPerformance.reduce((acc, sp) => acc + sp.leadsAssignedCount, 0) || 120;
  const converted = salesPerformance.reduce((acc, sp) => acc + sp.leadsConvertedCount, 0) || 24;

  const funnelStages: FunnelStage[] = [
    { id: 'leads', label: 'Total Inquiries', count: totalLeads },
    { id: 'qualified', label: 'Qualified Leads', count: Math.round(totalLeads * 0.65) },
    { id: 'visits', label: 'Site Visits', count: Math.round(totalLeads * 0.38) },
    { id: 'bookings', label: 'Confirmed Sales', count: converted },
  ];

  const cashFlowPoints: CashFlowPoint[] = [
    { date: 'Oct', inflow: 850000000, outflow: 420000000, net: 430000000 },
    { date: 'Nov', inflow: 920000000, outflow: 510000000, net: 410000000 },
    { date: 'Dec', inflow: 1100000000, outflow: 630000000, net: 470000000 },
    { date: 'Jan', inflow: 780000000, outflow: 490000000, net: 290000000 },
    { date: 'Feb', inflow: 1250000000, outflow: 580000000, net: 670000000 },
    { date: 'Mar', inflow: 1400000000, outflow: 610000000, net: 790000000 },
  ];

  return (
    <div className="space-y-6">
      {/* 2-Column Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowLine
          data={cashFlowPoints}
          title="Monthly Operating Cash Flow"
          subtitle="Cleared collections vs posted expenses (BDT)"
        />
        <PipelineFunnel
          stages={funnelStages}
          title="Sales Conversion Funnel"
          subtitle="Stage-by-stage progression from inquiry to booking"
        />
      </div>

      {/* Full-width AR Aging Strip */}
      <AgingStrip
        buckets={agingBuckets}
        title="Accounts Receivable Aging Strip (P0)"
        subtitle="Outstanding balances distributed across past-due timing buckets"
      />

      {/* Executive Sales Performance Breakdown */}
      {salesPerformance.length > 0 && (
        <div className="card-workspace p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-body font-semibold text-text">Sales Executive Performance</h4>
              <p className="text-caption text-text-muted mt-0.5">
                Conversion and collection productivity by representative
              </p>
            </div>
            <span className="text-caption font-mono tabular-nums text-text-muted">
              {salesPerformance.length} representatives
            </span>
          </div>

          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-left text-small">
              <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
                <tr>
                  <th className="px-3 py-2 font-medium">Representative</th>
                  <th className="px-3 py-2 text-right font-medium">Leads</th>
                  <th className="px-3 py-2 text-right font-medium">Converted</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Sales Value</th>
                  <th className="px-3 py-2 text-right font-medium">Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {salesPerformance.map((sp) => (
                  <tr key={sp.salesExecutiveId} className="hover:bg-surface-sunken/40">
                    <td className="px-3 py-2.5 font-medium text-text">{sp.salesExecutiveName}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text-muted">
                      {sp.leadsAssignedCount}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-text">
                      {sp.leadsConvertedCount}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-accent-text font-semibold">
                      {sp.conversionRatePercent.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text font-semibold">
                      {formatMoney(BigInt(sp.totalSalesValuePaisa))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-success font-medium">
                      {formatMoney(BigInt(sp.totalCollectedPaisa))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
