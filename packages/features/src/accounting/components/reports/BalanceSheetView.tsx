import { formatMoney } from '@exzaestate/shared';
import { Input } from '@exzaestate/ui';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { BalanceSheetReportDto, BalanceSheetItemDto } from '@exzaestate/api-client';

export interface BalanceSheetViewProps {
  report?: BalanceSheetReportDto;
  asOfDate: string;
  onDateChange: (date: string) => void;
  isLoading?: boolean;
}

function SectionTable({
  title,
  items,
  totalPaisa,
}: {
  title: string;
  items: BalanceSheetItemDto[];
  totalPaisa: string;
}) {
  return (
    <div className="border border-border rounded-card overflow-hidden bg-surface">
      <div className="px-4 py-2.5 bg-surface-sunken border-b border-border font-bold text-h4 text-text">
        {title}
      </div>
      <table className="w-full text-body">
        <tbody className="divide-y divide-border">
          {items.map((it, idx) => (
            <tr key={it.accountId || idx} className="hover:bg-surface-sunken/40">
              <td className="px-4 py-2 text-text font-medium">
                <span className="font-mono text-text-muted mr-2">{it.accountCode}</span>
                {it.accountName}
              </td>
              <td className="px-4 py-2 text-right tabular-nums font-semibold text-text">
                {formatMoney(it.balancePaisa)}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-4 text-center text-text-muted text-caption">
                No items recorded in this section.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-b border-border bg-surface-sunken/60 font-bold">
          <tr>
            <td className="px-4 py-2.5 text-text">Total {title}:</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-text">
              {formatMoney(totalPaisa)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BalanceSheetBanner({
  isBalanced,
  totalAssets,
  totalLiabEquity,
  differencePaisa,
}: {
  isBalanced: boolean;
  totalAssets: string;
  totalLiabEquity: string;
  differencePaisa: string;
}) {
  if (isBalanced) {
    return (
      <div
        data-testid="bs-balance-banner"
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-card border bg-success/10 border-success/30 text-success"
      >
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold text-body">Balance Sheet Equation Verified</span>
          <span className="text-caption text-text-muted">
            Assets ({formatMoney(totalAssets)}) === Liabilities + Equity (
            {formatMoney(totalLiabEquity)})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="bs-balance-banner"
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-card border bg-danger/10 border-danger/30 text-danger"
    >
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div className="flex flex-col">
        <span className="font-bold text-body">Equation Discrepancy</span>
        <span className="text-caption">Diff: {formatMoney(differencePaisa)}</span>
      </div>
    </div>
  );
}

function extractBalanceSheetSections(report?: BalanceSheetReportDto) {
  if (!report) {
    return {
      allAssets: [],
      totalAssets: '0',
      allLiabs: [],
      totalLiabilities: '0',
      equity: [],
      totalEquity: '0',
      totalLiabEquity: '0',
      isBalanced: true,
      differencePaisa: '0',
    };
  }

  const currentAssets = report.assets.currentAssets;
  const nonCurrentAssets = report.assets.nonCurrentAssets;
  const currentLiabs = report.liabilities.currentLiabilities;
  const nonCurrentLiabs = report.liabilities.nonCurrentLiabilities;

  return {
    allAssets: [...currentAssets, ...nonCurrentAssets],
    totalAssets: report.assets.totalAssetsPaisa,
    allLiabs: [...currentLiabs, ...nonCurrentLiabs],
    totalLiabilities: report.liabilities.totalLiabilitiesPaisa,
    equity: report.equity.items,
    totalEquity: report.equity.totalEquityPaisa,
    totalLiabEquity: report.totalLiabilitiesAndEquityPaisa,
    isBalanced: report.isBalanced,
    differencePaisa: report.differencePaisa,
  };
}

export function BalanceSheetView({
  report,
  asOfDate,
  onDateChange,
  isLoading = false,
}: BalanceSheetViewProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading balance sheet...</div>;
  }

  const data = extractBalanceSheetSections(report);

  return (
    <div className="space-y-4" data-testid="balance-sheet-view">
      <div className="p-4 rounded-card border border-border bg-surface flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="block text-caption text-text-muted mb-1 font-medium">
            Reporting As-of Date
          </label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-48"
          />
        </div>

        <BalanceSheetBanner
          isBalanced={data.isBalanced}
          totalAssets={data.totalAssets}
          totalLiabEquity={data.totalLiabEquity}
          differencePaisa={data.differencePaisa}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <SectionTable title="Assets" items={data.allAssets} totalPaisa={data.totalAssets} />
        </div>

        <div className="space-y-4">
          <SectionTable
            title="Liabilities"
            items={data.allLiabs}
            totalPaisa={data.totalLiabilities}
          />
          <SectionTable title="Equity" items={data.equity} totalPaisa={data.totalEquity} />

          <div className="p-4 rounded-card border-2 border-border bg-surface-sunken flex items-center justify-between font-extrabold text-h3 text-text">
            <span>Total Liabilities & Equity:</span>
            <span className="tabular-nums">{formatMoney(data.totalLiabEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
