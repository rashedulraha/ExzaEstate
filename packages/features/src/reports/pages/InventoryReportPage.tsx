import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, DataTable, StatusBadge, Breadcrumbs, type ColumnDef } from '@exzaestate/ui';
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
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Property Inventory Status' },
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
              <h1 className="text-h1 font-bold text-text">Property Inventory Status</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                INV-01 · Stock & Allocation
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Live unit breakdown by availability, hold, reservation, and booking states
            </p>
          </div>

          {report && (
            <div className="flex items-center gap-2 text-small">
              <div className="px-3 py-1 rounded-full bg-surface-sunken border border-border text-caption">
                Total Valuation:{' '}
                <strong className="font-mono tabular-nums text-text font-bold">
                  {report.summary.totalValueFormatted}
                </strong>
              </div>
              <div className="px-3 py-1 rounded-full bg-success/10 border border-success/30 text-success text-caption">
                Available:{' '}
                <strong className="font-mono tabular-nums font-bold">
                  {report.summary.availableUnits} units ({report.summary.availableValueFormatted})
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Units Strip */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-card border border-border bg-surface p-4 text-center shadow-xs">
            <div className="text-caption text-text-muted font-medium">Total Units</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-text mt-1">
              {report.summary.totalUnits}
            </div>
          </div>
          <div className="rounded-card border border-success/20 bg-success/5 p-4 text-center shadow-xs">
            <div className="text-caption text-success font-medium">Available</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-success mt-1">
              {report.summary.availableUnits}
            </div>
          </div>
          <div className="rounded-card border border-primary/20 bg-primary/5 p-4 text-center shadow-xs">
            <div className="text-caption text-primary font-medium">Booked</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-primary mt-1">
              {report.summary.bookedUnits}
            </div>
          </div>
          <div className="rounded-card border border-accent/30 bg-accent/10 p-4 text-center shadow-xs">
            <div className="text-caption text-accent-text font-medium">Reserved</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-accent-text mt-1">
              {report.summary.reservedUnits}
            </div>
          </div>
          <div className="rounded-card border border-info/20 bg-info/5 p-4 text-center shadow-xs">
            <div className="text-caption text-info font-medium">Sold</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-info mt-1">
              {report.summary.soldUnits}
            </div>
          </div>
          <div className="rounded-card border border-danger/20 bg-danger/5 p-4 text-center shadow-xs">
            <div className="text-caption text-danger font-medium">Blocked / Hold</div>
            <div className="text-heading-3 font-semibold font-mono tabular-nums text-danger mt-1">
              {report.summary.blockedUnits}
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Unified Inventory Workspace Card */}
      <ReportStateWrapper
        isLoading={query.isLoading}
        isError={query.isError}
        errorTitle="Failed to load Inventory Report"
        errorMessage="Could not load the inventory report from server."
        onRetry={() => void query.refetch()}
        hasData={Boolean(report)}
      >
        <div className="rounded-card border border-border bg-surface shadow-xs">
          <ReportFiltersBar
            mode="asOf"
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
              keyExtractor={(r) => r.propertyId}
            />
          )}
        </div>
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
