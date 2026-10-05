import { useState, useMemo } from 'react';
import { Dialog, FormField, Input, Select, Button, BalanceBeam } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  JOURNAL_TYPES,
  type AccountTreeItem,
  type JournalEntryInput,
  type JournalLineInput,
  type JournalTypeEnum,
} from '../../schemas/accounting.schema.js';
import { JournalLinesTable } from './JournalLinesTable.js';

export interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountTreeItem[];
  onSubmitDraft: (data: JournalEntryInput) => Promise<unknown>;
  onSubmitPost?: (data: JournalEntryInput) => Promise<unknown>;
  isSubmitting?: boolean;
}

const DEFAULT_LINE: JournalLineInput = {
  accountId: '',
  debitPaisa: '0',
  creditPaisa: '0',
  description: '',
};

export function JournalEntryModal({
  isOpen,
  onClose,
  accounts,
  onSubmitDraft,
  onSubmitPost,
  isSubmitting = false,
}: JournalEntryModalProps) {
  const { hasPermission: canPost } = usePermission(PERMISSIONS.JOURNAL_POST);

  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<JournalTypeEnum>('STANDARD');
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLineInput[]>([
    { ...DEFAULT_LINE },
    { ...DEFAULT_LINE },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter terminal posting accounts (not groups, handling both flat and tree lists)
  const postingAccounts = useMemo(() => {
    const results: AccountTreeItem[] = [];
    const collect = (list: AccountTreeItem[]) => {
      for (const item of list) {
        if (!item.isGroup) {
          results.push(item);
        }
        if (item.children && item.children.length > 0) {
          collect(item.children);
        }
      }
    };
    collect(accounts);
    return results;
  }, [accounts]);

  // Compute live debit and credit totals
  const { totalDebit, totalCredit } = useMemo(() => {
    let deb = 0n;
    let cred = 0n;
    for (const line of lines) {
      deb += BigInt(line.debitPaisa || '0');
      cred += BigInt(line.creditPaisa || '0');
    }
    return { totalDebit: deb, totalCredit: cred };
  }, [lines]);

  const isBalanced = totalDebit > 0n && totalDebit === totalCredit && lines.length >= 2;

  const handleUpdateLine = (index: number, patch: Partial<JournalLineInput>) => {
    setLines((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        next[index] = { ...target, ...patch };
      }
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, { ...DEFAULT_LINE }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!narration.trim() || narration.trim().length < 3) {
      errs.narration = 'Narration must be at least 3 characters';
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l?.accountId) {
        errs[`line_${i}_account`] = 'Account required';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitWithAction = async (action: 'DRAFT' | 'POST') => {
    if (!validate()) return;
    const payload: JournalEntryInput = {
      postingDate,
      type,
      narration: narration.trim(),
      reference: reference.trim() || undefined,
      lines,
      actionType: action,
    };

    if (action === 'POST' && onSubmitPost) {
      await onSubmitPost(payload);
    } else {
      await onSubmitDraft(payload);
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Manual Journal Voucher"
      description="Record double-entry general ledger voucher lines"
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="text-caption text-text-muted">
            {!canPost && <span>Draft mode: Only Finance / Accountants may post journals.</span>}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => submitWithAction('DRAFT')}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              data-testid="save-journal-draft-btn"
            >
              Save as Draft
            </Button>
            {canPost && onSubmitPost && (
              <Button
                variant="primary"
                onClick={() => submitWithAction('POST')}
                isLoading={isSubmitting}
                disabled={!isBalanced || isSubmitting}
                data-testid="post-journal-btn"
              >
                Post Journal
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-text" data-testid="journal-entry-modal">
        {/* Header Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FormField id="postingDate" label="Posting Date" required>
            <Input
              id="postingDate"
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="voucherType" label="Voucher Type" required>
            <Select
              id="voucherType"
              value={type}
              options={JOURNAL_TYPES.map((t) => ({ value: t, label: t }))}
              onChange={(val) => setType(val as JournalTypeEnum)}
              disabled={isSubmitting}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField id="voucherRef" label="External Document Ref">
              <Input
                id="voucherRef"
                placeholder="e.g. Bank advice, bill #, invoice ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>
          </div>
        </div>

        <FormField id="narration" label="Voucher Narration" required error={errors.narration}>
          <Input
            id="narration"
            placeholder="Describe the economic transaction or accounting adjustment"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        {/* Multi-Line Table */}
        <JournalLinesTable
          lines={lines}
          postingAccounts={postingAccounts}
          onUpdateLine={handleUpdateLine}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          disabled={isSubmitting}
        />

        {/* Signature Balance Beam */}
        <BalanceBeam
          debitPaisa={totalDebit.toString()}
          creditPaisa={totalCredit.toString()}
          lineCount={lines.length}
        />
      </div>
    </Dialog>
  );
}
