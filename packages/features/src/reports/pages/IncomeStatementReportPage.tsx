import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, Breadcrumbs } from '@exzaestate/ui';
import {
  useReportsControllerGetIncomeStatement,
  useReportsControllerExportIncomeStatement,
} from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

export function IncomeStatementReportPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetIncomeStatement({
    startDate,
    endDate,
    projectId: projectId || undefined,
  });

  const exportMutation = useReportsControllerExportIncomeStatement();

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    const res = await exportMutation.mutateAsync({
      data: {
        format,
        startDate,
        endDate,
        projectId: projectId || undefined,
      },
    });
    return {
      jobId: res.jobId,
      message: res.message,
    };
  };

  const report = query.data;

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Income Statement' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="cursor-pointer"
              >
                Back
              </Button>
              <h1 className="text-h1 font-bold text-text">Income Statement (Profit & Loss)</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                FIN-03 · Comprehensive Income
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Operating revenues, direct development costs, overheads, and net realization
            </p>
          </div>

          {report && (
            <div className="px-3 py-1 rounded-full bg-surface-sunken text-caption font-mono tabular-nums text-text font-semibold border border-border">
              Net Income:{' '}
              <span className="text-success">{formatMoney(BigInt(report.netProfitPaisa))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Filter Toolbar */}
      <ReportFiltersBar
        mode="range"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        projectId={projectId}
        onProjectIdChange={setProjectId}
        onRefresh={() => void query.refetch()}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Tier 3: Content Workspace Card */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Income Statement"
        errorMessage="Could not load the income statement report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="rounded-card border border-border bg-surface shadow-xs p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between text-caption text-text-muted border-b border-border pb-3">
              <span>
                Period:{' '}
                <strong className="text-text font-mono">
                  {report.startDate} to {report.endDate}
                </strong>
              </span>
              <span>
                Currency: <strong className="text-text">BDT</strong>
              </span>
            </div>

            {/* Revenue */}
            <div className="space-y-3">
              <h3 className="text-small font-bold text-text uppercase tracking-wider">
                Revenues & Sales
              </h3>
              <div className="divide-y divide-border/60">
                {report.revenues.map((item) => (
                  <div
                    key={item.accountId}
                    className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                  >
                    <div>
                      <span className="font-mono text-caption text-text-muted mr-2">
                        {item.accountCode}
                      </span>
                      <span className="text-text font-medium">{item.accountName}</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-text">
                      {formatMoney(BigInt(item.amountPaisa))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between font-semibold text-small">
                <span>Total Revenue</span>
                <span className="font-mono tabular-nums text-text font-bold">
                  {formatMoney(BigInt(report.totalRevenuePaisa))}
                </span>
              </div>
            </div>

            {/* Cost of Sales */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-small font-bold text-text uppercase tracking-wider">
                Cost of Sales (Direct Costs)
              </h3>
              <div className="divide-y divide-border/60">
                {report.costOfSales.map((item) => (
                  <div
                    key={item.accountId}
                    className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                  >
                    <div>
                      <span className="font-mono text-caption text-text-muted mr-2">
                        {item.accountCode}
                      </span>
                      <span className="text-text font-medium">{item.accountName}</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-text">
                      {formatMoney(BigInt(item.amountPaisa))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between font-semibold text-small">
                <span>Total Cost of Sales</span>
                <span className="font-mono tabular-nums text-text font-bold">
                  {formatMoney(BigInt(report.totalCostOfSalesPaisa))}
                </span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-surface-sunken/60 rounded-button flex items-center justify-between font-bold text-body border border-border">
              <span className="uppercase text-caption tracking-wider text-text">Gross Profit</span>
              <span className="font-mono tabular-nums text-text">
                {formatMoney(BigInt(report.grossProfitPaisa))}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-small font-bold text-text uppercase tracking-wider">
                Operating & Administrative Expenses
              </h3>
              <div className="divide-y divide-border/60">
                {report.operatingExpenses.map((item) => (
                  <div
                    key={item.accountId}
                    className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                  >
                    <div>
                      <span className="font-mono text-caption text-text-muted mr-2">
                        {item.accountCode}
                      </span>
                      <span className="text-text font-medium">{item.accountName}</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-text">
                      {formatMoney(BigInt(item.amountPaisa))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between font-semibold text-small">
                <span>Total Operating Expenses</span>
                <span className="font-mono tabular-nums text-text font-bold">
                  {formatMoney(BigInt(report.totalOperatingExpensesPaisa))}
                </span>
              </div>
            </div>

            {/* Net Income / Profit */}
            <div className="pt-4 border-t-2 border-b-4 border-double border-border-strong flex items-center justify-between font-bold">
              <span className="text-text uppercase text-caption tracking-wider">
                Net Income (P&L)
              </span>
              <span className="font-mono tabular-nums text-heading-3 text-success">
                {formatMoney(BigInt(report.netProfitPaisa))}
              </span>
            </div>
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Income Statement"
        onExport={handleExport}
      />
    </div>
  );
}
