import { useMemo } from 'react';
import {
  useCashBankControllerListAccounts,
  useCashBankControllerTransfer,
  useCashBankControllerListReconciliations,
  useCashBankControllerCreateReconciliation,
  useCashBankControllerCompleteReconciliation,
} from '@exzaestate/api-client';
import type { CashBankAccountItem, CashTransferInput } from '../schemas/accounting.schema.js';

interface RawBankAccount {
  id: string;
  accountName: string;
  accountType?: string;
  accountNumberMasked?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  currentBalancePaisa?: string | number | bigint;
  isReconciled?: boolean;
}

function parseBankAccounts(data: unknown): CashBankAccountItem[] {
  if (!data || typeof data !== 'object') return [];
  let rawList: unknown[] = [];

  if (Array.isArray(data)) {
    rawList = data;
  } else if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    rawList = (data as { items: unknown[] }).items;
  }

  return rawList.map((item) => {
    const b = item as RawBankAccount;
    return {
      id: b.id,
      accountName: b.accountName,
      accountType: (b.accountType || 'CURRENT') as CashBankAccountItem['accountType'],
      accountNumberMasked: b.accountNumberMasked ?? null,
      bankName: b.bankName ?? null,
      branchName: b.branchName ?? null,
      currentBalancePaisa: (b.currentBalancePaisa ?? '0').toString(),
      isReconciled: Boolean(b.isReconciled),
    };
  });
}

export function useCashBank() {
  const accountsQuery = useCashBankControllerListAccounts({
    accountType: undefined as unknown as string,
    isActive: undefined as unknown as string,
  });
  const transferMutation = useCashBankControllerTransfer();
  const reconciliationsQuery = useCashBankControllerListReconciliations({
    bankAccountId: '',
  });
  const createReconMutation = useCashBankControllerCreateReconciliation();
  const completeReconMutation = useCashBankControllerCompleteReconciliation();

  const accounts = useMemo(() => {
    return parseBankAccounts(accountsQuery.data);
  }, [accountsQuery.data]);

  const handleTransfer = async (input: CashTransferInput) => {
    await transferMutation.mutateAsync({
      data: {
        sourceBankAccountId: input.sourceBankAccountId,
        destinationBankAccountId: input.destinationBankAccountId,
        amountPaisa: input.amountPaisa,
        transferDate: input.transferDate,
        referenceNumber: input.referenceNumber || undefined,
        narration: input.narration || undefined,
      },
    });
    accountsQuery.refetch();
  };

  const handleCreateReconciliation = async (
    bankAccountId: string,
    endingBalancePaisa: string,
    cutoffDate: string,
  ) => {
    const res = await createReconMutation.mutateAsync({
      data: {
        bankAccountId,
        statementBalancePaisa: endingBalancePaisa,
        statementDate: cutoffDate,
      },
    });
    reconciliationsQuery.refetch();
    return res;
  };

  const handleCompleteReconciliation = async (reconId: string) => {
    await completeReconMutation.mutateAsync({
      id: reconId,
    });
    reconciliationsQuery.refetch();
    accountsQuery.refetch();
  };

  return {
    accounts,
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
    refetch: accountsQuery.refetch,
    transferFunds: handleTransfer,
    createReconciliation: handleCreateReconciliation,
    completeReconciliation: handleCompleteReconciliation,
    isSubmitting:
      transferMutation.isPending ||
      createReconMutation.isPending ||
      completeReconMutation.isPending,
  };
}
