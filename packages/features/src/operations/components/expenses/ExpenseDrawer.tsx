import { useState } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button, FormField, Input } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import {
  type ExpenseVoucherItem,
  EXPENSE_MD_THRESHOLD_PAISA,
} from '../../schemas/operations.schema.js';
import { getExpenseStatusBadge } from './ExpenseDataTable.js';
import { ExpenseActionsBar } from './ExpenseActionsBar.js';

export interface ExpenseDrawerProps {
  voucher: ExpenseVoucherItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitVoucher?: (id: string) => Promise<unknown>;
  onApproveVoucher?: (id: string) => Promise<unknown>;
  onVerifyVoucher?: (id: string) => Promise<unknown>;
  onOpenPay?: (voucher: ExpenseVoucherItem) => void;
  onRejectVoucher?: (id: string, reason: string) => Promise<unknown>;
  onSubmit?: (id: string) => Promise<unknown>;
  onApprove?: (id: string) => Promise<unknown>;
  onVerify?: (id: string) => Promise<unknown>;
  onPay?: (voucher: ExpenseVoucherItem) => void;
  onReject?: (id: string, reason: string) => Promise<unknown>;
  isSubmitting?: boolean;
}

function ExpenseThresholdBanner({ exceedsMdThreshold }: { exceedsMdThreshold: boolean }) {
  return (
    <div
      data-testid="expense-threshold-banner"
      className={`p-3.5 rounded-card border flex items-start gap-3 ${
        exceedsMdThreshold
          ? 'bg-warning/10 border-warning/30 text-warning'
          : 'bg-primary/8 border-primary/20 text-primary'
      }`}
    >
      {exceedsMdThreshold ? (
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
      )}
      <div>
        <span className="font-semibold block text-body">
          {exceedsMdThreshold
            ? 'High-Value Voucher (> ৳5,00,000): Requires Managing Director (MD) Approval'
            : 'Standard Voucher (≤ ৳5,00,000): GM or MD Approval Authorized'}
        </span>
        <span className="text-caption text-text-muted mt-0.5 block">
          {exceedsMdThreshold
            ? 'Amount exceeds ৳5,00,000 threshold (FLOW-11). Only Managing Director role may approve.'
            : 'Amount is within standard ৳5,00,000 limit. General Manager or Managing Director can approve.'}
        </span>
      </div>
    </div>
  );
}

function ExpenseMetadataSection({ voucher }: { voucher: ExpenseVoucherItem }) {
  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="text-caption uppercase tracking-wider text-text-muted font-semibold">
          Current Status
        </span>
        {getExpenseStatusBadge(voucher.status)}
      </div>

      <div className="grid grid-cols-2 gap-4 text-body pt-1">
        <div>
          <span className="text-caption text-text-muted block">Payee / Pay To</span>
          <span className="font-medium text-text">{voucher.payeeName}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Expense Amount</span>
          <span className="font-bold text-h3 text-text tabular-nums">
            {formatMoney(voucher.amountPaisa)}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Category</span>
          <span className="font-medium text-text">{voucher.categoryName || 'General'}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Project / Cost Center</span>
          <span className="font-medium text-text">
            {voucher.projectName || voucher.costCenter || 'Corporate Headquarters'}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Expense Date</span>
          <span className="font-medium text-text">{voucher.expenseDate}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Payment Method</span>
          <span className="font-medium text-text">{voucher.paymentMethod || 'Unspecified'}</span>
        </div>
      </div>
    </div>
  );
}

export function ExpenseDrawer({
  voucher,
  isOpen,
  onClose,
  onSubmitVoucher,
  onApproveVoucher,
  onVerifyVoucher,
  onOpenPay,
  onRejectVoucher,
  onSubmit,
  onApprove,
  onVerify,
  onPay,
  onReject,
  isSubmitting = false,
}: ExpenseDrawerProps) {
  const { hasPermission: canSubmit } = usePermission(PERMISSIONS.EXPENSE_SUBMIT);
  const { hasPermission: canApprove } = usePermission(PERMISSIONS.EXPENSE_APPROVE);
  const { hasPermission: canVerify } = usePermission(PERMISSIONS.EXPENSE_VERIFY);
  const { hasPermission: canPay } = usePermission(PERMISSIONS.EXPENSE_PAY);
  const { hasPermission: canReject } = usePermission(PERMISSIONS.EXPENSE_REJECT);

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!voucher) return null;

  const amountPaisa = BigInt(voucher.amountPaisa || '0');
  const exceedsMdThreshold = amountPaisa > EXPENSE_MD_THRESHOLD_PAISA;

  const effectiveReject = onRejectVoucher ?? onReject;
  const effectiveSubmit = onSubmitVoucher ?? onSubmit;
  const effectiveApprove = onApproveVoucher ?? onApprove;
  const effectiveVerify = onVerifyVoucher ?? onVerify;
  const effectivePay = onOpenPay ?? onPay;

  const handleConfirmReject = async () => {
    if (!rejectReason.trim() || !effectiveReject) return;
    await effectiveReject(voucher.id, rejectReason.trim());
    setIsRejecting(false);
    setRejectReason('');
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${voucher.voucherNumber} · ${voucher.payeeName}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>

          <ExpenseActionsBar
            voucher={voucher}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canVerify={canVerify}
            canPay={canPay}
            canReject={canReject}
            onSubmit={effectiveSubmit}
            onApprove={effectiveApprove}
            onVerify={effectiveVerify}
            onPay={effectivePay}
            onStartReject={() => setIsRejecting(true)}
            isSubmitting={isSubmitting}
          />
        </div>
      }
    >
      <div className="space-y-6 text-text" data-testid="expense-drawer-content">
        <ExpenseThresholdBanner exceedsMdThreshold={exceedsMdThreshold} />
        <ExpenseMetadataSection voucher={voucher} />

        <div className="space-y-1.5">
          <span className="text-h6 text-text-muted uppercase font-semibold">
            Purpose & Narration
          </span>
          <p className="p-3 bg-surface-sunken rounded-card text-body text-text border border-border">
            {voucher.description}
          </p>
        </div>

        {isRejecting && (
          <div className="p-4 rounded-card border border-danger/40 bg-danger/10 space-y-3">
            <span className="font-semibold text-danger block">Provide Rejection Justification</span>
            <FormField id="rejectReason" label="Reason for rejection" required>
              <Input
                id="rejectReason"
                placeholder="State reason why voucher is rejected"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                data-testid="confirm-expense-reject-btn"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
