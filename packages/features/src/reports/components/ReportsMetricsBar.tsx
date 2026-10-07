import { formatMoney } from '@exzaestate/shared';
import {
  useReportsControllerGetSalesReport,
  useReportsControllerGetCollectionReport,
  useReportsControllerGetInventoryReport,
} from '@exzaestate/api-client';

interface SalesSummary {
  totalSalesPaisa?: string;
  totalSalesCount?: number;
}

interface CollectionSummary {
  totalCollectionPaisa?: string;
  totalCollectionCount?: number;
}

interface InventorySummary {
  totalUnits?: number;
  soldUnits?: number;
  availableUnits?: number;
  totalInventoryValuePaisa?: string;
}

function SalesMetricCard({ summary }: { summary?: SalesSummary }) {
  const rawPaisa = summary?.totalSalesPaisa;
  const paisa = rawPaisa ? BigInt(rawPaisa) : 0n;
  const formatted = formatMoney(paisa, { showDecimals: false });
  const fullFormatted = formatMoney(paisa);
  const count = summary?.totalSalesCount ?? 0;

  return (
    <div className="card-stat">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Gross Sales Bookings
        </span>
        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Sales
        </span>
      </div>
      <div
        className="mt-1.5 text-hero-num font-bold text-text tabular-nums truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-1 text-caption text-text-muted flex items-center justify-between">
        <span>Confirmed Allotments</span>
        <span className="font-semibold text-text tabular-nums">{count} units</span>
      </div>
    </div>
  );
}

function CollectionMetricCard({ summary }: { summary?: CollectionSummary }) {
  const rawPaisa = summary?.totalCollectionPaisa;
  const paisa = rawPaisa ? BigInt(rawPaisa) : 0n;
  const formatted = formatMoney(paisa, { showDecimals: false });
  const fullFormatted = formatMoney(paisa);
  const count = summary?.totalCollectionCount ?? 0;

  return (
    <div className="card-stat">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Realized Collections
        </span>
        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-success/12 text-success">
          Collections
        </span>
      </div>
      <div
        className="mt-1.5 text-hero-num font-bold text-success tabular-nums truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-1 text-caption text-text-muted flex items-center justify-between">
        <span>Cleared Receipts</span>
        <span className="font-semibold text-text tabular-nums">{count} receipts</span>
      </div>
    </div>
  );
}

function InventoryValueCard({ summary }: { summary?: InventorySummary }) {
  const rawPaisa = summary?.totalInventoryValuePaisa;
  const paisa = rawPaisa ? BigInt(rawPaisa) : 0n;
  const formatted = formatMoney(paisa, { showDecimals: false });
  const fullFormatted = formatMoney(paisa);

  return (
    <div className="card-stat">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Portfolio Inventory Value
        </span>
        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">
          Valuation
        </span>
      </div>
      <div
        className="mt-1.5 text-hero-num font-bold text-text tabular-nums truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-1 text-caption text-text-muted flex items-center justify-between">
        <span>Active Portfolio</span>
        <span className="font-semibold text-text">Live Valuation</span>
      </div>
    </div>
  );
}

function InventoryUnitsCard({ summary }: { summary?: InventorySummary }) {
  const total = summary?.totalUnits ?? 0;
  const sold = summary?.soldUnits ?? 0;
  const rate = total > 0 ? `${Math.round((sold / total) * 100)}%` : '0%';

  return (
    <div className="card-stat">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Units Allotted / Sold
        </span>
        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-special/12 text-special">
          Inventory
        </span>
      </div>
      <div className="mt-1.5 text-hero-num font-bold text-text tabular-nums truncate">
        {sold} <span className="text-body font-normal text-text-muted">/ {total}</span>
      </div>
      <div className="mt-1 text-caption text-text-muted flex items-center justify-between">
        <span>Absorption Rate</span>
        <span className="font-semibold text-text tabular-nums">{rate}</span>
      </div>
    </div>
  );
}

export function ReportsMetricsBar() {
  const salesQuery = useReportsControllerGetSalesReport({});
  const collectionQuery = useReportsControllerGetCollectionReport({});
  const inventoryQuery = useReportsControllerGetInventoryReport({});

  const salesData = salesQuery.data as { summary?: SalesSummary } | undefined;
  const collectionData = collectionQuery.data as { summary?: CollectionSummary } | undefined;
  const inventoryData = inventoryQuery.data as { summary?: InventorySummary } | undefined;

  return (
    <div
      data-testid="reports-metrics-bar"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <SalesMetricCard summary={salesData?.summary} />
      <CollectionMetricCard summary={collectionData?.summary} />
      <InventoryValueCard summary={inventoryData?.summary} />
      <InventoryUnitsCard summary={inventoryData?.summary} />
    </div>
  );
}
