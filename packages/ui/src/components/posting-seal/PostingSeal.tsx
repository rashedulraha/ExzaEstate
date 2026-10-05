import { formatDate } from '@exzaestate/shared';
import { Lock, Undo2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../button/Button.js';

export interface PostingSealProps {
  documentNumber: string;
  postedBy: string;
  postedAt: string;
  isReversed?: boolean;
  reversalDocumentNumber?: string;
  reversalDate?: string;
  onReverse?: () => void;
  canReverse?: boolean;
  className?: string;
}

function SealIcon({ isReversed }: { isReversed: boolean }) {
  if (isReversed) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-void/10 border-void/30 text-void">
        <Undo2 className="w-5 h-5" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
      <Lock className="w-5 h-5" />
    </div>
  );
}

function SealBadge({ isReversed }: { isReversed: boolean }) {
  const cls = isReversed
    ? 'bg-void/12 text-void border-void/25'
    : 'bg-success/12 text-success border-success/25';
  const label = isReversed ? 'REVERSED / VOID' : 'POSTED & SEALED';

  return (
    <span
      data-testid="seal-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}

function ReversalOffsetNotice({
  reversalDocNum,
  reversalDate,
}: {
  reversalDocNum: string;
  reversalDate?: string;
}) {
  const dateStr = reversalDate ? ` on ${formatDate(reversalDate)}` : '';
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface border border-void/30 text-caption font-medium text-void">
      <AlertCircle className="w-4 h-4 shrink-0 text-void" />
      <span>
        Offset by reversal <span className="font-mono font-semibold">{reversalDocNum}</span>
        {dateStr}
      </span>
    </div>
  );
}

export function PostingSeal({
  documentNumber,
  postedBy,
  postedAt,
  isReversed = false,
  reversalDocumentNumber,
  reversalDate,
  onReverse,
  canReverse = false,
  className = '',
}: PostingSealProps) {
  const canTriggerReverse = !isReversed && Boolean(onReverse) && canReverse;
  const containerCls = isReversed
    ? 'bg-surface-sunken/60 border-void/30'
    : 'bg-surface border-border shadow-sm';

  return (
    <div
      data-testid="posting-seal"
      className={`rounded-card border p-4 transition-colors ${containerCls} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SealIcon isReversed={isReversed} />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-h4 text-text">{documentNumber}</span>
              <SealBadge isReversed={isReversed} />
            </div>

            <span className="text-caption text-text-muted mt-0.5">
              Posted by <span className="font-medium text-text">{postedBy}</span> on{' '}
              <span className="tabular-nums font-medium text-text">{formatDate(postedAt)}</span>{' '}
              (Asia/Dhaka)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:self-center">
          {canTriggerReverse && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onReverse}
              data-testid="reverse-entry-btn"
            >
              <Undo2 className="w-4 h-4 mr-1.5" />
              Reverse Entry
            </Button>
          )}

          {isReversed && reversalDocumentNumber && (
            <ReversalOffsetNotice
              reversalDocNum={reversalDocumentNumber}
              reversalDate={reversalDate}
            />
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-caption text-text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Financial records are append-only. Corrections require an offsetting reversal
            (RULE-IMMUTABLE).
          </span>
        </span>
        <span className="hidden md:inline font-mono">EXZA-SEAL-VERIFIED</span>
      </div>
    </div>
  );
}
