import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button } from '@exzaestate/ui';
import {
  useReportsControllerGetBalanceSheet,
  useReportsControllerExportBalanceSheet,
} from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

function BalanceSheetEquationBadge({ isBalanced }: { isBalanced: boolean }) {
  if (isBalanced) {
    return (
      <div className="px-3 py-1.5 rounded-full flex items-center gap-2 text-small font-semibold bg-success/12 text-success border border-success/30">
        <CheckCircle2 className="w-4 h-4" />
        <span>Balanced Equation</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 rounded-full flex items-center gap-2 text-small font-semibold bg-danger/12 text-danger border border-danger/30">
      <AlertTriangle className="w-4 h-4" />
      <span>Imbalance Detected</span>
    </div>
  );
}

export function BalanceSheetReportPage() {
  const navigate = useNavigate();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetBalanceSheet({
    asOfDate: asOfDate || undefined,
    projectId: projectId || undefined,
  });

  const exportMutation = useReportsControllerExportBalanceSheet();

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    const res = await exportMutation.mutateAsync({
      data: {
        format,
        asOfDate: asOfDate || undefined,
        projectId: projectId || undefined,
      },
    });
    return {
      jobId: res.jobId,
      message: res.message,
    };
  };

  const report = query.data;
  const isBalanced = Boolean(report?.isBalanced);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Reports
          </Button>
          <div>
            <h1 className="text-heading-2 text-text font-semibold">Balance Sheet</h1>
            <p className="text-caption text-text-muted">
              Statement of Financial Position: Assets = Liabilities + Equity
            </p>
          </div>
        </div>

        {report && <BalanceSheetEquationBadge isBalanced={isBalanced} />}
      </div>

      {/* Filters */}
      <ReportFiltersBar
        mode="asOf"
        asOfDate={asOfDate}
        onAsOfDateChange={setAsOfDate}
        projectId={projectId}
        onProjectIdChange={setProjectId}
        onRefresh={() => void query.refetch()}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Content */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Balance Sheet"
        errorMessage="Could not load the balance sheet report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Assets */}
            <div className="card-workspace p-6 space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-body font-bold text-text uppercase tracking-wide">Assets</h3>
                <span className="text-caption text-text-muted">Current & Non-Current</span>
              </div>

              {/* Current Assets */}
              <div className="space-y-2">
                <h4 className="text-small font-semibold text-text-muted uppercase text-caption">
                  Current Assets
                </h4>
                <div className="divide-y divide-border/60">
                  {report.assets.currentAssets.map((a) => (
                    <div
                      key={a.accountId}
                      className="py-2 flex items-center justify-between text-small"
                    >
                      <div>
                        <span className="font-mono text-caption text-text-muted mr-2">
                          {a.accountCode}
                        </span>
                        <span className="text-text">{a.accountName}</span>
                      </div>
                      <span className="font-mono tabular-nums font-medium text-text">
                        {formatMoney(BigInt(a.balancePaisa))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-Current Assets */}
              {report.assets.nonCurrentAssets.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <h4 className="text-small font-semibold text-text-muted uppercase text-caption">
                    Non-Current Assets
                  </h4>
                  <div className="divide-y divide-border/60">
                    {report.assets.nonCurrentAssets.map((a) => (
                      <div
                        key={a.accountId}
                        className="py-2 flex items-center justify-between text-small"
                      >
                        <div>
                          <span className="font-mono text-caption text-text-muted mr-2">
                            {a.accountCode}
                          </span>
                          <span className="text-text">{a.accountName}</span>
                        </div>
                        <span className="font-mono tabular-nums font-medium text-text">
                          {formatMoney(BigInt(a.balancePaisa))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Assets */}
              <div className="pt-4 border-t-2 border-b-4 border-double border-border-strong flex items-center justify-between font-bold">
                <span className="text-text uppercase text-caption tracking-wider">
                  Total Assets
                </span>
                <span className="font-mono tabular-nums text-body text-text">
                  {formatMoney(BigInt(report.assets.totalAssetsPaisa))}
                </span>
              </div>
            </div>

            {/* Right Column: Liabilities & Equity */}
            <div className="card-workspace p-6 space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-body font-bold text-text uppercase tracking-wide">
                  Liabilities & Equity
                </h3>
                <span className="text-caption text-text-muted">Obligations & Net Worth</span>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-2">
                <h4 className="text-small font-semibold text-text-muted uppercase text-caption">
                  Current Liabilities
                </h4>
                <div className="divide-y divide-border/60">
                  {report.liabilities.currentLiabilities.map((l) => (
                    <div
                      key={l.accountId}
                      className="py-2 flex items-center justify-between text-small"
                    >
                      <div>
                        <span className="font-mono text-caption text-text-muted mr-2">
                          {l.accountCode}
                        </span>
                        <span className="text-text">{l.accountName}</span>
                      </div>
                      <span className="font-mono tabular-nums font-medium text-text">
                        {formatMoney(BigInt(l.balancePaisa))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-2 pt-3 border-t border-border">
                <h4 className="text-small font-semibold text-text-muted uppercase text-caption">
                  Shareholders Equity
                </h4>
                <div className="divide-y divide-border/60">
                  {report.equity.items.map((eq) => (
                    <div
                      key={eq.accountId}
                      className="py-2 flex items-center justify-between text-small"
                    >
                      <div>
                        <span className="font-mono text-caption text-text-muted mr-2">
                          {eq.accountCode}
                        </span>
                        <span className="text-text">{eq.accountName}</span>
                      </div>
                      <span className="font-mono tabular-nums font-medium text-text">
                        {formatMoney(BigInt(eq.balancePaisa))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="pt-4 border-t-2 border-b-4 border-double border-border-strong flex items-center justify-between font-bold">
                <span className="text-text uppercase text-caption tracking-wider">
                  Total Liabilities & Equity
                </span>
                <span className="font-mono tabular-nums text-body text-text">
                  {formatMoney(BigInt(report.totalLiabilitiesAndEquityPaisa))}
                </span>
              </div>
            </div>
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Balance Sheet"
        onExport={handleExport}
      />
    </div>
  );
}
