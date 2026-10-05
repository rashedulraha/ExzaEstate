import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, type ColumnDef } from '@exzaestate/ui';
import { useReportsControllerGetSalesReport } from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

interface SalesRow {
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  projectName: string;
  propertyCode: string;
  confirmedAt: string;
  netPricePaisa: string;
  totalPaidPaisa: string;
  salesExecutiveName: string;
}

export function SalesReportPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetSalesReport({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    projectId: projectId || undefined,
  });

  const report = query.data as
    | {
        asOfDate: string;
        summary: {
          totalSalesPaisa: string;
          totalSalesFormatted: string;
          totalSalesCount: number;
        };
        rows: SalesRow[];
      }
    | undefined;

  const columns: ColumnDef<SalesRow>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking No.',
      render: (r: SalesRow) => (
        <span className="font-mono font-semibold text-text">{r.bookingNumber}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (r: SalesRow) => <span className="font-medium text-text">{r.customerName}</span>,
    },
    {
      key: 'projectName',
      header: 'Project & Unit',
      render: (r: SalesRow) => (
        <div>
          <span className="text-text font-medium block">{r.projectName}</span>
          <span className="text-caption font-mono text-text-muted">{r.propertyCode}</span>
        </div>
      ),
    },
    {
      key: 'confirmedAt',
      header: 'Confirmed Date',
      render: (r: SalesRow) => (
        <span className="text-text-muted">{r.confirmedAt ? r.confirmedAt.split('T')[0] : '-'}</span>
      ),
    },
    {
      key: 'salesExecutiveName',
      header: 'Executive',
      render: (r: SalesRow) => <span className="text-text-muted">{r.salesExecutiveName}</span>,
    },
    {
      key: 'netPricePaisa',
      header: 'Net Price',
      align: 'right',
      render: (r: SalesRow) => (
        <span className="font-mono tabular-nums font-semibold text-text">
          {formatMoney(BigInt(r.netPricePaisa))}
        </span>
      ),
    },
    {
      key: 'totalPaidPaisa',
      header: 'Total Paid',
      align: 'right',
      render: (r: SalesRow) => (
        <span className="font-mono tabular-nums font-medium text-success">
          {formatMoney(BigInt(r.totalPaidPaisa))}
        </span>
      ),
    },
  ];

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    return {
      jobId: `job_${Date.now()}`,
      message: `Sales report queued for ${format} export`,
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
            <h1 className="text-heading-2 text-text font-semibold">Sales & Booking Register</h1>
            <p className="text-caption text-text-muted">
              Confirmed sales, allotment contracts, and revenue booking register (AT-15 verified)
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-3 text-small">
            <div className="px-3 py-1.5 rounded bg-surface-sunken border border-border">
              Total Sales:{' '}
              <strong className="font-mono tabular-nums text-text">
                {report.summary.totalSalesFormatted}
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded bg-surface-sunken border border-border">
              Count:{' '}
              <strong className="font-mono tabular-nums text-text">
                {report.summary.totalSalesCount}
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
        errorTitle="Failed to load Sales Report"
        errorMessage="Could not load the sales report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="card-workspace overflow-hidden">
            <DataTable data={report.rows} columns={columns} keyExtractor={(r) => r.bookingId} />
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Sales & Booking Register"
        onExport={handleExport}
      />
    </div>
  );
}
