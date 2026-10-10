import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, Breadcrumbs, type ColumnDef } from '@exzaestate/ui';
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
        <span className="text-text-muted font-mono">
          {r.confirmedAt ? r.confirmedAt.split('T')[0] : '-'}
        </span>
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
        <span className="font-mono tabular-nums font-semibold text-success">
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
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Sales & Booking Register' },
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
              <h1 className="text-h1 font-bold text-text">Sales & Booking Register</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                SAL-01 · Allotment Contracts
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Confirmed sales, allotment contracts, and revenue booking register
            </p>
          </div>

          {report && (
            <div className="flex items-center gap-2 text-small">
              <div className="px-3 py-1 rounded-full bg-surface-sunken border border-border text-caption">
                Total Sales:{' '}
                <strong className="font-mono tabular-nums text-text font-bold">
                  {report.summary.totalSalesFormatted}
                </strong>
              </div>
              <div className="px-3 py-1 rounded-full bg-surface-sunken border border-border text-caption">
                Count:{' '}
                <strong className="font-mono tabular-nums text-text font-bold">
                  {report.summary.totalSalesCount}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Unified Sales Register Workspace Card */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Sales Report"
        errorMessage="Could not load the sales report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        <div className="rounded-card border border-border bg-surface shadow-xs">
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
          {report && (
            <DataTable
              embedded
              data={report.rows}
              columns={columns}
              keyExtractor={(r) => r.bookingId}
            />
          )}
        </div>
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
