import type {
  PurchaseRequestStatus,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
} from '@exzaestate/shared';

export function getPrStatusBadge(status: PurchaseRequestStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'PENDING_APPROVAL':
      return 'border-warning/30 bg-warning/10 text-warning';
    case 'APPROVED':
      return 'border-success/30 bg-success/10 text-success';
    case 'REJECTED':
      return 'border-danger/30 bg-danger/10 text-danger';
    case 'CONVERTED_TO_PO':
      return 'border-primary/30 bg-primary/10 text-primary';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger/10 text-danger';
    default:
      return 'border-border bg-surface-sunken text-text-muted';
  }
}

export function getPoStatusBadge(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'ORDERED':
      return 'border-info/30 bg-info/10 text-info';
    case 'PARTIALLY_RECEIVED':
      return 'border-warning/30 bg-warning/10 text-warning';
    case 'RECEIVED':
      return 'border-accent/30 bg-accent/10 text-accent';
    case 'CLOSED':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger/10 text-danger';
    default:
      return 'border-border bg-surface-sunken text-text-muted';
  }
}

export function getGrnStatusBadge(status: GoodsReceiptStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'RECEIVED':
      return 'border-success/30 bg-success/10 text-success';
    case 'REJECTED':
      return 'border-danger/30 bg-danger/10 text-danger';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger/10 text-danger';
    default:
      return 'border-border bg-surface-sunken text-text-muted';
  }
}

export function getPriorityBadge(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'): string {
  switch (priority) {
    case 'LOW':
      return 'border-border bg-surface-sunken text-text-muted';
    case 'MEDIUM':
      return 'border-info/30 bg-info/10 text-info';
    case 'HIGH':
      return 'border-warning/30 bg-warning/10 text-warning';
    case 'URGENT':
      return 'border-danger/30 bg-danger/10 text-danger';
    default:
      return 'border-border bg-surface-sunken text-text-muted';
  }
}
