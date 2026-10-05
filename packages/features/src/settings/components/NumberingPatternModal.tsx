import { useState, useEffect } from 'react';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { NumberingPatternItem, NumberingPatternFormData } from '../schemas/settings.schema.js';

export interface NumberingPatternModalProps {
  isOpen: boolean;
  pattern: NumberingPatternItem | null;
  onClose: () => void;
  onSave: (documentType: string, data: NumberingPatternFormData) => Promise<unknown>;
  isSaving: boolean;
}

export function NumberingPatternModal({
  isOpen,
  pattern,
  onClose,
  onSave,
  isSaving,
}: NumberingPatternModalProps) {
  const [prefix, setPrefix] = useState('');
  const [patternStr, setPatternStr] = useState('');
  const [resetRule, setResetRule] = useState<'NEVER' | 'YEARLY' | 'FISCAL_YEARLY'>('YEARLY');
  const [isActive, setIsActive] = useState(true);
  const [confirmSeriesChange, setConfirmSeriesChange] = useState(false);

  useEffect(() => {
    if (pattern) {
      setPrefix(pattern.prefix || '');
      setPatternStr(pattern.pattern || '');
      setResetRule(pattern.resetRule || 'YEARLY');
      setIsActive(pattern.isActive ?? true);
      setConfirmSeriesChange(false);
    }
  }, [pattern]);

  if (!pattern) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(pattern.documentType, {
      prefix: prefix.trim() || undefined,
      pattern: patternStr.trim(),
      resetRule,
      isActive,
      confirmSeriesChange,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure ${pattern.documentType} Pattern`}
      description="Update sequence token template and numbering reset frequency."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prefix" id="pattern-prefix" helperText="Optional document code prefix">
            <Input
              id="pattern-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="RCPT"
            />
          </FormField>

          <FormField label="Reset Frequency" id="pattern-reset">
            <Select
              id="pattern-reset"
              value={resetRule}
              onChange={(val) => setResetRule(val as 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY')}
              options={[
                { value: 'YEARLY', label: 'Calendar Year (Jan 1)' },
                { value: 'FISCAL_YEARLY', label: 'Fiscal Year (July 1)' },
                { value: 'NEVER', label: 'Continuous (Never)' },
              ]}
            />
          </FormField>
        </div>

        <FormField
          label="Pattern Template"
          id="pattern-expression"
          helperText="Tokens: {PREFIX}, {BRANCH}, {PROJECT}, {YEAR}, {MONTH}, {SEQ:n}"
        >
          <Input
            id="pattern-expression"
            value={patternStr}
            onChange={(e) => setPatternStr(e.target.value)}
            placeholder="{PREFIX}-{BRANCH}-{YEAR}-{SEQ:6}"
            required
          />
        </FormField>

        <div className="rounded-card border border-border bg-surface-sunken/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-text-muted">Next Sequential Value:</span>
            <span className="font-mono font-bold text-text">#{pattern.nextSequence}</span>
          </div>
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-text-muted">Pattern Active:</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSeriesChange}
              onChange={(e) => setConfirmSeriesChange(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-caption text-text-muted">
              Confirm series pattern modification for future generated transactions
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            Save Pattern
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
