import { PieChart, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import type { BudgetItem } from '../../schemas/operations.schema.js';

export interface BudgetDataTableProps {
  budgets: BudgetItem[];
  isLoading?: boolean;
}

function calculateSpendPct(b: BudgetItem): number {
  if (typeof b.spendPercentage === 'number') {
    return Math.min(200, b.spendPercentage);
  }
  const budgetPaisa = BigInt(b.budgetAmountPaisa);
  const spendPaisa = BigInt(b.actualSpendPaisa);
  if (budgetPaisa <= 0n) return 0;
  return Math.min(200, Number((spendPaisa * 10000n) / budgetPaisa) / 100);
}

function renderAlertChip(spendPct: number, alertLevel: BudgetItem['alertLevel']) {
  if (spendPct >= 100 || alertLevel === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-caption font-semibold text-danger">
        <AlertCircle className="h-3 w-3" />
        CRITICAL ({spendPct.toFixed(0)}%)
      </span>
    );
  }
  if (spendPct >= 85 || alertLevel === 'WARNING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-caption font-semibold text-warning">
        <AlertTriangle className="h-3 w-3" />
        WARNING ({spendPct.toFixed(0)}%)
      </span>
    );
  }
  if (spendPct >= 70 || alertLevel === 'INFO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-caption font-semibold text-info">
        <Info className="h-3 w-3" />
        INFO ({spendPct.toFixed(0)}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-caption font-semibold text-success">
      <CheckCircle2 className="h-3 w-3" />
      NORMAL ({spendPct.toFixed(0)}%)
    </span>
  );
}

function getProgressBarColor(spendPct: number): string {
  if (spendPct >= 100) return 'bg-danger';
  if (spendPct >= 85) return 'bg-warning';
  if (spendPct >= 70) return 'bg-info';
  return 'bg-success';
}

function BudgetTableRow({ item }: { item: BudgetItem }) {
  const budgetPaisa = BigInt(item.budgetAmountPaisa);
  const spendPaisa = BigInt(item.actualSpendPaisa);
  const spendPct = calculateSpendPct(item);
  const remainingPaisa = budgetPaisa > spendPaisa ? budgetPaisa - spendPaisa : 0n;

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3 text-body font-semibold text-text">
        {item.projectName || 'General Operations'}
      </td>
      <td className="px-4 py-3 text-body text-text-2">{item.categoryName || 'All Categories'}</td>
      <td className="px-4 py-3 font-mono text-caption text-text-muted">{item.fiscalYear}</td>
      <td className="px-4 py-3 text-right text-body font-medium text-text tabular-nums">
        {formatMoney(budgetPaisa)}
      </td>
      <td className="px-4 py-3 text-right text-body font-medium text-text tabular-nums">
        {formatMoney(spendPaisa)}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={`h-full transition-all duration-300 ${getProgressBarColor(spendPct)}`}
              style={{ width: `${Math.min(100, spendPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-caption text-text-muted tabular-nums">
            <span>{spendPct.toFixed(1)}% spent</span>
            <span>Rem: {formatMoney(remainingPaisa)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">{renderAlertChip(spendPct, item.alertLevel)}</td>
    </tr>
  );
}

export function BudgetDataTable({ budgets, isLoading }: BudgetDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading budgets...</p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/30 p-6 text-center">
        <PieChart className="mb-2 h-8 w-8 text-text-muted" />
        <p className="text-body font-medium text-text">No project budgets defined</p>
        <p className="mt-1 text-caption text-text-muted">
          Set up project cost center budgets to track variance and overrun alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto card-workspace">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">Project / Cost Center</th>
            <th className="px-4 py-3 text-th">Category</th>
            <th className="px-4 py-3 text-th">Fiscal Year</th>
            <th className="px-4 py-3 text-right text-th">Budget</th>
            <th className="px-4 py-3 text-right text-th">Actual Spend</th>
            <th className="px-4 py-3 text-th" style={{ minWidth: '180px' }}>
              Utilization
            </th>
            <th className="px-4 py-3 text-center text-th">Alert Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {budgets.map((b) => (
            <BudgetTableRow key={b.id} item={b} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
