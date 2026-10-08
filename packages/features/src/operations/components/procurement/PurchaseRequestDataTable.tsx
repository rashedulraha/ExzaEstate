import { FileSpreadsheet, Eye, Send, ArrowRight } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { IconButton, EmptyState } from '@exzaestate/ui';
import type { PurchaseRequestItem } from '../../schemas/procurement.schema.js';
import { getPrStatusBadge, getPriorityBadge } from './procurement-status.js';

export interface PurchaseRequestDataTableProps {
  requests: PurchaseRequestItem[];
  isLoading?: boolean;
  onSelectRequest: (pr: PurchaseRequestItem) => void;
  onSubmitRequest?: (pr: PurchaseRequestItem) => void;
  onConvertToPo?: (pr: PurchaseRequestItem) => void;
  onOpenCreateModal?: () => void;
}

function PurchaseRequestRowActions({
  pr,
  onSelect,
  onSubmit,
  onConvert,
}: {
  pr: PurchaseRequestItem;
  onSelect: (pr: PurchaseRequestItem) => void;
  onSubmit?: (pr: PurchaseRequestItem) => void;
  onConvert?: (pr: PurchaseRequestItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {pr.status === 'DRAFT' && onSubmit && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Send className="h-4 w-4 text-warning" />}
          aria-label="Submit for Approval"
          title="Submit for Approval"
          onClick={() => onSubmit(pr)}
        />
      )}
      {pr.status === 'APPROVED' && onConvert && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<ArrowRight className="h-4 w-4 text-primary" />}
          aria-label="Convert to Purchase Order"
          title="Convert to Purchase Order"
          onClick={() => onConvert(pr)}
        />
      )}
      <IconButton
        variant="ghost"
        size="sm"
        icon={<Eye className="h-4 w-4" />}
        aria-label="View PR Details"
        title="View PR Details"
        onClick={() => onSelect(pr)}
      />
    </div>
  );
}

function PurchaseRequestTableRow({
  pr,
  onSelect,
  onSubmit,
  onConvert,
}: {
  pr: PurchaseRequestItem;
  onSelect: (pr: PurchaseRequestItem) => void;
  onSubmit?: (pr: PurchaseRequestItem) => void;
  onConvert?: (pr: PurchaseRequestItem) => void;
}) {
  const estimatedPaisa = BigInt(pr.totalEstimatedPaisa || '0');

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3 font-mono font-medium text-primary">{pr.prNumber}</td>
      <td className="px-4 py-3">
        <div className="font-medium text-text">{pr.title}</div>
        {pr.department && <div className="text-caption text-text-muted">{pr.department}</div>}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getPriorityBadge(
            pr.priority,
          )}`}
        >
          {pr.priority}
        </span>
      </td>
      <td className="px-4 py-3 text-text-muted">{pr.requiredDate || '—'}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">
        {formatMoney(estimatedPaisa)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${getPrStatusBadge(
            pr.status,
          )}`}
        >
          {pr.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <PurchaseRequestRowActions
          pr={pr}
          onSelect={onSelect}
          onSubmit={onSubmit}
          onConvert={onConvert}
        />
      </td>
    </tr>
  );
}

export function PurchaseRequestDataTable({
  requests,
  isLoading,
  onSelectRequest,
  onSubmitRequest,
  onConvertToPo,
  onOpenCreateModal,
}: PurchaseRequestDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading purchase requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        dashedBorder
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title="No purchase requests recorded"
        description="Submit requisition requests for raw materials, construction items, and office supplies."
        actionLabel={onOpenCreateModal ? 'New Request' : undefined}
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="card-workspace overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">PR Number</th>
            <th className="px-4 py-3 text-th">Requisition Title</th>
            <th className="px-4 py-3 text-th">Priority</th>
            <th className="px-4 py-3 text-th">Required By</th>
            <th className="px-4 py-3 text-right text-th">Est. Amount</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {requests.map((pr) => (
            <PurchaseRequestTableRow
              key={pr.id}
              pr={pr}
              onSelect={onSelectRequest}
              onSubmit={onSubmitRequest}
              onConvert={onConvertToPo}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
