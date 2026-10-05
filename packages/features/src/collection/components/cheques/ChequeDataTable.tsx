import { useState } from 'react';
import { formatMoney, formatDate, PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { DataTable, type ColumnDef, StatusBadge, Button } from '@exzaestate/ui';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import type { ChequeLedgerItem, ChequeActionInput } from '../../schemas/collection.schema.js';
import { ChequeActionDialog } from './ChequeActionDialog.js';

export interface ChequeDataTableProps {
  cheques: ChequeLedgerItem[];
  isLoading?: boolean;
  onClearCheque: (input: ChequeActionInput) => Promise<void>;
  onBounceCheque: (input: ChequeActionInput) => Promise<void>;
  onViewReceipt?: (paymentId: string) => void;
}

interface ColumnOptions {
  canPost: boolean;
  onOpenAction: (cheque: ChequeLedgerItem, mode: 'CLEAR' | 'BOUNCE') => void;
  onViewReceipt?: (paymentId: string) => void;
}

function buildChequeColumns({
  canPost,
  onOpenAction,
  onViewReceipt,
}: ColumnOptions): ColumnDef<ChequeLedgerItem>[] {
  return [
    {
      key: 'chequeNumber',
      header: 'Cheque #',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{row.chequeNumber}</span>
          {row.bookingCode && (
            <span className="text-caption text-text-muted">{row.bookingCode}</span>
          )}
        </div>
      ),
    },
    {
      key: 'bankName',
      header: 'Bank & Branch',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-text font-medium">{row.bankName}</span>
          {row.branchName && <span className="text-caption text-text-muted">{row.branchName}</span>}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer / Drawer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-text">{row.customerName}</span>
          {row.drawerName && row.drawerName !== row.customerName && (
            <span className="text-caption text-text-muted">Drawer: {row.drawerName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'chequeDate',
      header: 'Cheque Date',
      render: (row) => <span className="text-text tabular-nums">{formatDate(row.chequeDate)}</span>,
    },
    {
      key: 'amountPaisa',
      header: 'Amount',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">{formatMoney(row.amountPaisa)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge domain="cheque" value={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        if (row.status === 'PENDING') {
          if (!canPost) return null;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenAction(row, 'CLEAR')}
                className="gap-1 text-success border-success/30 hover:bg-success/10"
                title="Mark cheque cleared"
                data-testid="clear-cheque-btn"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Clear</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenAction(row, 'BOUNCE')}
                className="gap-1 text-danger border-danger/30 hover:bg-danger/10"
                title="Mark cheque bounced"
                data-testid="bounce-cheque-btn"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Bounce</span>
              </Button>
            </div>
          );
        }

        if (row.status === 'CLEARED' && onViewReceipt) {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewReceipt(row.paymentId)}
              className="gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Receipt</span>
            </Button>
          );
        }

        return null;
      },
    },
  ];
}

export function ChequeDataTable({
  cheques,
  isLoading,
  onClearCheque,
  onBounceCheque,
  onViewReceipt,
}: ChequeDataTableProps) {
  const { hasPermission: canPost } = usePermission(PERMISSIONS.PAYMENT_POST);

  const [activeCheque, setActiveCheque] = useState<ChequeLedgerItem | null>(null);
  const [modalMode, setModalMode] = useState<'CLEAR' | 'BOUNCE' | null>(null);
  const [bounceReason, setBounceReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAction = (cheque: ChequeLedgerItem, mode: 'CLEAR' | 'BOUNCE') => {
    setActiveCheque(cheque);
    setModalMode(mode);
    setBounceReason('');
    setNotes('');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setActiveCheque(null);
  };

  const handleConfirmAction = async () => {
    if (!activeCheque || !modalMode) return;
    try {
      setIsSubmitting(true);
      if (modalMode === 'CLEAR') {
        await onClearCheque({
          chequeId: activeCheque.paymentId,
          action: 'CLEAR',
          notes: notes.trim() || undefined,
        });
      } else {
        await onBounceCheque({
          chequeId: activeCheque.paymentId,
          action: 'BOUNCE',
          bounceReason: bounceReason.trim() || 'Insufficient funds / stopped payment',
        });
      }
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = buildChequeColumns({
    canPost,
    onOpenAction: handleOpenAction,
    onViewReceipt,
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={cheques}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyState={<div className="py-12 text-center text-text-muted">No cheques in ledger.</div>}
      />

      <ChequeActionDialog
        activeCheque={activeCheque}
        modalMode={modalMode}
        bounceReason={bounceReason}
        notes={notes}
        isSubmitting={isSubmitting}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAction}
        onBounceReasonChange={setBounceReason}
        onNotesChange={setNotes}
      />
    </>
  );
}
