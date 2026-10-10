import { formatMoney } from '@exzaestate/shared';
import { DataTable, type ColumnDef, Button, EmptyState } from '@exzaestate/ui';
import { ArrowLeftRight, CheckCircle2, Landmark, Wallet } from 'lucide-react';
import type { CashBankAccountItem } from '../../schemas/accounting.schema.js';

export interface CashBankLedgerViewProps {
  accounts: CashBankAccountItem[];
  isLoading?: boolean;
  onOpenTransfer: () => void;
  onOpenReconcile: (account: CashBankAccountItem) => void;
}

function getAccountTypeBadge(type: CashBankAccountItem['accountType']) {
  switch (type) {
    case 'CASH':
      return (
        <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-success/12 text-success border border-success/20">
          Cash in Hand
        </span>
      );
    case 'MOBILE_WALLET':
      return (
        <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-info/12 text-info border border-info/20">
          Mobile Wallet
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-primary/12 text-primary border border-primary/20">
          {type}
        </span>
      );
  }
}

export function CashBankLedgerView({
  accounts,
  isLoading = false,
  onOpenTransfer,
  onOpenReconcile,
}: CashBankLedgerViewProps) {
  const totalBalancePaisa = accounts.reduce(
    (acc, a) => acc + BigInt(a.currentBalancePaisa || '0'),
    0n,
  );

  const columns: ColumnDef<CashBankAccountItem>[] = [
    {
      key: 'accountName',
      header: 'Account Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-primary">
            {row.accountType === 'CASH' ? (
              <Wallet className="w-4 h-4" />
            ) : (
              <Landmark className="w-4 h-4" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-text">{row.accountName}</span>
            {row.accountNumberMasked && (
              <span className="text-caption text-text-muted font-mono">
                {row.accountNumberMasked}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'accountType',
      header: 'Type',
      render: (row) => getAccountTypeBadge(row.accountType),
    },
    {
      key: 'bankName',
      header: 'Bank & Branch',
      render: (row) => {
        if (!row.bankName) return <span className="text-text-muted">—</span>;
        return (
          <span className="text-body text-text">
            {row.bankName} {row.branchName ? `(${row.branchName})` : ''}
          </span>
        );
      },
    },
    {
      key: 'currentBalancePaisa',
      header: 'Balance',
      align: 'right',
      isMoney: true,
      render: (row) => (
        <span className="font-bold text-text tabular-nums">
          {formatMoney(row.currentBalancePaisa)}
        </span>
      ),
    },
    {
      key: 'isReconciled',
      header: 'Reconciliation',
      align: 'center',
      render: (row) =>
        row.isReconciled ? (
          <span className="inline-flex items-center gap-1 text-success text-caption font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
          </span>
        ) : (
          <span className="text-caption text-text-muted">Unreconciled</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenReconcile(row)}
          data-testid={`reconcile-account-${row.id}`}
        >
          Reconcile
        </Button>
      ),
    },
  ];

  return (
    <div
      className="rounded-card border border-border bg-surface shadow-xs"
      data-testid="cash-bank-view"
    >
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-body font-bold text-text">Cash & Bank Accounts</h3>
          <p className="text-caption text-text-muted">
            Liquid asset accounts, bank statements, and internal fund transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={onOpenTransfer} data-testid="open-cash-transfer-btn">
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            Transfer Funds
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        embedded
        className="border-none shadow-none rounded-b-card"
        totalsRow={
          <div className="flex items-center justify-between px-4 py-3 font-extrabold text-text border-t-2 border-border bg-surface-sunken/40 rounded-b-card">
            <span className="text-caption uppercase tracking-wider text-text-muted font-bold">
              Total Liquid Treasury:
            </span>
            <span className="text-h4 tabular-nums text-text font-bold">
              {formatMoney(totalBalancePaisa.toString())}
            </span>
          </div>
        }
        emptyState={
          <EmptyState
            icon={<Landmark className="w-6 h-6 text-text-muted" />}
            title="No Bank or Cash Accounts Configured"
            description="Create or link liquid asset accounts under Chart of Accounts to track treasury."
            dashedBorder={false}
          />
        }
      />
    </div>
  );
}
