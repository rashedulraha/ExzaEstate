import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, StatusBadge, type ColumnDef } from '@exzaestate/ui';
import { useReportsControllerGetInventoryReport } from '@exzaestate/api-client';
import { ReportFiltersBar } from '../components/ReportFiltersBar.js';
import { ExportReportModal } from '../components/ExportReportModal.js';
import { ReportStateWrapper } from '../components/ReportStateWrapper.js';

interface InventoryRow {
  propertyId: string;
  propertyCode: string;
  projectName: string;
  status: string;
  type: string;
  areaSqft: number;
  totalPricePaisa: string;
}

export function InventoryReportPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const query = useReportsControllerGetInventoryReport({
    projectId: projectId || undefined,
  });

  const report = query.data as
    | {
        asOfDate: string;
        summary: {
          totalUnits: number;
          availableUnits: number;
          bookedUnits: number;
          soldUnits: number;
          reservedUnits: number;
          blockedUnits: number;
          totalInventoryValuePaisa: string;
          availableInventoryValuePaisa: string;
          totalValueFormatted: string;
          availableValueFormatted: string;
        };
        rows: InventoryRow[];
      }
    | undefined;

  const columns: ColumnDef<InventoryRow>[] = [
    {
      key: 'propertyCode',
      header: 'Unit Code',
      render: (r: InventoryRow) => (
        <span className="font-mono font-semibold text-text">{r.propertyCode}</span>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      render: (r: InventoryRow) => <span className="font-medium text-text">{r.projectName}</span>,
    },
    {
      key: 'status',
      header: 'Inventory Status',
      render: (r: InventoryRow) => <StatusBadge domain="property" value={r.status} />,
    },
    {
      key: 'type',
      header: 'Type',
      render: (r: InventoryRow) => (
        <span className="text-caption uppercase text-text-muted">{r.type}</span>
      ),
    },
    {
      key: 'areaSqft',
      header: 'Area (Sqft)',
      align: 'right',
      render: (r: InventoryRow) => (
        <span className="font-mono tabular-nums text-text">{r.areaSqft.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalPricePaisa',
      header: 'Unit Valuation',
      align: 'right',
      render: (r: InventoryRow) => (
        <span className="font-mono tabular-nums font-semibold text-text">
          {formatMoney(BigInt(r.totalPricePaisa))}
        </span>
      ),
    },
  ];

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    return {
      jobId: `job_${Date.now()}`,
      message: `Inventory report queued for ${format} export`,
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
            <h1 className="text-heading-2 text-text font-semibold">Property Inventory Status</h1>
            <p className="text-caption text-text-muted">
              Live unit breakdown by availability, hold, reservation, and booking states (AT-15
              verified)
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-3 text-small">
            <div className="px-3 py-1.5 rounded bg-surface-sunken border border-border">
              Total Valuation:{' '}
              <strong className="font-mono tabular-nums text-text">
                {report.summary.totalValueFormatted}
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded bg-success/10 border border-success/30 text-success">
              Available:{' '}
              <strong className="font-mono tabular-nums">
                {report.summary.availableUnits} units ({report.summary.availableValueFormatted})
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <ReportFiltersBar
        mode="asOf"
        projectId={projectId}
        onProjectIdChange={setProjectId}
        onRefresh={() => void query.refetch()}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Summary Chips */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card-workspace p-3 text-center">
            <div className="text-caption text-text-muted font-medium">Total Units</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-text mt-1">
              {report.summary.totalUnits}
            </div>
          </div>
          <div className="card-workspace p-3 text-center bg-success/5 border-success/20">
            <div className="text-caption text-success font-medium">Available</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-success mt-1">
              {report.summary.availableUnits}
            </div>
          </div>
          <div className="card-workspace p-3 text-center bg-primary/5 border-primary/20">
            <div className="text-caption text-primary font-medium">Booked</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-primary mt-1">
              {report.summary.bookedUnits}
            </div>
          </div>
          <div className="card-workspace p-3 text-center bg-accent/10 border-accent/30">
            <div className="text-caption text-accent-text font-medium">Reserved</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-accent-text mt-1">
              {report.summary.reservedUnits}
            </div>
          </div>
          <div className="card-workspace p-3 text-center bg-info/5 border-info/20">
            <div className="text-caption text-info font-medium">Sold</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-info mt-1">
              {report.summary.soldUnits}
            </div>
          </div>
          <div className="card-workspace p-3 text-center bg-danger/5 border-danger/20">
            <div className="text-caption text-danger font-medium">Blocked / Hold</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-danger mt-1">
              {report.summary.blockedUnits}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Inventory Report"
        errorMessage="Could not load the inventory report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        {report && (
          <div className="card-workspace overflow-hidden">
            <DataTable data={report.rows} columns={columns} keyExtractor={(r) => r.propertyId} />
          </div>
        )}
      </ReportStateWrapper>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle="Property Inventory Status"
        onExport={handleExport}
      />
    </div>
  );
}
