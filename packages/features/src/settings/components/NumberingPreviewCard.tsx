import { useState } from 'react';
import { FormField, Input, Select, Button } from '@exzaestate/ui';
import { useNumberingPreview } from '../hooks/useSettings.js';

export function NumberingPreviewCard() {
  const [docType, setDocType] = useState('RECEIPT');
  const [branchCode, setBranchCode] = useState('DHK');
  const [projectCode, setProjectCode] = useState('PRJ01');
  const [customPattern, setCustomPattern] = useState('{PREFIX}-{BRANCH}-{YEAR}-{SEQ:6}');

  const { previewData, isLoading, refetch } = useNumberingPreview({
    documentType: docType,
    pattern: customPattern,
    branchCode,
    projectCode,
    year: '2026',
  });

  return (
    <div className="rounded-card border border-border bg-surface-elevated p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-h3 font-semibold text-text">Numbering Pattern Sandbox</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Test and evaluate numbering formats in real-time before applying them to transactions.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()} isLoading={isLoading}>
          Re-evaluate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Document Type" id="sandbox-doc-type">
          <Select
            id="sandbox-doc-type"
            value={docType}
            onChange={(val) => setDocType(val)}
            options={[
              { value: 'RECEIPT', label: 'Money Receipt (RCPT)' },
              { value: 'BOOKING', label: 'Booking Agreement (BKG)' },
              { value: 'QUOTATION', label: 'Sales Quotation (QTN)' },
              { value: 'JOURNAL', label: 'Journal Voucher (JV)' },
              { value: 'EXPENSE_VOUCHER', label: 'Expense Voucher (EXP)' },
              { value: 'VENDOR_BILL', label: 'Vendor Bill (BILL)' },
            ]}
          />
        </FormField>

        <FormField label="Branch Code" id="sandbox-branch">
          <Input
            id="sandbox-branch"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
            placeholder="DHK"
          />
        </FormField>

        <FormField label="Project Code" id="sandbox-project">
          <Input
            id="sandbox-project"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
            placeholder="PRJ01"
          />
        </FormField>
      </div>

      <FormField
        label="Pattern Expression"
        id="sandbox-pattern"
        helperText="Supported tokens: {BRANCH}, {PROJECT}, {YEAR}, {MONTH}, {SEQ:n}"
      >
        <Input
          id="sandbox-pattern"
          value={customPattern}
          onChange={(e) => setCustomPattern(e.target.value)}
          placeholder="{PREFIX}-{BRANCH}-{YEAR}-{SEQ:6}"
        />
      </FormField>

      <div className="p-4 rounded-card border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-caption font-medium uppercase tracking-wider text-text-muted">
            Evaluated Live Result
          </span>
          <div className="text-h2 font-mono font-bold text-primary mt-1">
            {previewData?.sampleNumber || `${docType}-${branchCode}-2026-000001`}
          </div>
        </div>
        <div className="text-caption text-text-muted font-mono bg-surface-sunken/60 px-3 py-1.5 rounded-button border border-border">
          Target: {docType}
        </div>
      </div>
    </div>
  );
}
