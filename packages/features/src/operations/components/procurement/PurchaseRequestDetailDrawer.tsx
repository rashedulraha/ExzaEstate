import { useState } from 'react';
import { Send, CheckCircle2, XCircle, ArrowRight, Calendar, User } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button, Input } from '@exzaestate/ui';
import type { PurchaseRequestItem } from '../../schemas/procurement.schema.js';
import { getPrStatusBadge, getPriorityBadge } from './procurement-status.js';

export interface PurchaseRequestDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pr: PurchaseRequestItem | null;
  onSubmitPr?: (id: string) => Promise<void>;
  onApprovePr?: (id: string) => Promise<void>;
  onRejectPr?: (id: string, reason: string) => Promise<void>;
  onOpenConvertToPo?: (pr: PurchaseRequestItem) => void;
}

export function PurchaseRequestDetailDrawer({
  isOpen,
  onClose,
  pr,
  onSubmitPr,
  onApprovePr,
  onRejectPr,
  onOpenConvertToPo,
}: PurchaseRequestDetailDrawerProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pr) return null;

  const handleAction = async (actionFn: () => Promise<void>) => {
    setIsProcessing(true);
    setError(null);
    try {
      await actionFn();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !onRejectPr) return;
    await handleAction(() => onRejectPr(pr.id, rejectReason.trim()));
    setIsRejecting(false);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={pr.prNumber}
      subtitle="Purchase Request / Material Requisition"
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-caption font-semibold ${getPrStatusBadge(
              pr.status,
            )}`}
          >
            {pr.status}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-caption font-semibold ${getPriorityBadge(
              pr.priority,
            )}`}
          >
            Priority: {pr.priority}
          </span>
        </div>

        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}

        <div className="rounded-card border border-border bg-surface-sunken/40 p-4 space-y-2">
          <h3 className="text-body font-semibold text-text">{pr.title}</h3>
          <div className="grid grid-cols-2 gap-2 text-caption text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Required: {pr.requiredDate || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Department: {pr.department || 'Procurement'}</span>
            </div>
          </div>
          {pr.notes && (
            <div className="pt-2 text-caption text-text-muted border-t border-border">
              Notes: {pr.notes}
            </div>
          )}
          {pr.rejectionReason && (
            <div className="pt-2 text-caption text-danger border-t border-danger/20">
              Rejection Reason: {pr.rejectionReason}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
            Requested Items ({pr.lines.length})
          </h4>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-surface-sunken/60 text-th">
                <tr>
                  <th className="px-3 py-2">Item Description</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-right">Est. Rate</th>
                  <th className="px-3 py-2 text-right">Est. Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-caption">
                {pr.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-text">{l.itemDescription}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {l.quantity} {l.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                      {formatMoney(BigInt(l.estimatedUnitPricePaisa))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-text tabular-nums">
                      {formatMoney(BigInt(l.estimatedAmountPaisa || '0'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex justify-end text-body font-semibold text-text">
            <span>Total Estimated: </span>
            <span className="ml-2 font-mono text-primary">
              {formatMoney(BigInt(pr.totalEstimatedPaisa))}
            </span>
          </div>
        </div>

        {isRejecting ? (
          <div className="rounded-card border border-border bg-surface p-3 space-y-2">
            <Input
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                isLoading={isProcessing}
                disabled={!rejectReason.trim()}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-2 border-t border-border">
            {pr.status === 'DRAFT' && onSubmitPr && (
              <Button
                variant="primary"
                onClick={() => handleAction(() => onSubmitPr(pr.id))}
                disabled={isProcessing}
                isLoading={isProcessing}
                leftIcon={<Send className="h-4 w-4" />}
                className="w-full"
              >
                Submit for Approval
              </Button>
            )}
            {pr.status === 'PENDING_APPROVAL' && (
              <div className="grid grid-cols-2 gap-2">
                {onApprovePr && (
                  <Button
                    variant="primary"
                    onClick={() => handleAction(() => onApprovePr(pr.id))}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Approve PR
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setIsRejecting(true)}
                  disabled={isProcessing}
                  leftIcon={<XCircle className="h-4 w-4 text-danger" />}
                >
                  Reject PR
                </Button>
              </div>
            )}
            {pr.status === 'APPROVED' && onOpenConvertToPo && (
              <Button
                variant="primary"
                onClick={() => onOpenConvertToPo(pr)}
                leftIcon={<ArrowRight className="h-4 w-4" />}
                className="w-full"
              >
                Convert to Purchase Order (PO)
              </Button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
