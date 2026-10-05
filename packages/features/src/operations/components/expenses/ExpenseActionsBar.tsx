import { Button } from '@exzaestate/ui';
import { CheckCircle, XCircle, Send, Check } from 'lucide-react';
import type { ExpenseVoucherItem } from '../../schemas/operations.schema.js';

export interface ExpenseActionsBarProps {
  voucher: ExpenseVoucherItem;
  canSubmit: boolean;
  canApprove: boolean;
  canVerify: boolean;
  canPay: boolean;
  canReject: boolean;
  onSubmit?: (id: string) => Promise<unknown>;
  onApprove?: (id: string) => Promise<unknown>;
  onVerify?: (id: string) => Promise<unknown>;
  onPay?: (voucher: ExpenseVoucherItem) => void;
  onStartReject: () => void;
  isSubmitting: boolean;
}

function SubmitButton({
  voucherId,
  show,
  isSubmitting,
  onSubmit,
}: {
  voucherId: string;
  show: boolean;
  isSubmitting: boolean;
  onSubmit?: (id: string) => Promise<unknown>;
}) {
  if (!show || !onSubmit) return null;
  return (
    <Button
      variant="primary"
      onClick={() => onSubmit(voucherId)}
      isLoading={isSubmitting}
      disabled={isSubmitting}
      data-testid="submit-expense-btn"
    >
      <Send className="w-4 h-4 mr-1.5" /> Submit for Approval
    </Button>
  );
}

function ApproveButton({
  voucherId,
  show,
  isSubmitting,
  onApprove,
}: {
  voucherId: string;
  show: boolean;
  isSubmitting: boolean;
  onApprove?: (id: string) => Promise<unknown>;
}) {
  if (!show || !onApprove) return null;
  return (
    <Button
      variant="primary"
      onClick={() => onApprove(voucherId)}
      isLoading={isSubmitting}
      disabled={isSubmitting}
      data-testid="approve-expense-btn"
    >
      <Check className="w-4 h-4 mr-1.5" /> Approve Voucher
    </Button>
  );
}

function VerifyButton({
  voucherId,
  show,
  isSubmitting,
  onVerify,
}: {
  voucherId: string;
  show: boolean;
  isSubmitting: boolean;
  onVerify?: (id: string) => Promise<unknown>;
}) {
  if (!show || !onVerify) return null;
  return (
    <Button
      variant="accent"
      onClick={() => onVerify(voucherId)}
      isLoading={isSubmitting}
      disabled={isSubmitting}
      data-testid="verify-expense-btn"
    >
      <CheckCircle className="w-4 h-4 mr-1.5" /> Verify Voucher
    </Button>
  );
}

function PayButton({
  voucher,
  show,
  isSubmitting,
  onPay,
}: {
  voucher: ExpenseVoucherItem;
  show: boolean;
  isSubmitting: boolean;
  onPay?: (voucher: ExpenseVoucherItem) => void;
}) {
  if (!show || !onPay) return null;
  return (
    <Button
      variant="primary"
      onClick={() => onPay(voucher)}
      disabled={isSubmitting}
      data-testid="pay-expense-btn"
    >
      Disburse Payment
    </Button>
  );
}

function RejectButton({
  show,
  isSubmitting,
  onStartReject,
}: {
  show: boolean;
  isSubmitting: boolean;
  onStartReject: () => void;
}) {
  if (!show) return null;
  return (
    <Button
      variant="destructive"
      onClick={onStartReject}
      disabled={isSubmitting}
      data-testid="reject-expense-trigger-btn"
    >
      <XCircle className="w-4 h-4 mr-1.5" /> Reject
    </Button>
  );
}

export function ExpenseActionsBar({
  voucher,
  canSubmit,
  canApprove,
  canVerify,
  canPay,
  canReject,
  onSubmit,
  onApprove,
  onVerify,
  onPay,
  onStartReject,
  isSubmitting,
}: ExpenseActionsBarProps) {
  const isPending = voucher.status === 'SUBMITTED' || voucher.status === 'APPROVED';

  return (
    <div className="flex items-center gap-2">
      <SubmitButton
        voucherId={voucher.id}
        show={voucher.status === 'DRAFT' && canSubmit}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
      <ApproveButton
        voucherId={voucher.id}
        show={voucher.status === 'SUBMITTED' && canApprove}
        isSubmitting={isSubmitting}
        onApprove={onApprove}
      />
      <VerifyButton
        voucherId={voucher.id}
        show={voucher.status === 'APPROVED' && canVerify}
        isSubmitting={isSubmitting}
        onVerify={onVerify}
      />
      <PayButton
        voucher={voucher}
        show={(voucher.status === 'VERIFIED' || voucher.status === 'APPROVED') && canPay}
        isSubmitting={isSubmitting}
        onPay={onPay}
      />
      <RejectButton
        show={isPending && canReject}
        isSubmitting={isSubmitting}
        onStartReject={onStartReject}
      />
    </div>
  );
}
