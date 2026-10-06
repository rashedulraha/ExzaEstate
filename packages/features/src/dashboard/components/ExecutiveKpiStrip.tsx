import { formatMoney } from '@exzaestate/shared';
import { KpiSparklineCard } from '@exzaestate/ui';

export interface ExecutiveKpiStripProps {
  summary?: {
    totalSalesPaisa: string;
    totalSalesCount: number;
    totalCollectionPaisa: string;
    totalCollectionCount: number;
    outstandingReceivablePaisa: string;
    overdueAmountPaisa: string;
    overdueInstallmentsCount: number;
    totalExpensePaisa: string;
    accountsPayablePaisa: string;
    cashBankBalancePaisa: string;
    inventory?: {
      totalUnits: number;
      availableUnits: number;
      bookedUnits: number;
      soldUnits: number;
    };
    performance?: {
      leadConversionRatePercent: number;
      collectionEfficiencyPercent: number;
    };
  };
  isLoading?: boolean;
}

type DashboardSummaryData = NonNullable<ExecutiveKpiStripProps['summary']>;

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card-workspace h-28 animate-skeleton-breathe bg-surface-sunken">
          <div className="flex h-full flex-col justify-center gap-2.5 px-4">
            <div className="h-2.5 w-16 rounded-full bg-border/50" />
            <div className="h-5 w-24 rounded-full bg-border/50" />
            <div className="h-2 w-32 rounded-full bg-border/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesCard({ summary }: { summary: DashboardSummaryData }) {
  const count = summary.totalSalesCount ?? 0;
  const paisa = summary.totalSalesPaisa ? BigInt(summary.totalSalesPaisa) : 0n;
  const leadRate = summary.performance?.leadConversionRatePercent ?? 0;

  const sparkline =
    count > 0
      ? [
          { date: '1', value: Math.max(1, Math.round(count * 0.2)) },
          { date: '2', value: Math.max(1, Math.round(count * 0.5)) },
          { date: '3', value: Math.max(1, Math.round(count * 0.8)) },
          { date: '4', value: count },
        ]
      : [
          { date: '1', value: 0 },
          { date: '2', value: 0 },
        ];

  const subvalue = count > 0 ? `${count} units confirmed` : 'No confirmed sales';

  return (
    <KpiSparklineCard
      label="Total Sales"
      value={formatMoney(paisa)}
      subvalue={subvalue}
      sparklineData={sparkline}
      indicatorColor="primary"
      showTableToggle={false}
      trend={{
        percentage: leadRate,
        direction: leadRate > 0 ? 'up' : 'neutral',
        label: 'lead conversion',
      }}
    />
  );
}

function CollectionCard({ summary }: { summary: DashboardSummaryData }) {
  const count = summary.totalCollectionCount ?? 0;
  const paisa = summary.totalCollectionPaisa ? BigInt(summary.totalCollectionPaisa) : 0n;
  const effRate = summary.performance?.collectionEfficiencyPercent ?? 0;

  const sparkline =
    count > 0
      ? [
          { date: '1', value: Math.max(1, Math.round(count * 0.3)) },
          { date: '2', value: Math.max(1, Math.round(count * 0.6)) },
          { date: '3', value: count },
        ]
      : [
          { date: '1', value: 0 },
          { date: '2', value: 0 },
        ];

  const subvalue = count > 0 ? `${count} installment receipts cleared` : 'No receipts cleared';

  return (
    <KpiSparklineCard
      label="Total Collection"
      value={formatMoney(paisa)}
      subvalue={subvalue}
      sparklineData={sparkline}
      indicatorColor="success"
      showTableToggle={false}
      trend={{
        percentage: effRate,
        direction: effRate > 0 ? 'up' : 'neutral',
        label: 'collection rate',
      }}
    />
  );
}

function ReceivablesCard({ summary }: { summary: DashboardSummaryData }) {
  const overdueCount = summary.overdueInstallmentsCount ?? 0;
  const arPaisa = summary.outstandingReceivablePaisa
    ? BigInt(summary.outstandingReceivablePaisa)
    : 0n;
  const overduePaisa = summary.overdueAmountPaisa ? BigInt(summary.overdueAmountPaisa) : 0n;

  const sparkline =
    overdueCount > 0
      ? [
          { date: '1', value: Math.max(1, Math.round(overdueCount * 0.5)) },
          { date: '2', value: overdueCount },
        ]
      : [
          { date: '1', value: 0 },
          { date: '2', value: 0 },
        ];

  const subvalue =
    overdueCount > 0
      ? `Overdue: ${formatMoney(overduePaisa)} (${overdueCount} past due)`
      : 'All installments current';

  return (
    <KpiSparklineCard
      label="Outstanding AR"
      value={formatMoney(arPaisa)}
      subvalue={subvalue}
      sparklineData={sparkline}
      indicatorColor="warning"
      showTableToggle={false}
      trend={{
        percentage: overdueCount,
        direction: overdueCount > 0 ? 'down' : 'neutral',
        label: 'past-due items',
      }}
    />
  );
}

function LiquidityCard({ summary }: { summary: DashboardSummaryData }) {
  const cashPaisa = summary.cashBankBalancePaisa ? BigInt(summary.cashBankBalancePaisa) : 0n;
  const apPaisa = summary.accountsPayablePaisa ? BigInt(summary.accountsPayablePaisa) : 0n;

  const sparkline = [
    { date: '1', value: 0 },
    { date: '2', value: 0 },
  ];

  return (
    <KpiSparklineCard
      label="Cash & Bank Balance"
      value={formatMoney(cashPaisa)}
      subvalue={`Payables (AP): ${formatMoney(apPaisa)}`}
      sparklineData={sparkline}
      indicatorColor="info"
      showTableToggle={false}
      trend={{
        percentage: 0,
        direction: 'neutral',
        label: 'operating reserve',
      }}
    />
  );
}

export function ExecutiveKpiStrip({ summary, isLoading }: ExecutiveKpiStripProps) {
  if (isLoading) {
    return <KpiSkeleton />;
  }
  if (!summary) {
    return <KpiSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      <SalesCard summary={summary} />
      <CollectionCard summary={summary} />
      <ReceivablesCard summary={summary} />
      <LiquidityCard summary={summary} />
    </div>
  );
}
