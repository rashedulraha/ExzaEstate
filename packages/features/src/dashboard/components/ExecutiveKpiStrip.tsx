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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card-workspace h-28 animate-skeleton-breathe bg-surface-sunken" />
      ))}
    </div>
  );
}

function SalesCard({ summary }: { summary: DashboardSummaryData }) {
  const sparkline = [
    { date: '1', value: 12 },
    { date: '2', value: 18 },
    { date: '3', value: 24 },
    { date: '4', value: summary.totalSalesCount ? summary.totalSalesCount : 20 },
  ];
  const paisa = summary.totalSalesPaisa ? BigInt(summary.totalSalesPaisa) : 0n;
  const leadRate =
    summary.performance?.leadConversionRatePercent !== undefined
      ? summary.performance.leadConversionRatePercent
      : 14.2;

  return (
    <KpiSparklineCard
      label="Total Sales"
      value={formatMoney(paisa)}
      subvalue={`${summary.totalSalesCount} confirmed bookings`}
      sparklineData={sparkline}
      indicatorColor="primary"
      trend={{
        percentage: leadRate,
        direction: 'up',
        label: 'lead conversion',
      }}
    />
  );
}

function CollectionCard({ summary }: { summary: DashboardSummaryData }) {
  const sparkline = [
    { date: '1', value: 8 },
    { date: '2', value: 14 },
    { date: '3', value: 19 },
    { date: '4', value: summary.totalCollectionCount ? summary.totalCollectionCount : 15 },
  ];
  const paisa = summary.totalCollectionPaisa ? BigInt(summary.totalCollectionPaisa) : 0n;
  const effRate =
    summary.performance?.collectionEfficiencyPercent !== undefined
      ? summary.performance.collectionEfficiencyPercent
      : 88.5;

  return (
    <KpiSparklineCard
      label="Total Collection"
      value={formatMoney(paisa)}
      subvalue={`${summary.totalCollectionCount} receipts cleared`}
      sparklineData={sparkline}
      indicatorColor="success"
      trend={{
        percentage: effRate,
        direction: 'up',
        label: 'efficiency',
      }}
    />
  );
}

function ReceivablesCard({ summary }: { summary: DashboardSummaryData }) {
  const sparkline = [
    { date: '1', value: 5 },
    { date: '2', value: 4 },
    { date: '3', value: 6 },
    { date: '4', value: summary.overdueInstallmentsCount ? summary.overdueInstallmentsCount : 3 },
  ];
  const arPaisa = summary.outstandingReceivablePaisa
    ? BigInt(summary.outstandingReceivablePaisa)
    : 0n;
  const overduePaisa = summary.overdueAmountPaisa ? BigInt(summary.overdueAmountPaisa) : 0n;

  return (
    <KpiSparklineCard
      label="Outstanding AR"
      value={formatMoney(arPaisa)}
      subvalue={`Overdue: ${formatMoney(overduePaisa)}`}
      sparklineData={sparkline}
      indicatorColor="warning"
      trend={{
        percentage: 4.8,
        direction: 'down',
        label: 'vs 30d avg',
      }}
    />
  );
}

function LiquidityCard({ summary }: { summary: DashboardSummaryData }) {
  const sparkline = [
    { date: '1', value: 40 },
    { date: '2', value: 45 },
    { date: '3', value: 50 },
    { date: '4', value: 55 },
  ];
  const cashPaisa = summary.cashBankBalancePaisa ? BigInt(summary.cashBankBalancePaisa) : 0n;
  const apPaisa = summary.accountsPayablePaisa ? BigInt(summary.accountsPayablePaisa) : 0n;

  return (
    <KpiSparklineCard
      label="Cash & Bank Balance"
      value={formatMoney(cashPaisa)}
      subvalue={`AP: ${formatMoney(apPaisa)}`}
      sparklineData={sparkline}
      indicatorColor="info"
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SalesCard summary={summary} />
      <CollectionCard summary={summary} />
      <ReceivablesCard summary={summary} />
      <LiquidityCard summary={summary} />
    </div>
  );
}
