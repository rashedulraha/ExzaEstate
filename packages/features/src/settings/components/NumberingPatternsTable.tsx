import { useState, useMemo } from 'react';
import { Search, X, Hash, SlidersHorizontal, CheckCircle2, CircleDashed } from 'lucide-react';
import { DataTable, type ColumnDef, Button, EmptyState } from '@exzaestate/ui';
import type { NumberingPatternItem, NumberingPatternFormData } from '../schemas/settings.schema.js';
import { NumberingPatternModal } from './NumberingPatternModal.js';
import { NumberingPreviewCard } from './NumberingPreviewCard.js';

export interface NumberingPatternsTableProps {
  patterns: NumberingPatternItem[];
  onUpdatePattern: (documentType: string, data: NumberingPatternFormData) => Promise<unknown>;
  isUpdating: boolean;
}

export function NumberingPatternsTable({
  patterns,
  onUpdatePattern,
  isUpdating,
}: NumberingPatternsTableProps) {
  const [selectedPattern, setSelectedPattern] = useState<NumberingPatternItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatterns = useMemo(() => {
    return patterns.filter((item) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        item.documentType.toLowerCase().includes(term) ||
        (item.prefix && item.prefix.toLowerCase().includes(term)) ||
        item.pattern.toLowerCase().includes(term) ||
        item.resetRule.toLowerCase().includes(term)
      );
    });
  }, [patterns, searchTerm]);

  const columns: ColumnDef<NumberingPatternItem>[] = useMemo(
    () => [
      {
        key: 'documentType',
        header: 'Document Type',
        sortable: true,
        render: (item) => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-body font-semibold text-text">{item.documentType}</span>
              <span className="text-caption text-text-muted">
                Prefix:{' '}
                {item.prefix ? (
                  <span className="font-mono text-primary">{item.prefix}</span>
                ) : (
                  'None'
                )}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'pattern',
        header: 'Pattern Template',
        render: (item) => (
          <span className="font-mono text-small text-primary font-medium bg-primary/5 px-2.5 py-1 rounded border border-primary/15">
            {item.pattern}
          </span>
        ),
      },
      {
        key: 'resetRule',
        header: 'Reset Frequency',
        align: 'center',
        render: (item) => (
          <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
            {item.resetRule}
          </span>
        ),
      },
      {
        key: 'nextSequence',
        header: 'Next Sequence',
        align: 'right',
        render: (item) => {
          const nextSeq =
            item.nextSequence ?? (item as unknown as { nextNumber?: number }).nextNumber ?? 1;
          return (
            <span className="font-mono font-bold text-text tabular-nums text-body-sm">
              #{nextSeq}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        render: (item) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border ${
              item.isActive
                ? 'bg-success/12 text-success border-success/30'
                : 'bg-surface-sunken text-text-muted border-border'
            }`}
          >
            {item.isActive ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <CircleDashed className="w-3.5 h-3.5" />
            )}
            <span>{item.isActive ? 'Active' : 'Draft'}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (item) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPattern(item)}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Configure
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <NumberingPreviewCard />

      <div className="rounded-card border border-border bg-surface shadow-xs">
        <div className="p-3.5 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-h3 font-semibold text-text">Configured Document Series</h3>
              <span className="text-caption text-text-2 font-medium bg-surface-sunken px-2.5 py-0.5 rounded-full border border-border">
                {patterns.length} Active Series
              </span>
            </div>
            <p className="text-body-sm text-text-muted mt-0.5">
              Active numbering rules across vouchers, agreements, receipts, and invoices.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search series..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-small rounded-button bg-surface border border-border-input text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <DataTable<NumberingPatternItem>
          columns={columns}
          data={filteredPatterns}
          keyExtractor={(item) => item.id || item.documentType}
          className="border-none shadow-none"
          emptyState={
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No Document Series Found"
              description="No numbering patterns match your current search criteria."
              dashedBorder
              actionLabel="Clear Search"
              onAction={() => setSearchTerm('')}
            />
          }
        />
      </div>

      <NumberingPatternModal
        isOpen={Boolean(selectedPattern)}
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
        onSave={onUpdatePattern}
        isSaving={isUpdating}
      />
    </div>
  );
}
