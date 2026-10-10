import { useState } from 'react';
import { Button, FormField, Select } from '@exzaestate/ui';

export interface CsvImportSectionProps {
  onValidateCsv: (entity: string, content: string) => Promise<unknown>;
  onImportCsv: (entity: string, content: string) => Promise<unknown>;
  isProcessing: boolean;
}

export function CsvImportSection({
  onValidateCsv,
  onImportCsv,
  isProcessing,
}: CsvImportSectionProps) {
  const [entity, setEntity] = useState('BOOKINGS');
  const [csvContent, setCsvContent] = useState('');
  const [validationReport, setValidationReport] = useState<{
    validCount?: number;
    errorCount?: number;
    errors?: Array<{ row: number; message: string }>;
  } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!csvContent.trim()) return;
    setImportResult(null);
    const res = (await onValidateCsv(entity, csvContent)) as {
      validCount?: number;
      errorCount?: number;
      errors?: Array<{ row: number; message: string }>;
    };
    setValidationReport(res);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    await onImportCsv(entity, csvContent);
    setImportResult(`Successfully imported ${entity} records into migration batch.`);
    setCsvContent('');
    setValidationReport(null);
  };

  return (
    <div className="rounded-card border border-border bg-surface p-6 space-y-5">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 3: Bulk CSV Data Import</h3>
        <p className="text-body-sm text-text-muted mt-0.5">
          Validate and import large historical datasets (customers, properties, bookings) using
          strict all-or-nothing validation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Migration Entity Target" id="csv-entity-target">
          <Select
            id="csv-entity-target"
            value={entity}
            onChange={(val) => setEntity(val)}
            options={[
              { value: 'BOOKINGS', label: 'Legacy Bookings & Schedules' },
              { value: 'CUSTOMERS', label: 'Customer Records & KYC' },
              { value: 'PROPERTIES', label: 'Inventory Units & Plots' },
              { value: 'OPENING_BALANCES', label: 'Chart of Accounts Balances' },
            ]}
          />
        </FormField>

        <div className="flex items-end pb-1">
          <a
            href={`/api/v1/migration/csv/template/${entity.toLowerCase()}`}
            download={`${entity.toLowerCase()}-template.csv`}
            className="text-body-sm font-medium text-primary hover:underline inline-flex items-center space-x-1"
          >
            <span>Download Official {entity} CSV Template</span>
          </a>
        </div>
      </div>

      <FormField
        label="CSV Content"
        id="csv-content-input"
        helperText="Paste comma-separated spreadsheet data including header row"
      >
        <textarea
          id="csv-content-input"
          rows={5}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder="customerId,legacyBookingNo,bookingDate,netPricePaisa,totalPaidPaisa..."
          className="w-full rounded-input border border-border bg-surface-sunken p-3 font-mono text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormField>

      {validationReport && (
        <div className="rounded-card border border-border bg-surface-sunken/40 p-4 space-y-2 text-body-sm">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-text">Validation Summary:</span>
            <span className="text-success font-medium font-mono">
              {validationReport.validCount ?? 0} valid rows
            </span>
            <span className="text-danger font-medium font-mono">
              {validationReport.errorCount ?? 0} errors
            </span>
          </div>

          {validationReport.errors && validationReport.errors.length > 0 && (
            <div className="max-h-28 overflow-y-auto text-caption text-danger space-y-1">
              {validationReport.errors.map((err, i) => (
                <div key={i}>
                  Row {err.row}: {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {importResult && <p className="text-body-sm text-success font-medium">{importResult}</p>}

      <div className="flex items-center justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={handleValidate}
          disabled={!csvContent.trim()}
          isLoading={isProcessing}
        >
          Validate CSV
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={!csvContent.trim() || (validationReport?.errorCount ?? 0) > 0}
          isLoading={isProcessing}
        >
          Execute All-or-Nothing Import
        </Button>
      </div>
    </div>
  );
}
