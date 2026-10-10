import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Breadcrumbs } from '@exzaestate/ui';
import { useCashBank } from '../hooks/useCashBank.js';
import { CashBankLedgerView } from '../components/cashbank/CashBankLedgerView.js';
import { BankTransferModal } from '../components/cashbank/BankTransferModal.js';
import { BankReconciliationModal } from '../components/cashbank/BankReconciliationModal.js';
import type { CashBankAccountItem, CashTransferInput } from '../schemas/accounting.schema.js';

export function CashBankPage() {
  const navigate = useNavigate();
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
    <div className="container-page space-y-6" data-testid="cash-bank-page">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Finance & Treasury' },
            { label: 'Treasury & Bank Accounts' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h1 font-bold text-text">Treasury & Bank Accounts</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                TRE-01 · Liquid Asset Registers
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Liquid cash balances, dual-entry bank transfers, and month-end bank statement
              reconciliations.
            </p>
          </div>
        </div>
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
