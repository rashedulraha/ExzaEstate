import { useState } from 'react';
import { useCashBank } from '../hooks/useCashBank.js';
import { CashBankLedgerView } from '../components/cashbank/CashBankLedgerView.js';
import { BankTransferModal } from '../components/cashbank/BankTransferModal.js';
import { BankReconciliationModal } from '../components/cashbank/BankReconciliationModal.js';
import type { CashBankAccountItem, CashTransferInput } from '../schemas/accounting.schema.js';

export function CashBankPage() {
  const { accounts, isLoading, transferFunds, createReconciliation, isSubmitting } = useCashBank();

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [reconcilingAccount, setReconcilingAccount] = useState<CashBankAccountItem | null>(null);

  const handleOpenTransfer = () => {
    setIsTransferOpen(true);
  };

  const handleOpenReconcile = (account: CashBankAccountItem) => {
    setReconcilingAccount(account);
  };

  const handleTransferSubmit = async (data: CashTransferInput) => {
    await transferFunds(data);
  };

  const handleReconcileSubmit = async (
    bankAccountId: string,
    endingBalancePaisa: string,
    cutoffDate: string,
  ) => {
    await createReconciliation(bankAccountId, endingBalancePaisa, cutoffDate);
  };

  return (
    <div className="space-y-6" data-testid="cash-bank-page">
      <div>
        <h1 className="text-h1 font-bold text-text">Treasury & Bank Accounts</h1>
        <p className="text-small text-text-muted mt-1">
          Liquid cash balances, dual-entry bank transfers, and month-end bank statement
          reconciliations.
        </p>
      </div>

      <CashBankLedgerView
        accounts={accounts}
        isLoading={isLoading}
        onOpenTransfer={handleOpenTransfer}
        onOpenReconcile={handleOpenReconcile}
      />

      <BankTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        onSubmit={handleTransferSubmit}
        isSubmitting={isSubmitting}
      />

      <BankReconciliationModal
        isOpen={Boolean(reconcilingAccount)}
        account={reconcilingAccount}
        onClose={() => setReconcilingAccount(null)}
        onSubmit={handleReconcileSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
