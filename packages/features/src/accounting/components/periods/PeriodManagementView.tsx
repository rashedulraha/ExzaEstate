import { formatDate } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button, Select } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Lock, Unlock, Calendar } from 'lucide-react';
import type { FiscalPeriodItem, PeriodStatusEnum } from '../../schemas/accounting.schema.js';

export interface PeriodManagementViewProps {
  fiscalYears?: Array<{ id: string; name: string }>;
  selectedFiscalYearId?: string;
  onSelectFiscalYear?: (id: string) => void;
  periods: FiscalPeriodItem[];
  isLoading?: boolean;
  onClosePeriod: (period: FiscalPeriodItem) => void;
  onReopenPeriod: (period: FiscalPeriodItem) => void;
}

function getPeriodStatusBadge(status: PeriodStatusEnum) {
  const styles: Record<PeriodStatusEnum, { label: string; cls: string }> = {
    OPEN: { label: 'Open', cls: 'bg-success/12 text-success border-success/20' },
    CLOSED: { label: 'Closed', cls: 'bg-warning/12 text-warning border-warning/20' },
    LOCKED: { label: 'Locked', cls: 'bg-primary/12 text-primary border-primary/20' },
  };

  const current = styles[status] || styles.OPEN;
  return (
    <span
      data-testid="period-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${current.cls}`}
    >
      {current.label}
    </span>
  );
}

export function PeriodManagementView({
  fiscalYears,
  selectedFiscalYearId,
  onSelectFiscalYear,
  periods,
  isLoading = false,
  onClosePeriod,
  onReopenPeriod,
}: PeriodManagementViewProps) {
  const { hasPermission: canClose } = usePermission(PERMISSIONS.PERIOD_CLOSE);
  const { hasPermission: canReopen } = usePermission(PERMISSIONS.PERIOD_REOPEN);

  const columns: ColumnDef<FiscalPeriodItem>[] = [
    {
      key: 'periodNumber',
      header: 'Period #',
      width: '80px',
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">P-{row.periodNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Period Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{row.name}</span>
          <span className="text-caption text-text-muted">{row.fiscalYearLabel}</span>
        </div>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (row) => <span className="text-text tabular-nums">{formatDate(row.startDate)}</span>,
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (row) => <span className="text-text tabular-nums">{formatDate(row.endDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => getPeriodStatusBadge(row.status),
    },
    {
      key: 'closedAt',
      header: 'Closed Info',
      render: (row) => {
        if (!row.closedAt) return <span className="text-text-muted">—</span>;
        return (
          <span className="text-caption text-text-muted">
            {formatDate(row.closedAt)} {row.closedBy ? `by ${row.closedBy}` : ''}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'OPEN' && canClose && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onClosePeriod(row)}
              data-testid={`close-period-${row.periodNumber}-btn`}
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Close Period
            </Button>
          )}

          {row.status === 'CLOSED' && canReopen && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onReopenPeriod(row)}
              data-testid={`reopen-period-${row.periodNumber}-btn`}
            >
              <Unlock className="w-3.5 h-3.5 mr-1" />
              Reopen
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4" data-testid="period-management-view">
      <div className="p-4 rounded-card border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          <div>
            <h3 className="text-h3 font-bold text-text">Accounting & Fiscal Periods</h3>
            <p className="text-caption text-text-muted">
              Control transaction locking and period closures to prevent retroactive entries.
            </p>
          </div>
        </div>

        {fiscalYears && fiscalYears.length > 0 && onSelectFiscalYear && (
          <div className="w-64">
            <Select
              value={selectedFiscalYearId || ''}
              options={fiscalYears.map((fy) => ({ value: fy.id, label: fy.name }))}
              onChange={(val) => onSelectFiscalYear(val)}
            />
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={periods}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          <div className="py-12 text-center text-text-muted">
            No accounting periods found for the current fiscal year.
          </div>
        }
      />
    </div>
  );
}
