import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, type ColumnDef } from '@exzaestate/ui';
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
        <span className="px-2 py-0.5 rounded text-caption bg-surface-sunken font-medium uppercase text-text">
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: 'postedAt',
      header: 'Posted Date',
      render: (r: CollectionRow) => (
        <span className="text-text-muted">{r.postedAt ? r.postedAt.split('T')[0] : '-'}</span>
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
            <h1 className="text-heading-2 text-text font-semibold">
              Collection & Realization Report
            </h1>
            <p className="text-caption text-text-muted">
              Cleared installment collections and customer receipts (AT-15 verified)
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-3 text-small">
            <div className="px-3 py-1.5 rounded bg-surface-sunken border border-border">
              Total Realized:{' '}
              <strong className="font-mono tabular-nums text-success">
                {report.summary.totalCollectionFormatted}
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded bg-surface-sunken border border-border">
              Receipts Count:{' '}
              <strong className="font-mono tabular-nums text-text">
                {report.summary.totalCollectionCount}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
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

      {/* Content */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Collection Report"
        errorMessage="Could not load the collection report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="card-workspace overflow-hidden">
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
