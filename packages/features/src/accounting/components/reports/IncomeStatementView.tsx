import { formatMoney } from '@exzaestate/shared';
import { Input } from '@exzaestate/ui';
import type { IncomeStatementReportDto, IncomeStatementItemDto } from '@exzaestate/api-client';

export interface IncomeStatementViewProps {
  report?: IncomeStatementReportDto;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isLoading?: boolean;
}

function StatementSection({
  title,
  items,
  totalLabel,
  totalPaisa,
  isExpense = false,
}: {
  title: string;
  items: IncomeStatementItemDto[];
  totalLabel: string;
  totalPaisa: string;
  isExpense?: boolean;
}) {
  return (
    <div className="p-4 space-y-2">
      <h4 className="font-bold text-text uppercase tracking-wider text-caption">{title}</h4>
      <table className="w-full text-body">
        <tbody className="divide-y divide-border/60">
          {items.map((it, idx) => (
            <tr key={idx} className="hover:bg-surface-sunken/40">
              <td className="py-1.5 text-text">
                <span className="font-mono text-text-muted mr-2">{it.accountCode}</span>
                {it.accountName}
              </td>
              <td className="py-1.5 text-right tabular-nums font-medium text-text">
                {formatMoney(it.amountPaisa)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-2 flex justify-between font-bold text-body text-text border-t border-border">
        <span>{totalLabel}:</span>
        <span className={`tabular-nums ${isExpense ? 'text-danger' : 'text-text'}`}>
          {formatMoney(totalPaisa)}
        </span>
      </div>
    </div>
  );
}

function NetIncomeFooter({ netProfit, marginPct }: { netProfit: string; marginPct: number }) {
  const isPositive = BigInt(netProfit) >= 0n;
  const valueColor = isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="p-5 bg-surface-sunken border-t-2 border-b border-border flex justify-between items-center font-extrabold text-h2 text-text">
      <div className="flex flex-col">
        <span>Net Operating Income / (Loss)</span>
        <span className="text-caption text-text-muted font-normal">
          Net Profit Margin: {marginPct}%
        </span>
      </div>
      <span className={`tabular-nums ${valueColor}`}>{formatMoney(netProfit)}</span>
    </div>
  );
}

function extractIncomeReport(report?: IncomeStatementReportDto) {
  if (!report) {
    return {
      revenues: [],
      costOfSales: [],
      operatingExpenses: [],
      totalRevenue: '0',
      totalCostOfSales: '0',
      grossProfit: '0',
      totalOpEx: '0',
      netProfit: '0',
      grossMargin: 0,
      netMargin: 0,
    };
  }
  return {
    revenues: report.revenues,
    costOfSales: report.costOfSales,
    operatingExpenses: report.operatingExpenses,
    totalRevenue: report.totalRevenuePaisa,
    totalCostOfSales: report.totalCostOfSalesPaisa,
    grossProfit: report.grossProfitPaisa,
    totalOpEx: report.totalOperatingExpensesPaisa,
    netProfit: report.netProfitPaisa,
    grossMargin: report.grossProfitMarginPct,
    netMargin: report.netProfitMarginPct,
  };
}

export function IncomeStatementView({
  report,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isLoading = false,
}: IncomeStatementViewProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading income statement...</div>;
  }

  const data = extractIncomeReport(report);

  return (
    <div className="space-y-4" data-testid="income-statement-view">
      <div className="p-4 rounded-card border border-border bg-surface flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">From Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-44"
          />
        </div>

        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">To Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <div className="border border-border rounded-card bg-surface overflow-hidden divide-y divide-border">
        <StatementSection
          title="1. Operating Revenues"
          items={data.revenues}
          totalLabel="Total Revenues"
          totalPaisa={data.totalRevenue}
        />

        <StatementSection
          title="2. Cost of Land Sold & Construction"
          items={data.costOfSales}
          totalLabel="Total Cost of Sales"
          totalPaisa={data.totalCostOfSales}
          isExpense
        />

        <div className="p-4 bg-surface-sunken/50 flex justify-between items-center font-bold text-h4 text-text">
          <span>Gross Profit (Margin: {data.grossMargin}%):</span>
          <span className="tabular-nums text-h3 font-extrabold">
            {formatMoney(data.grossProfit)}
          </span>
        </div>

        <StatementSection
          title="3. Administrative & Selling Expenses"
          items={data.operatingExpenses}
          totalLabel="Total Operating Expenses"
          totalPaisa={data.totalOpEx}
          isExpense
        />

        <NetIncomeFooter netProfit={data.netProfit} marginPct={data.netMargin} />
      </div>
    </div>
  );
}
