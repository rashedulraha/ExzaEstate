import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, Breadcrumbs, type ColumnDef } from '@exzaestate/ui';
import { useReportsControllerGetCollectionReport } from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

interface CollectionRow {
  paymentId: string;
  paymentNumber: string;
  receiptNumber?: string | null;
  customerName: string;
  amountPaisa: string;
  paymentMethod: string;
  paymentType: string;
  postedAt: string;
}

export function CollectionReportPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetCollectionReport({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    projectId: projectId || undefined,
  });

  const report = query.data as
    | {
        asOfDate: string;
        summary: {
          totalCollectionPaisa: string;
          totalCollectionFormatted: string;
          totalCollectionCount: number;
        };
        rows: CollectionRow[];
      }
    | undefined;

  const columns: ColumnDef<CollectionRow>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment No.',
      render: (r: CollectionRow) => (
        <span className="font-mono font-semibold text-text">{r.paymentNumber}</span>
      ),
    },
    {
      key: 'receiptNumber',
      header: 'Receipt No.',
      render: (r: CollectionRow) => (
        <span className="font-mono text-text-muted">{r.receiptNumber ?? '-'}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (r: CollectionRow) => <span className="font-medium text-text">{r.customerName}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (r: CollectionRow) => (
        <span className="px-2 py-0.5 rounded text-caption bg-surface-sunken font-medium uppercase text-text border border-border">
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: 'postedAt',
      header: 'Posted Date',
      render: (r: CollectionRow) => (
        <span className="text-text-muted font-mono">
          {r.postedAt ? r.postedAt.split('T')[0] : '-'}
        </span>
      ),
    },
    {
      key: 'amountPaisa',
      header: 'Realized Amount',
      align: 'right',
      render: (r: CollectionRow) => (
        <span className="font-mono tabular-nums font-semibold text-success">
          {formatMoney(BigInt(r.amountPaisa))}
        </span>
      ),
    },
  ];

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    return {
      jobId: `job_${Date.now()}`,
      message: `Collection report queued for ${format} export`,
    };
  };

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Collection & Realization' },
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
              <h1 className="text-h1 font-bold text-text">Collection & Realization Report</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                COL-01 · Collections & AR
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Cleared installment collections and customer receipts (AT-15 verified)
            </p>
          </div>

          {report && (
            <div className="flex items-center gap-2 text-small">
              <div className="px-3 py-1 rounded-full bg-surface-sunken border border-border text-caption">
                Total Realized:{' '}
                <strong className="font-mono tabular-nums text-success font-bold">
                  {report.summary.totalCollectionFormatted}
                </strong>
              </div>
              <div className="px-3 py-1 rounded-full bg-surface-sunken border border-border text-caption">
                Receipts Count:{' '}
                <strong className="font-mono tabular-nums text-text font-bold">
                  {report.summary.totalCollectionCount}
                </strong>
              </div>
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
        errorTitle="Failed to load Collection Report"
        errorMessage="Could not load the collection report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden">
            <DataTable data={report.rows} columns={columns} keyExtractor={(r) => r.paymentId} />
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Collection & Realization"
        onExport={handleExport}
      />
    </div>
  );
}
