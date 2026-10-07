import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef } from '@exzaestate/ui';
import { formatDate } from '@exzaestate/shared';
import type { AgreementItem } from '../../schemas/agreement.schema.js';

interface AgreementDataTableProps {
  agreements: AgreementItem[];
  isLoading: boolean;
  onViewAgreement: (item: AgreementItem) => void;
  onSignAndLock: (item: AgreementItem) => void;
}

export function AgreementDataTable({
  agreements,
  isLoading,
  onViewAgreement,
  onSignAndLock,
}: AgreementDataTableProps): ReactElement {
  const columns: ColumnDef<AgreementItem>[] = [
    {
      key: 'agreementNumber',
      header: 'Agreement #',
      render: (row) => (
        <div>
          <button
            type="button"
            className="font-mono text-small font-semibold text-primary hover:underline text-left cursor-pointer"
            onClick={() => onViewAgreement(row)}
          >
            {row.agreementNumber}
          </button>
          <div className="text-caption text-text-muted mt-0.5">
            v{row.version} • {row.title}
          </div>
        </div>
      ),
    },
    {
      key: 'allottee',
      header: 'Allottee / Unit',
      render: (row) => (
        <div>
          <div className="font-medium text-text">{row.customerName ?? 'Allottee'}</div>
          <div className="text-caption text-text-muted font-mono mt-0.5">
            Unit: {row.propertyCode ?? '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Execution Status',
      render: (row) => {
        if (row.lockedAt) {
          return (
            <div className="text-caption text-success font-medium tabular-nums">
              Locked {formatDate(row.lockedAt, 'Asia/Dhaka')}
            </div>
          );
        }
        return <div className="text-caption text-warning font-medium">Execution Pending</div>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge domain="agreement" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-button"
            onClick={() => onViewAgreement(row)}
          >
            View
          </Button>
          {row.status === 'AGREEMENT_PENDING' && (
            <Button
              variant="primary"
              size="sm"
              className="rounded-button"
              onClick={() => onSignAndLock(row)}
            >
              Sign & Lock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable<AgreementItem>
      data={agreements}
      columns={columns}
      isLoading={isLoading}
      keyExtractor={(item) => item.id}
    />
  );
}
