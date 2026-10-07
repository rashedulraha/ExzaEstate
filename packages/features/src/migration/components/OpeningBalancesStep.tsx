import { useState } from 'react';
import { Button, Input } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type {
  OpeningBalanceLine,
  PostOpeningBalanceFormData,
} from '../schemas/migration.schema.js';

export interface OpeningBalancesStepProps {
  batchId: string;
  onPostOpening: (batchId: string, data: PostOpeningBalanceFormData) => Promise<unknown>;
  isPosting: boolean;
}

const DEFAULT_ACCOUNTS = [
  { code: '1010', name: 'Cash on Hand' },
  { code: '1020', name: 'Primary Bank Account' },
  { code: '1200', name: 'Accounts Receivable (AR Control)' },
  { code: '2100', name: 'Accounts Payable (AP Control)' },
  { code: '2150', name: 'Customer Advances & Credits' },
  { code: '3000', name: 'Retained Earnings / Owner Equity' },
];

export function OpeningBalancesStep({
  batchId,
  onPostOpening,
  isPosting,
}: OpeningBalancesStepProps) {
  const [lines, setLines] = useState<OpeningBalanceLine[]>(
    DEFAULT_ACCOUNTS.map((acc) => ({
      accountCode: acc.code,
      debitPaisa: '0',
      creditPaisa: '0',
      description: `Opening balance for ${acc.name}`,
    })),
  );

  const handleAmountChange = (
    index: number,
    field: 'debitPaisa' | 'creditPaisa',
    valueInBdt: string,
  ) => {
    const bdt = parseFloat(valueInBdt) || 0;
    const paisa = Math.round(bdt * 100).toString();
    setLines((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (target) {
        copy[index] = { ...target, [field]: paisa };
      }
      return copy;
    });
  };

  const totalDebitPaisa = lines.reduce((acc, l) => acc + BigInt(l.debitPaisa || '0'), 0n);
  const totalCreditPaisa = lines.reduce((acc, l) => acc + BigInt(l.creditPaisa || '0'), 0n);
  const isBalanced = totalDebitPaisa === totalCreditPaisa && totalDebitPaisa > 0n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;
    const activeLines = lines.filter(
      (l) => BigInt(l.debitPaisa || '0') > 0n || BigInt(l.creditPaisa || '0') > 0n,
    );
    await onPostOpening(batchId, {
      narration: 'Go-Live Opening Balance Journal',
      lines: activeLines,
    });
  };

  return (
    <div className="rounded-card border border-border bg-surface p-6 space-y-6">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 1: Balance Sheet Opening Balances</h3>
        <p className="text-body-sm text-text-muted mt-0.5">
          Enter initial account balances. The opening journal must satisfy strict double-entry
          balance (Debit = Credit).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted uppercase">
                <th className="py-2.5 px-3">Account Code</th>
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-3 w-40 text-right">Debit (BDT)</th>
                <th className="py-2.5 px-3 w-40 text-right">Credit (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-body-sm">
              {DEFAULT_ACCOUNTS.map((acc, idx) => {
                const line = lines[idx];
                const debitBdt = (Number(line?.debitPaisa || '0') / 100).toString();
                const creditBdt = (Number(line?.creditPaisa || '0') / 100).toString();

                return (
                  <tr key={acc.code}>
                    <td className="py-2.5 px-3 font-mono font-medium text-primary">{acc.code}</td>
                    <td className="py-2.5 px-3 font-medium text-text">{acc.name}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={debitBdt === '0' ? '' : debitBdt}
                        onChange={(e) => handleAmountChange(idx, 'debitPaisa', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={creditBdt === '0' ? '' : creditBdt}
                        onChange={(e) => handleAmountChange(idx, 'creditPaisa', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-card border border-border bg-surface-sunken/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-6 text-body-sm">
            <div>
              <span className="text-text-muted">Total Debits:</span>{' '}
              <span className="font-bold font-mono text-text">{formatMoney(totalDebitPaisa)}</span>
            </div>
            <div>
              <span className="text-text-muted">Total Credits:</span>{' '}
              <span className="font-bold font-mono text-text">{formatMoney(totalCreditPaisa)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`text-caption font-semibold px-2.5 py-1 rounded-full border ${
                isBalanced
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-danger/10 text-danger border-danger/30'
              }`}
            >
              {isBalanced ? 'Journal Balanced' : 'Unbalanced Journal'}
            </span>
            <Button type="submit" variant="primary" disabled={!isBalanced} isLoading={isPosting}>
              Post Opening Journal
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
