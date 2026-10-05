import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button } from '@exzaestate/ui';
import {
  useReportsControllerGetTrialBalance,
  useReportsControllerExportTrialBalance,
} from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

function TrialBalanceStatusBadge({ isBalanced }: { isBalanced: boolean }) {
  if (isBalanced) {
    return (
      <div className="px-3 py-1.5 rounded-full flex items-center gap-2 text-small font-semibold bg-success/12 text-success border border-success/30">
        <CheckCircle2 className="w-4 h-4" />
        <span>Ledger in Perfect Balance</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 rounded-full flex items-center gap-2 text-small font-semibold bg-danger/12 text-danger border border-danger/30">
      <AlertTriangle className="w-4 h-4" />
      <span>Out of Balance</span>
    </div>
  );
}

export function TrialBalanceReportPage() {
  const navigate = useNavigate();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetTrialBalance({
    asOfDate: asOfDate || undefined,
    projectId: projectId || undefined,
  });

  const exportMutation = useReportsControllerExportTrialBalance();

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
      {/* Top Navigation & Title */}
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
            <h1 className="text-heading-2 text-text font-semibold">Trial Balance</h1>
            <p className="text-caption text-text-muted">
              Double-entry audit verification: Total Debits equal Total Credits (RULE-DOUBLE-ENTRY)
            </p>
          </div>
        </div>

        {/* Balance Status Indicator */}
        {report && <TrialBalanceStatusBadge isBalanced={isBalanced} />}
      </div>

      {/* Filter Bar */}
      <ReportFiltersBar
        mode="asOf"
        asOfDate={asOfDate}
        onAsOfDateChange={setAsOfDate}
        projectId={projectId}
        onProjectIdChange={setProjectId}
        onRefresh={() => void query.refetch()}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Report Content */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Trial Balance"
        errorMessage="Could not load the trial balance report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="card-workspace p-6 space-y-6">
            {/* Header Strip */}
            <div className="flex items-center justify-between text-caption text-text-muted border-b border-border pb-3">
              <span>
                Period:{' '}
                <strong className="text-text">
                  {report.startDate} to {report.endDate}
                </strong>
              </span>
              <span>
                Currency: <strong className="text-text">BDT (৳)</strong>
              </span>
            </div>

            {/* Table */}
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-left text-small">
                <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Account Code</th>
                    <th className="px-4 py-2.5 font-medium">Account Name</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium">Debit Balance</th>
                    <th className="px-4 py-2.5 text-right font-medium">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {report.rows.map((row) => (
                    <tr key={row.accountId} className="hover:bg-surface-sunken/40">
                      <td className="px-4 py-2.5 font-mono text-caption font-semibold text-text">
                        {row.accountCode}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-text">{row.accountName}</td>
                      <td className="px-4 py-2.5 text-caption text-text-muted uppercase">
                        {row.accountType}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text">
                        {BigInt(row.netDebitPaisa || '0') > 0n
                          ? formatMoney(BigInt(row.netDebitPaisa))
                          : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text">
                        {BigInt(row.netCreditPaisa || '0') > 0n
                          ? formatMoney(BigInt(row.netCreditPaisa))
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Grand Total with double rule */}
                <tfoot className="bg-surface-sunken/80 border-t-2 border-b-4 border-double border-border-strong font-bold">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-text uppercase text-caption tracking-wider"
                    >
                      Total Trial Balance
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text text-body">
                      {formatMoney(BigInt(report.totalDebitPaisa))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text text-body">
                      {formatMoney(BigInt(report.totalCreditPaisa))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Trial Balance"
        onExport={handleExport}
      />
    </div>
  );
}
