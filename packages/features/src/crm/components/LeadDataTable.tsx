import type { ReactElement } from 'react';
import { DataTable, StatusBadge, IconButton, Button, type ColumnDef } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import { Phone, Mail, ArrowRightCircle, CalendarPlus } from 'lucide-react';
import type { LeadItem } from '../hooks/useLeadList.js';

interface LeadDataTableProps {
  leads: LeadItem[];
  isLoading: boolean;
  onSelectLead: (lead: LeadItem) => void;
  onConvertLead: (lead: LeadItem) => void;
  onAddFollowUp: (lead: LeadItem) => void;
}

export function LeadDataTable({
  leads,
  isLoading,
  onSelectLead,
  onConvertLead,
  onAddFollowUp,
}: LeadDataTableProps): ReactElement {
  const columns: ColumnDef<LeadItem>[] = [
    {
      key: 'lead',
      header: 'Prospect',
      render: (item) => (
        <div>
          <span className="font-semibold text-text hover:underline cursor-pointer">
            {item.fullName}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-caption text-text-muted">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {item.phone}
            </span>
            {item.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {item.email}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stage',
      render: (item) => <StatusBadge domain="lead" value={(item.status || 'NEW').toUpperCase()} />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (item) => (
        <span className="text-small text-text-2 uppercase font-medium">{item.source}</span>
      ),
    },
    {
      key: 'budget',
      header: 'Budget Range',
      render: (item) => {
        if (!item.budgetMaxPaisa) return <span className="text-text-muted text-small">—</span>;
        return (
          <span className="font-mono text-small text-text">
            {formatMoney(BigInt(item.budgetMaxPaisa))}
          </span>
        );
      },
    },
    {
      key: 'assignedTo',
      header: 'Assigned Executive',
      render: (item) => (
        <span className="text-small text-text-2">{item.assignedTo?.fullName ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item) => (
        <span className="text-caption text-text-muted">
          {formatDate(item.createdAt, 'Asia/Dhaka')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton
            aria-label={`Schedule follow-up for ${item.fullName}`}
            icon={<CalendarPlus className="w-4 h-4 text-primary" />}
            onClick={() => onAddFollowUp(item)}
          />
          {item.status.toUpperCase() !== 'CUSTOMER' && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => onConvertLead(item)}
            >
              <ArrowRightCircle className="w-3.5 h-3.5 text-success" />
              <span>Convert</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={leads}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      onRowClick={onSelectLead}
      columns={columns}
      embedded
    />
  );
}
