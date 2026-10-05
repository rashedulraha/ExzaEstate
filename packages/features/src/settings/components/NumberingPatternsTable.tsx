import { useState } from 'react';
import { Button, StatusBadge } from '@exzaestate/ui';
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

  return (
    <div className="space-y-6">
      <NumberingPreviewCard />

      <div className="rounded-card border border-border bg-surface-elevated overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-h3 font-semibold text-text">Configured Document Series</h3>
            <p className="text-body-sm text-text-muted mt-0.5">
              Active numbering rules across vouchers, agreements, receipts, and invoices.
            </p>
          </div>
          <span className="text-caption text-text-muted font-medium bg-surface-sunken px-2.5 py-1 rounded-full border border-border">
            {patterns.length} Active Series
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Pattern Template</th>
                <th className="py-3 px-4">Reset Frequency</th>
                <th className="py-3 px-4 text-right">Next Sequence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-body-sm">
              {patterns.map((item) => (
                <tr
                  key={item.id || item.documentType}
                  className="hover:bg-surface-sunken/20 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-text">{item.documentType}</td>
                  <td className="py-3.5 px-4 font-mono text-text-muted">{item.prefix || '—'}</td>
                  <td className="py-3.5 px-4 font-mono text-primary">{item.pattern}</td>
                  <td className="py-3.5 px-4 text-text-muted">{item.resetRule}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-text text-right">
                    #{item.nextSequence}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge value={item.isActive ? 'ACTIVE' : 'DRAFT'} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedPattern(item)}>
                      Configure
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
