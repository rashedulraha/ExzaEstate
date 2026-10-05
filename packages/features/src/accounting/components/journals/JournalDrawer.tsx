import { formatMoney, formatDate } from '@exzaestate/shared';
import { Drawer, Button, PostingSeal } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { CheckCircle2 } from 'lucide-react';
import type { JournalItem, JournalLineItem } from '../../schemas/accounting.schema.js';

export interface JournalDrawerProps {
  journal: JournalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPostDraft?: (journalId: string) => void;
  onOpenReversal?: (journal: JournalItem) => void;
}

function JournalLineRow({ line }: { line: JournalLineItem }) {
  const hasDebit = BigInt(line.debitPaisa || '0') > 0n;
  const hasCredit = BigInt(line.creditPaisa || '0') > 0n;

  return (
    <tr className="hover:bg-surface-sunken/40">
      <td className="px-3 py-2.5">
        <span className="font-mono font-semibold text-text block">{line.accountCode}</span>
        <span className="text-caption text-text-muted block">{line.accountName}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-body text-text block">{line.description || '—'}</span>
        {line.partyName && (
          <span className="text-caption text-text-muted block">Party: {line.partyName}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-text">
        {hasDebit ? formatMoney(line.debitPaisa) : '—'}
      </td>
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-text">
        {hasCredit ? formatMoney(line.creditPaisa) : '—'}
      </td>
    </tr>
  );
}

function JournalLinesTable({ journal }: { journal: JournalItem }) {
  return (
    <div className="border border-border rounded-card overflow-hidden">
      <table className="w-full text-body">
        <thead className="bg-surface-sunken border-b border-border text-th font-semibold text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Account</th>
            <th className="px-3 py-2 text-left">Line Memo / Party</th>
            <th className="px-3 py-2 text-right w-32">Debit (Dr)</th>
            <th className="px-3 py-2 text-right w-32">Credit (Cr)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {journal.lines.map((line, idx) => (
            <JournalLineRow key={line.id || idx} line={line} />
          ))}
        </tbody>
        <tfoot className="bg-surface-sunken/60 font-bold border-t-2 border-b border-border">
          <tr>
            <td colSpan={2} className="px-3 py-2.5 text-text">
              Total Voucher Amount:
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums text-text">
              {formatMoney(journal.totalDebitPaisa)}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums text-text">
              {formatMoney(journal.totalCreditPaisa)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function JournalSealSection({
  journal,
  isReversed,
  canReverse,
  onOpenReversal,
}: {
  journal: JournalItem;
  isReversed: boolean;
  canReverse: boolean;
  onOpenReversal?: (journal: JournalItem) => void;
}) {
  const isPosted = journal.status === 'POSTED';
  if (!isPosted && !isReversed) return null;

  return (
    <PostingSeal
      documentNumber={journal.journalNumber}
      postedBy={journal.postedBy || 'System Accountant'}
      postedAt={journal.postedAt || journal.postingDate}
      isReversed={isReversed}
      canReverse={canReverse}
      onReverse={() => onOpenReversal?.(journal)}
    />
  );
}

function JournalDrawerFooter({
  onClose,
  isDraft,
  canPost,
  onPostDraft,
}: {
  onClose: () => void;
  isDraft: boolean;
  canPost: boolean;
  onPostDraft?: () => void;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
      {isDraft && canPost && onPostDraft && (
        <Button
          variant="primary"
          size="sm"
          onClick={onPostDraft}
          data-testid="drawer-post-draft-btn"
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Post Voucher
        </Button>
      )}
    </div>
  );
}

export function JournalDrawer({
  journal,
  isOpen,
  onClose,
  onPostDraft,
  onOpenReversal,
}: JournalDrawerProps) {
  const { hasPermission: canPost } = usePermission(PERMISSIONS.JOURNAL_POST);
  const { hasPermission: canReverse } = usePermission(PERMISSIONS.JOURNAL_REVERSE);

  if (!journal) return null;

  const isDraft = journal.status === 'DRAFT' || journal.status === 'REVIEW';
  const isReversed = journal.status === 'REVERSED' || Boolean(journal.isReversed);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Journal Voucher: ${journal.journalNumber}`}
      subtitle={`${journal.type} voucher dated ${formatDate(journal.postingDate)}`}
      size="lg"
      footer={
        <JournalDrawerFooter
          onClose={onClose}
          isDraft={isDraft}
          canPost={canPost}
          onPostDraft={onPostDraft ? () => onPostDraft(journal.id) : undefined}
        />
      }
    >
      <div className="space-y-6 text-text" data-testid="journal-drawer-content">
        <JournalSealSection
          journal={journal}
          isReversed={isReversed}
          canReverse={canReverse}
          onOpenReversal={onOpenReversal}
        />

        <div className="p-4 rounded-card border border-border bg-surface-sunken">
          <span className="text-caption text-text-muted uppercase tracking-wider font-semibold block">
            Voucher Narration
          </span>
          <p className="text-body font-medium text-text mt-1">{journal.narration}</p>
          {journal.reference && (
            <span className="text-caption text-text-muted font-mono mt-1 block">
              Reference: {journal.reference}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-h4 font-bold text-text">Journal Line Postings</h4>
          <JournalLinesTable journal={journal} />
        </div>
      </div>
    </Drawer>
  );
}
