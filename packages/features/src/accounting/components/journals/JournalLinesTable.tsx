import { Button } from '@exzaestate/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { AccountTreeItem, JournalLineInput } from '../../schemas/accounting.schema.js';

export interface JournalLinesTableProps {
  lines: JournalLineInput[];
  postingAccounts: AccountTreeItem[];
  onUpdateLine: (index: number, patch: Partial<JournalLineInput>) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  disabled?: boolean;
}

export function JournalLinesTable({
  lines,
  postingAccounts,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  disabled = false,
}: JournalLinesTableProps) {
  return (
    <div className="border border-border rounded-card overflow-hidden">
      <table className="w-full text-body">
        <thead className="bg-surface-sunken border-b border-border text-th font-semibold text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Target Account</th>
            <th className="px-3 py-2 text-right w-36">Debit (BDT)</th>
            <th className="px-3 py-2 text-right w-36">Credit (BDT)</th>
            <th className="px-3 py-2 text-left">Narration / Memo</th>
            <th className="px-2 py-2 text-center w-12" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line, idx) => (
            <tr key={idx} className="hover:bg-surface-sunken/40">
              <td className="p-2">
                <select
                  data-testid={`line-account-${idx}`}
                  value={line.accountId}
                  onChange={(e) => onUpdateLine(idx, { accountId: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1.5 rounded-button border border-border-input bg-surface text-text text-body"
                >
                  <option value="">Select Account...</option>
                  {postingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-2">
                <input
                  data-testid={`line-debit-${idx}`}
                  type="number"
                  placeholder="0"
                  value={line.debitPaisa === '0' ? '' : line.debitPaisa}
                  onChange={(e) =>
                    onUpdateLine(idx, {
                      debitPaisa: e.target.value || '0',
                      creditPaisa: '0',
                    })
                  }
                  disabled={disabled}
                  className="w-full px-2 py-1.5 rounded-button border border-border-input bg-surface text-text text-right tabular-nums text-body"
                />
              </td>
              <td className="p-2">
                <input
                  data-testid={`line-credit-${idx}`}
                  type="number"
                  placeholder="0"
                  value={line.creditPaisa === '0' ? '' : line.creditPaisa}
                  onChange={(e) =>
                    onUpdateLine(idx, {
                      creditPaisa: e.target.value || '0',
                      debitPaisa: '0',
                    })
                  }
                  disabled={disabled}
                  className="w-full px-2 py-1.5 rounded-button border border-border-input bg-surface text-text text-right tabular-nums text-body"
                />
              </td>
              <td className="p-2">
                <input
                  placeholder="Optional line memo"
                  value={line.description || ''}
                  onChange={(e) => onUpdateLine(idx, { description: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1.5 rounded-button border border-border-input bg-surface text-text text-body"
                />
              </td>
              <td className="p-2 text-center">
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveLine(idx)}
                    disabled={disabled}
                    className="p-1 text-text-muted hover:text-danger rounded-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-2.5 bg-surface-sunken/50 border-t border-border flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddLine}
          disabled={disabled}
          data-testid="add-journal-line-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Another Line
        </Button>
      </div>
    </div>
  );
}
