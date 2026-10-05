import { formatMoney } from '@exzaestate/shared';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface BalanceBeamProps {
  debitPaisa: string | bigint;
  creditPaisa: string | bigint;
  lineCount?: number;
  className?: string;
}

function parsePaisa(val: string | bigint | undefined): bigint {
  if (typeof val === 'bigint') return val;
  if (!val) return 0n;
  try {
    return BigInt(val.toString().replace(/\D/g, '') || '0');
  } catch {
    return 0n;
  }
}

function getBalanceExplanation(
  debit: bigint,
  credit: bigint,
  lineCount?: number,
): { isBalanced: boolean; message: string; diffPaisa: string } {
  if (debit === 0n && credit === 0n) {
    return { isBalanced: false, message: 'No amounts entered yet', diffPaisa: '0' };
  }

  if (debit === credit) {
    if (lineCount !== undefined && lineCount < 2) {
      return {
        isBalanced: false,
        message: 'A double-entry journal requires at least two lines',
        diffPaisa: '0',
      };
    }
    return {
      isBalanced: true,
      message: 'Balanced: Total Debits equal Total Credits',
      diffPaisa: '0',
    };
  }

  if (debit > credit) {
    const diff = debit - credit;
    return {
      isBalanced: false,
      message: `Debit is ${formatMoney(diff.toString())} more than credit`,
      diffPaisa: diff.toString(),
    };
  }

  const diff = credit - debit;
  return {
    isBalanced: false,
    message: `Credit is ${formatMoney(diff.toString())} more than debit`,
    diffPaisa: diff.toString(),
  };
}

export function BalanceBeam({
  debitPaisa,
  creditPaisa,
  lineCount,
  className = '',
}: BalanceBeamProps) {
  const debit = parsePaisa(debitPaisa);
  const credit = parsePaisa(creditPaisa);
  const total = debit + credit;

  const { isBalanced, message } = getBalanceExplanation(debit, credit, lineCount);

  // Compute beam proportions
  const debitPct = total > 0n ? Math.min(Math.max(Number((debit * 100n) / total), 5), 95) : 50;
  const creditPct = 100 - debitPct;

  const barColor = isBalanced ? 'bg-primary' : 'bg-surface-sunken';
  const barBorder = isBalanced ? 'border-primary' : 'border-border-input';

  return (
    <div
      data-testid="balance-beam"
      className={`rounded-card border border-border p-4 bg-surface ${className}`}
    >
      {/* Upper totals header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-h6 text-text-muted uppercase tracking-wider font-semibold">
            Total Debits (Dr)
          </span>
          <span className="text-h3 font-bold text-text tabular-nums" data-testid="beam-total-debit">
            {formatMoney(debit.toString())}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-medium border border-border bg-surface-sunken">
          {isBalanced ? (
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
            </span>
          ) : (
            <span className="text-danger flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Out of Balance
            </span>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-h6 text-text-muted uppercase tracking-wider font-semibold">
            Total Credits (Cr)
          </span>
          <span
            className="text-h3 font-bold text-text tabular-nums"
            data-testid="beam-total-credit"
          >
            {formatMoney(credit.toString())}
          </span>
        </div>
      </div>

      {/* Signature Split Balance Bar */}
      <div className="relative w-full h-3.5 bg-surface-sunken rounded-full overflow-hidden flex border border-border">
        <div
          className={`h-full transition-all duration-200 border-r ${barColor} ${barBorder}`}
          style={{ width: `${debitPct}%` }}
          data-testid="beam-debit-bar"
        />
        <div
          className={`h-full transition-all duration-200 ${barColor}`}
          style={{ width: `${creditPct}%` }}
          data-testid="beam-credit-bar"
        />
      </div>

      {/* Lower Double-Rule Ledger Totals & Descriptive Message */}
      <div className="mt-3 pt-2.5 border-t-2 border-b border-border flex items-center justify-between">
        <span
          className={`text-body font-medium flex items-center gap-2 ${
            isBalanced ? 'text-success' : 'text-danger'
          }`}
          data-testid="beam-message"
        >
          {isBalanced ? (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
          )}
          {message}
        </span>

        <span className="text-caption text-text-muted">
          Rule: Double-entry requires Dr = Cr (RULE-DOUBLE-ENTRY)
        </span>
      </div>
    </div>
  );
}
