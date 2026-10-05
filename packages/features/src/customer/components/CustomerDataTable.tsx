import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef } from '@exzaestate/ui';
import { formatDate } from '@exzaestate/shared';
import { Phone, Mail, ArrowUpRight } from 'lucide-react';
import type { CustomerItem } from '../hooks/useCustomerList.js';

interface CustomerDataTableProps {
  customers: CustomerItem[];
  isLoading: boolean;
  onSelectCustomer: (customer: CustomerItem) => void;
}

export function CustomerDataTable({
  customers,
  isLoading,
  onSelectCustomer,
}: CustomerDataTableProps): ReactElement {
  const columns: ColumnDef<CustomerItem>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (item) => (
        <span className="font-mono text-small font-semibold text-primary">{item.customerCode}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer Name',
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
      key: 'kyc',
      header: 'KYC Status',
      render: (item) => <StatusBadge value={item.kycStatus} />,
    },
    {
      key: 'occupation',
      header: 'Occupation',
      render: (item) => <span className="text-small text-text-2">{item.occupation || '—'}</span>,
    },
    {
      key: 'registered',
      header: 'Registered',
      render: (item) => (
        <span className="text-caption text-text-muted">
          {formatDate(item.createdAt, 'Asia/Dhaka')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '360 View',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-primary hover:text-primary"
            onClick={() => onSelectCustomer(item)}
          >
            <span>View 360</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={customers}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      onRowClick={onSelectCustomer}
      columns={columns}
    />
  );
}
