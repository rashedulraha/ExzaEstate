import type { ReactElement } from 'react';
import { DataTable, StatusBadge, Button, type ColumnDef } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import type { QuotationItem } from '../../schemas/quotation.schema.js';

interface QuotationDataTableProps {
  quotations: QuotationItem[];
  isLoading: boolean;
  onPreviewPdf: (item: QuotationItem) => void;
  onSend: (item: QuotationItem) => void;
  onConvertToBooking: (item: QuotationItem) => void;
}

export function QuotationDataTable({
  quotations,
  isLoading,
  onPreviewPdf,
  onSend,
  onConvertToBooking,
}: QuotationDataTableProps): ReactElement {
  const columns: ColumnDef<QuotationItem>[] = [
    {
      key: 'quotationNumber',
      header: 'Quotation #',
      render: (row) => (
        <div>
          <button
            type="button"
            className="font-medium text-primary hover:underline text-left"
            onClick={() => onPreviewPdf(row)}
          >
            {row.quotationNumber}
          </button>
          <div className="text-caption text-text-muted mt-0.5">Unit: {row.propertyCode ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Client / Prospect',
      render: (row) => (
        <div>
          <div className="font-medium text-text">{row.partyName ?? 'Prospect'}</div>
          {row.partyType && (
            <span className="text-caption text-text-muted capitalize">
              {row.partyType.toLowerCase()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'netPrice',
      header: 'Net Price',
      isMoney: true,
      render: (row) => (
        <span className="font-semibold text-text">{formatMoney(row.netPricePaisa)}</span>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (row) => {
        if (!row.discountPct && (!row.discountAmountPaisa || row.discountAmountPaisa === '0')) {
          return <span className="text-text-muted">None</span>;
        }
        return (
          <span className="text-accent font-medium">
            {row.discountPct ? `${row.discountPct}%` : formatMoney(row.discountAmountPaisa)}
          </span>
        );
      },
    },
    {
      key: 'validity',
      header: 'Valid Until',
      render: (row) => (
        <span className="text-caption text-text-2">{formatDate(row.validUntil, 'Asia/Dhaka')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge domain="quotation" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onPreviewPdf(row)}>
            PDF
          </Button>
          {row.status === 'DRAFT' && (
            <Button variant="ghost" size="sm" onClick={() => onSend(row)}>
              Send
            </Button>
          )}
          {(row.status === 'APPROVED' || row.status === 'ACCEPTED' || row.status === 'SENT') && (
            <Button variant="primary" size="sm" onClick={() => onConvertToBooking(row)}>
              Book
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable<QuotationItem>
      data={quotations}
      columns={columns}
      isLoading={isLoading}
      keyExtractor={(item) => item.id}
    />
  );
}
