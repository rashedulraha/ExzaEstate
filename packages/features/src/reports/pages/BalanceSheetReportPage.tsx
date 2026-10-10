import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, Breadcrumbs } from '@exzaestate/ui';
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
      <div className="px-3 py-1 rounded-full flex items-center gap-2 text-caption font-semibold bg-success/12 text-success border border-success/30">
        <CheckCircle2 className="w-4 h-4" />
        <span>Balanced Equation</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-1 rounded-full flex items-center gap-2 text-caption font-semibold bg-danger/12 text-danger border border-danger/30">
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
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Balance Sheet' },
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
              <h1 className="text-h1 font-bold text-text">Balance Sheet</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                FIN-02 · Statement of Financial Position
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Statement of Financial Position: Assets = Liabilities + Equity
            </p>
          </div>

          {report && <BalanceSheetEquationBadge isBalanced={isBalanced} />}
        </div>
      </div>

      {/* Tier 2: Unified Balance Sheet Workspace Card */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Balance Sheet"
        errorMessage="Could not load the balance sheet report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        <div className="rounded-card border border-border bg-surface shadow-xs">
          <ReportFiltersBar
            mode="asOf"
            asOfDate={asOfDate}
            onAsOfDateChange={setAsOfDate}
            projectId={projectId}
            onProjectIdChange={setProjectId}
            onRefresh={() => void query.refetch()}
            onOpenExport={() => setIsExportOpen(true)}
          />
          {report && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Assets */}
                <div className="rounded-card border border-border bg-surface shadow-xs p-6 space-y-4">
                  <div className="border-b border-border pb-3 flex items-center justify-between">
                    <h3 className="text-body font-bold text-text uppercase tracking-wide">
                      Assets
                    </h3>
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
                          className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                        >
                          <div>
                            <span className="font-mono text-caption text-text-muted mr-2">
                              {a.accountCode}
                            </span>
                            <span className="text-text font-medium">{a.accountName}</span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-text">
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
                            className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                          >
                            <div>
                              <span className="font-mono text-caption text-text-muted mr-2">
                                {a.accountCode}
                              </span>
                              <span className="text-text font-medium">{a.accountName}</span>
                            </div>
                            <span className="font-mono tabular-nums font-semibold text-text">
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
                    <span className="font-mono tabular-nums text-heading-3 text-text">
                      {formatMoney(BigInt(report.assets.totalAssetsPaisa))}
                    </span>
                  </div>
                </div>

                {/* Right Column: Liabilities & Equity */}
                <div className="rounded-card border border-border bg-surface shadow-xs p-6 space-y-4">
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
                          className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                        >
                          <div>
                            <span className="font-mono text-caption text-text-muted mr-2">
                              {l.accountCode}
                            </span>
                            <span className="text-text font-medium">{l.accountName}</span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-text">
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
                          className="py-2.5 flex items-center justify-between text-small hover:bg-surface-sunken/30 px-1 rounded transition-colors"
                        >
                          <div>
                            <span className="font-mono text-caption text-text-muted mr-2">
                              {eq.accountCode}
                            </span>
                            <span className="text-text font-medium">{eq.accountName}</span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-text">
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
                    <span className="font-mono tabular-nums text-heading-3 text-text">
                      {formatMoney(BigInt(report.totalLiabilitiesAndEquityPaisa))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
