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
  const formatted = paisa > 0n ? formatMoney(paisa, { showDecimals: false }) : '৳0';
  const fullFormatted = paisa > 0n ? formatMoney(paisa) : '৳0';
  const count = summary?.totalSalesCount ?? 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted uppercase tracking-wider">
          Gross Sales Bookings
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-primary" />
      </div>
      <div
        className="mt-2 text-xl lg:text-2xl font-bold font-sans tracking-tight text-text tabular-nums leading-tight truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Confirmed Allotments</span>
        <span className="font-sans font-semibold text-text">{count} units</span>
      </div>
    </div>
  );
}

function CollectionMetricCard({ summary }: { summary?: CollectionSummary }) {
  const rawPaisa = summary?.totalCollectionPaisa;
  const paisa = rawPaisa ? BigInt(rawPaisa) : 0n;
  const formatted = paisa > 0n ? formatMoney(paisa, { showDecimals: false }) : '৳0';
  const fullFormatted = paisa > 0n ? formatMoney(paisa) : '৳0';
  const count = summary?.totalCollectionCount ?? 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted uppercase tracking-wider">
          Realized Collections
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-success" />
      </div>
      <div
        className="mt-2 text-xl lg:text-2xl font-bold font-sans tracking-tight text-text tabular-nums leading-tight truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Cleared Receipts</span>
        <span className="font-sans font-semibold text-text">{count} receipts</span>
      </div>
    </div>
  );
}

function InventoryValueCard({ summary }: { summary?: InventorySummary }) {
  const rawPaisa = summary?.totalInventoryValuePaisa;
  const paisa = rawPaisa ? BigInt(rawPaisa) : 0n;
  const formatted = paisa > 0n ? formatMoney(paisa, { showDecimals: false }) : '৳0';
  const fullFormatted = paisa > 0n ? formatMoney(paisa) : '৳0';

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted uppercase tracking-wider">
          Portfolio Inventory Value
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-info" />
      </div>
      <div
        className="mt-2 text-xl lg:text-2xl font-bold font-sans tracking-tight text-text tabular-nums leading-tight truncate"
        title={fullFormatted}
      >
        {formatted}
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Active Valuation</span>
        <span className="font-sans font-semibold text-text">Live Valuation</span>
      </div>
    </div>
  );
}

function InventoryUnitsCard({ summary }: { summary?: InventorySummary }) {
  const total = summary?.totalUnits ?? 0;
  const sold = summary?.soldUnits ?? 0;
  const rate = total > 0 ? `${Math.round((sold / total) * 100)}%` : '0%';

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-muted uppercase tracking-wider">
          Units Allotted / Sold
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-special" />
      </div>
      <div className="mt-2 text-xl lg:text-2xl font-bold font-sans tracking-tight text-text tabular-nums leading-tight truncate">
        {sold} <span className="text-base font-normal text-text-muted">/ {total}</span>
      </div>
      <div className="mt-2 text-caption text-text-muted flex items-center justify-between">
        <span>Absorption Rate</span>
        <span className="font-sans font-semibold text-text">{rate}</span>
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
    >
      <SalesMetricCard summary={salesData?.summary} />
      <CollectionMetricCard summary={collectionData?.summary} />
      <InventoryValueCard summary={inventoryData?.summary} />
      <InventoryUnitsCard summary={inventoryData?.summary} />
    </div>
  );
}
